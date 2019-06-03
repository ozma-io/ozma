<i18n>
    {
        "en": {
            "no_value": "(No value)",
            "yes": "Yes",
            "no": "No",
            "invalid_uv": "Nested user view rows should be JSON objects with 'name' and 'args' defined",
            "no_uv": "(empty)",
            "follow_reference": "Follow reference"
        },
        "ru": {
            "no_value": "(Пусто)",
            "yes": "Да",
            "no": "Нет",
            "invalid_uv": "Столбцы со вложенными представлениями должны быть JSON-объектами с заданными полями 'name' и 'args'",
            "no_uv": "(пусто)",
            "follow_reference": "Перейти к сущности"
        }
    }
</i18n>

<template>
    <div class="form_control_panel">
        <div class="nested_menu" v-if="actions.length > 0">
            <ActionsMenu title="☰"
                         :actions="actions" />
        </div>

        <template v-if="inputType.name === 'error'">
            {{ inputType.text }}
        </template>
        <b-form-checkbox v-else-if="inputType.name === 'check'"
                         :value="value"
                         :class="(isInvalid || isAwaited) ? 'error-style editors' : 'none editors'"
                         @input="updateValue($event)"
                         :disabled="isDisabled"
                         ref="control" />
        <b-form-textarea v-else-if="inputType.name === 'textarea'"
                         :style="inputType.style"
                         :value="valueText"
                         :class="(isInvalid || isAwaited) ? 'error-style editors' : 'none editors'"
                         @input="updateValue($event)"
                         :disabled="isDisabled"
                         :rows="3"
                         :max-rows="6"
                         :required="!isNullable"
                         ref="control" />
        <!-- Do NOT add any `class` to CodeEditor; it breaks stuff! -->
        <CodeEditor v-else-if="inputType.name === 'codeeditor'"
                    :content="valueText"
                    @update:content="updateValue($event)"
                    :readOnly="isDisabled"
                    ref="control" />
        <UserView v-else-if="inputType.name === 'userview'"
                    :uv="nestedUv"
                    :defaultValues="inputType.defaultValues"
                    @update:actions="extraActions = $event"
                    ref="control" />
        <b-form-select v-else-if="inputType.name === 'select'"
                       :value="valueText"
                       :class="(isInvalid || isAwaited) ? 'error-style editors' : 'none editors'"
                       @input="updateValue($event)"
                       :disabled="isDisabled"
                       :options="inputType.options"
                       ref="control" />
        <!-- We don't use bootstrap-vue's b-form-input type=text because of problems with Safari
                https://github.com/bootstrap-vue/bootstrap-vue/issues/1951
        -->
        <b-form-textarea v-else-if="inputType.type === 'text'"
                @keydown.enter.prevent=""
                wrap="soft"
                :value="valueText"
                :style="inputType.style"
                :class="(isInvalid || isAwaited) ? 'error-style editors' : 'none editors'"
                @input="updateValue($event)"
                :disabled="isDisabled"
                :rows="3"
                :max-rows="6"
                :required="!isNullable"
                ref="control" />
        <b-form-textarea v-else
                :value="valueText"
                :style="inputType.style"
                :class="(isInvalid || isAwaited) ? 'error-style editors' : 'none editors'"
                @input="updateValue($event)"
                :disabled="isDisabled"
                :rows="3"
                :max-rows="6"
                :required="!isNullable"
                ref="control" />
    </div>
</template>

<script lang="ts">
    import { Component, Vue, Prop, Watch } from "vue-property-decorator"
    import { namespace } from "vuex-class"

    import seq from "@/sequences"
    import { AttributesMap, SchemaName, EntityName, FieldName, ValueType, FieldType, IResultColumnInfo, IColumnField, IUserViewRef } from "@/api"
    import { IAction } from "@/components/ActionsMenu.vue"
    import { IUpdatableField, IUserViewArguments, UserViewResult, EntriesMap, CurrentUserViews, printValue, homeSchema } from "@/state/user_view"
    import { attrToQueryRef, queryLocation } from "@/state/query"

    interface ITextType {
        name: "text"
        type: "text" | "number"
        style: Record<string, any>
    }

    interface ITextAreaType {
        name: "textarea"
        style: Record<string, any>
    }

    interface ICodeEditorType {
        name: "codeeditor"
    }

    interface ISelectOption {
        text: string
        value: string
    }

    interface ISelectType {
        name: "select"
        options: ISelectOption[]
    }

    interface ICheckType {
        name: "check"
    }

    interface IUserViewType {
        name: "userview"
        args: IUserViewArguments
        defaultValues: Record<string, any>
    }

    interface IErrorType {
        name: "error"
        text: string
    }

    type IType = ITextType | ITextAreaType | ICodeEditorType | ISelectType | ICheckType | IUserViewType | IErrorType

    const userView = namespace("userView")
    const staging = namespace("staging")

    // TODO: this could be rewritten as a functional component with a UserViewControl sub-component for handling UV state.
    @Component({
        components: {
            CodeEditor: () => import("@/components/CodeEditor.vue"),
        },
    })
    export default class FormControl extends Vue {
        @Prop({ type: Object }) type!: ValueType
        // Can be undefined which means failed validation.
        @Prop() value!: any
        @Prop({ type: String }) valueText!: string
        @Prop({ type: Object, default: {} }) attributes!: AttributesMap
        @Prop({ type: Boolean, default: false }) locked!: boolean
        @Prop({ type: Boolean }) added!: boolean
        @Prop({ type: Object, default: null }) update!: IUpdatableField | null
        @Prop({ type: Boolean, default: false }) autofocus!: boolean
        @Prop({ type: Boolean, default: false }) isInvalid!: boolean
        @Prop({ type: UserViewResult }) uv!: UserViewResult

        @staging.Action("updateField") updateField!: (args: { schema: SchemaName, entity: EntityName, id: number, field: FieldName, value: any }) => Promise<void>
        @staging.Action("setAddedField") setAddedField!: (args: { schema: SchemaName, entity: EntityName, newId: number, field: FieldName, value: any }) => Promise<void>
        @userView.State("entries") entriesMap!: EntriesMap
        @userView.Action("getEntries") getEntries!: (_: { schemaName: SchemaName, entityName: EntityName }) => Promise<void>
        @userView.State("current") userViews!: CurrentUserViews
        @userView.Action("getNestedView") getNestedView!: (_: IUserViewArguments) => Promise<void>

        private extraActions: IAction[] = []
        private oldArgs: string = ""

        private mounted() {
            if (this.autofocus) {
                const type = this.inputType
                const control: any = this.$refs["control"]
                if (type.name === "text") {
                    control.focus()
                } else if (type.name === "textarea") {
                    control.focus()
                } else if (type.name === "codeeditor") {
                    control.editor.focus()
                } else if (type.name === "check") {
                    control.focus()
                }
            }
        }

        get isNullable() {
            return this.update === null || this.update.field === null ? true : this.update.field.isNullable
        }

        get isAwaited() {
            return !this.isNullable && this.valueText === ""
        }

        get isDisabled() {
            return this.locked || this.update === null || this.update.field === null
        }

        get nestedUv() {
            if (this.inputType.name !== "userview") {
                return null
            } else {
                return this.userViews.getUserView(this.inputType.args)
            }
        }

        get actions() {
            const actions: IAction[] = []
            const link = attrToQueryRef(this.update, this.value, homeSchema(this.uv.args), this.attributes["LinkedView"])
            if (link !== null) {
                actions.push({ name: this.$tc("follow_reference"), location: queryLocation(link) })
            }
            actions.push(...this.extraActions)
            return actions
        }

        private controlStyle(defHeight: string) {
            const style: Record<string, any> = {}
            const heightAttr = this.attributes["ControlHeight"]
            style["height"] = isNaN(Number(heightAttr)) ? defHeight : `${Number(heightAttr)}px`
            return style
        }

        get inputType(): IType {
            const controlAttr = this.attributes["Control"]
            if (controlAttr === "UserView") {
                if (this.value === undefined) {
                    return { name: "error", text: this.$tc("no_uv") }
                }
                if (typeof this.value !== "object" || this.value === null) {
                    return { name: "error", text: this.$tc("invalid_uv") }
                }

                let ref: IUserViewRef
                if (typeof this.value.ref === "object" && this.value.ref !== null) {
                    ref = this.value.ref
                } else {
                    ref = this.value
                }
                if (typeof ref.schema !== "string" || typeof ref.name !== "string") {
                    return { name: "error", text: this.$tc("no_uv") }
                }

                let args: Record<string, any>
                if (typeof this.value.args === "object" && this.value.args !== null) {
                    args = this.value.args
                } else {
                    if (this.update === null) {
                        return { name: "error", text: this.$tc("invalid_uv") }
                    } else {
                        args = { id: this.update.id }
                    }
                }

                let defaultValues: Record<string, any> = {}
                if (typeof this.value.defaultValues === "object" && this.value.defaultValues !== null) {
                    defaultValues = this.value.defaultValues
                }
                const viewArgs: IUserViewArguments = {
                    source: {
                        type: "named",
                        ref: {
                            schema: ref.schema,
                            name: ref.name,
                        },
                    },
                    args,
                }

                this.getNestedView(viewArgs)
                return { name: "userview", args: viewArgs, defaultValues }
            }
            const heightSinglelineText = "38px"
            const heightMultilineText = "76px"
            if (this.update !== null && this.update.field !== null) {
                const fieldType = this.update.field.fieldType
                switch (fieldType.type) {
                    case "reference":
                        const { schema, name: entity } = fieldType.entity
                        this.getEntries({ schemaName: schema, entityName: entity })
                        const currentSchema = this.entriesMap[schema]
                        if (currentSchema === undefined) {
                            return { name: "text", type: "number", style: this.controlStyle(heightSinglelineText) }
                        }
                        const entries = currentSchema[entity]
                        if (entries === undefined || entries instanceof Promise) {
                            return { name: "text", type: "number", style: this.controlStyle(heightSinglelineText) }
                        } else {
                            return {
                                name: "select",
                                options: Object.entries(entries).map(([name, id]) => ({ text: name, value: String(id) })),
                            }
                        }
                    case "enum":
                        return {
                            name: "select",
                            options: [...(this.isNullable ? [{ text: this.$tc("no_value"), value: "" }] : []), ...fieldType.values.map(x => ({ text: x, value: x }))],
                        }
                    case "bool":
                        return {
                            name: "select",
                            options: [...(this.isNullable ? [{ text: this.$tc("no_value"), value: "" }] : []), { text: this.$tc("yes"), value: "true" }, { text: this.$tc("no"), value: "false" }],
                        }
                    case "int":
                        return { name: "text", type: "number", style: this.controlStyle(heightSinglelineText) }
                }
            } else {
                switch (this.type.type) {
                    case "bool":
                        return {
                            name: "select",
                            options: [...(this.isNullable ? [{ text: this.$tc("no_value"), value: "" }] : []), { text: this.$tc("yes"), value: "true" }, { text: this.$tc("no"), value: "false" }],
                        }
                    case "int":
                        return { name: "text", type: "number", style: this.controlStyle(heightSinglelineText) }
                }
            }

            // Plain text
            switch (this.attributes["TextType"]) {
                case "multiline":
                    return { name: "textarea", style: this.controlStyle(heightMultilineText)}
                case "codeeditor":
                    return { name: "codeeditor" }
                default:
                    return { name: "text", type: "text", style: this.controlStyle(heightSinglelineText) }
            }
        }

        private updateValue(text: string) {
            if (this.update === null || this.update.field === null) {
                console.assert(false, "No update entity defined in view")
                return
            }

            if (this.valueText !== text) {
                const entity = this.update.fieldRef.entity

                if (this.inputType.name === "text") {
                    text = text.replace(/(\r\n|\n|\r)/gm, "")
                }

                this.$emit("update", text)

                if (this.added) {
                    this.setAddedField({
                       schema: entity.schema,
                        entity: entity.name,
                        newId: this.update.id,
                        field: this.update.fieldRef.name,
                        value: text,
                    })
                } else {
                    this.updateField({
                        schema: entity.schema,
                        entity: entity.name,
                        id: this.update.id,
                        field: this.update.fieldRef.name,
                        value: text,
                    })
                }
            }
        }
    }
</script>

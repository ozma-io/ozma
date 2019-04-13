<i18n>
    {
        "en": {
            "no_value": "(No value)",
            "yes": "Yes",
            "no": "No",
            "invalid_uv": "Nested user view rows should be arrays with user view name and arguments"
        },
        "ru": {
            "no_value": "(Пусто)",
            "yes": "Да",
            "no": "Нет",
            "invalid_uv": "Столбцы со вложенными представлениями должны быть массивами с названием и аргументами к представлению"
        }
    }
</i18n>

<template>
    <span>
        <div class="nested_menu" v-if="inputType.name === 'userview'">
            <ActionsMenu title="☰"
                         :actions="actions" />
            <div class="black_block" onklick>
                <div></div>
            </div>
        </div>

        <b-form-checkbox v-if="inputType.name === 'check'"
                         :value="value"
                         @input="updateValue($event)"
                         :disabled="isDisabled"
                         ref="control" />
        <b-form-textarea v-else-if="inputType.name === 'textarea'"
                         :value="valueText"
                         @input="updateValue($event)"
                         :disabled="isDisabled"
                         :rows="3"
                         :max-rows="6"
                         :required="!isNullable"
                         ref="control" />
        <CodeEditor v-else-if="inputType.name === 'codeeditor'"
                    :content="valueText"
                    @update:content="updateValue($event)"
                    :readOnly="isDisabled"
                    ref="control" />
        <UserView v-else-if="inputType.name === 'userview'"
                    :uv="uv"
                    @update:actions="actions = $event"
                    ref="control" />
        <b-form-select v-else-if="inputType.name === 'select'"
                       :value="valueText"
                       @input="updateValue($event)"
                       :disabled="isDisabled"
                       :options="inputType.options"
                       ref="control" />
        <!-- We don't use bootstrap-vue's b-form-input type=text because of problems with Safari
                https://github.com/bootstrap-vue/bootstrap-vue/issues/1951
        -->
        <input v-else-if="inputType.type === 'text'"
               :value="valueText"
               :class="(tableShow) ? 'none' : 'form-control'"
               @input="updateValue($event.target.value)"
               type="text"
               :disabled="isDisabled"
               :required="!isNullable"
               ref="control" />
        <b-form-input v-else
                      :class="(tableShow) ? 'none' : 'form-control'"
                      :value="valueText"
                      @input="updateValue($event)"
                      :type="inputType.type"
                      :disabled="isDisabled"
                      :required="!isNullable"
                      ref="control" />
    </span>
</template>

<script lang="ts">
    import { Component, Vue, Prop, Watch } from "vue-property-decorator"
    import { namespace } from "vuex-class"

    import seq from "@/sequences"
    import { AttributesMap, ValueType, FieldType, IResultColumnInfo, IColumnField } from "@/api"
    import { IAction } from "@/components/ActionsMenu.vue"
    import { IUpdatableField, IUserViewArguments, UserViewResult, EntriesMap, CurrentUserViews, printValue } from "@/state/user_view"

    interface ITextType {
        name: "text"
        type: "text" | "number"
    }

    interface ITextAreaType {
        name: "textarea"
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
        @Prop({ type: Boolean, default: false }) tableShow!: boolean // FIXME solution must been css (form-control does blue border around input)

        @staging.Action("updateField") updateField!: (args: { schema: string, entity: string, id: number, field: string, fieldType: FieldType, value: any }) => void
        @staging.Action("setAddedField") setAddedField!: (args: { schema: string, entity: string, newId: number, field: string, fieldType: FieldType, value: any }) => void
        @userView.State("entries") entriesMap!: EntriesMap
        @userView.Action("getEntries") getEntries!: (_: { schemaName: string, entityName: string }) => Promise<void>
        @userView.State("current") userViews!: CurrentUserViews
        @userView.Action("getNestedView") getNestedView!: (_: IUserViewArguments) => Promise<void>

        private actions: IAction[] = []
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

        get isDisabled() {
            return this.locked || this.update === null || this.update.field === null
        }

        get uv() {
            if (this.inputType.name !== "userview") {
                return null
            } else {
                return this.userViews.getUserView(this.inputType.args)
            }
        }

        get inputType(): IType {
            const controlAttr = this.attributes["Control"]
            if (controlAttr === "UserView") {
                if (this.type.type !== "array" || this.type.subtype !== "string") {
                    return { name: "error", text: this.$tc("invalid_uv") }
                }
                // FIXME: proper args
                const queryArgs = seq(new URLSearchParams(location.search)).toObject()
                const viewArgs: IUserViewArguments = { type: "named", source: this.value[0], args: queryArgs }
                this.getNestedView(viewArgs)
                return { name: "userview", args: viewArgs }
            }

            if (this.update !== null && this.update.field !== null) {
                const fieldType = this.update.field.fieldType
                switch (fieldType.type) {
                    case "reference":
                        const { schema, name: entity } = fieldType.entity
                        this.getEntries({ schemaName: schema, entityName: entity })
                        const currentSchema = this.entriesMap[schema]
                        if (currentSchema === undefined) {
                            return { name: "text", type: "number" }
                        }
                        const entries = currentSchema[entity]
                        if (entries === undefined || entries instanceof Promise) {
                            return { name: "text", type: "number" }
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
                        return { name: "text", type: "number" }
                }
            } else {
                switch (this.type.type) {
                    case "bool":
                        return {
                            name: "select",
                            options: [...(this.isNullable ? [{ text: this.$tc("no_value"), value: "" }] : []), { text: this.$tc("yes"), value: "true" }, { text: this.$tc("no"), value: "false" }],
                        }
                    case "int":
                        return { name: "text", type: "number" }
                }
            }

            // Plain text
            switch (this.attributes["TextType"]) {
                case "multiline":
                    return { name: "textarea" }
                case "codeeditor":
                    return { name: "codeeditor" }
                default:
                    return { name: "text", type: "text" }
            }
        }

        private updateValue(text: string) {
            if (this.update === null || this.update.field === null) {
                console.assert(false, "No update entity defined in view")
                return
            }

            if (this.valueText !== text) {
                const entity = this.update.fieldRef.entity

                if (this.added) {
                    this.setAddedField({
                       schema: entity.schema,
                        entity: entity.name,
                        newId: this.update.id,
                        field: this.update.fieldRef.name,
                        fieldType: this.update.field.fieldType,
                        value: text,
                    })
                } else {
                    this.updateField({
                        schema: entity.schema,
                        entity: entity.name,
                        id: this.update.id,
                        field: this.update.fieldRef.name,
                        fieldType: this.update.field.fieldType,
                        value: text,
                    })
                }
            }
        }
    }
</script>

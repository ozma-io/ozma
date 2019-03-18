<i18n>
    {
        "en": {
            "no_value": "(No value)",
            "yes": "Yes",
            "no": "No"
        },
        "ru": {
            "no_value": "(Пусто)",
            "yes": "Да",
            "no": "Нет"
        }
    }
</i18n>

<template>
    <span>
        <div class="nested_menu">
            <ActionsMenu v-if="inputType.name === 'userview'"
                            title="☰"
                            :actions="actions" />
        </div>

        <b-form-checkbox v-if="inputType.name === 'check'"
                         :value="value"
                         @input="$emit('update:value', $event)"
                         :disabled="isDisabled" />
        <b-form-textarea v-else-if="inputType.name === 'textarea'"
                         :value="valueText"
                         @input="$emit('update:value', $event)"
                         :disabled="isDisabled"
                         :rows="3"
                         :max-rows="6"
                         :required="!isNullable" />
        <CodeEditor v-else-if="inputType.name === 'codeeditor'"
                    :content="valueText"
                    @update:content="$emit('update:value', $event)"
                    :readOnly="isDisabled" />
        <UserView v-else-if="inputType.name === 'userview'"
                    :uv="uv"
                    @update:actions="actions = $event" />
        <b-form-select v-else-if="inputType.name === 'select'"
                       :value="valueText"
                       @input="$emit('update:value', $event)"
                       :disabled="isDisabled"
                       :options="inputType.options" />
        <!-- We don't use bootstrap-vue's b-form-input type=text because of problems with Safari
                https://github.com/bootstrap-vue/bootstrap-vue/issues/1951
        -->
        <input v-else-if="inputType.type === 'text'"
               class="form-control"
               :value="valueText"
               @input="$emit('update:value', $event.target.value)"
               type="text"
               :disabled="isDisabled"
               :required="!isNullable" />
        <b-form-input v-else
                      :value="valueText"
                      @input="$emit('update:value', $event)"
                      :type="inputType.type"
                      :disabled="isDisabled"
                      :required="!isNullable" />
    </span>
</template>

<script lang="ts">
    import { Component, Vue, Prop, Watch } from "vue-property-decorator"
    import { namespace } from "vuex-class"
    import { AttributesMap, ValueType, IResultColumnInfo, IColumnField } from "@/api"
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
    }

    type IType = ITextType | ITextAreaType | ICodeEditorType | ISelectType | ICheckType | IUserViewType

    const userView = namespace("userView")

    @Component({
        components: {
            CodeEditor: () => import("@/components/CodeEditor.vue"),
        },
    })
    export default class FormControl extends Vue {
        @Prop({ type: Object, default: null }) field!: IColumnField | null
        @Prop({ type: Object }) type!: ValueType
        // Can be undefined which means failed validation.
        @Prop() value!: any
        @Prop({ type: String }) valueText!: string
        @Prop({ type: Object, default: {} }) attributes!: AttributesMap
        @Prop({ type: Boolean }) locked!: boolean
        @Prop({ type: Boolean, default: false }) added!: boolean

        @userView.State("entries") entriesMap!: EntriesMap
        @userView.Action("getEntries") getEntries!: (_: { schemaName: string, entityName: string }) => Promise<void>
        @userView.State("current") userViews!: CurrentUserViews
        @userView.Action("getNestedView") getNestedView!: (_: IUserViewArguments) => Promise<void>

        private actions: IAction[] = []
        private uv: UserViewResult | null = null

        @Watch("uv", { immediate: true })
        private clearActions() {
            this.actions = []
        }

        get isNullable() {
            return this.field === null ? true : this.field.isNullable
        }

        get isDisabled() {
            return this.field === null || this.locked
        }

        get inputType(): IType {
            const controlAttr = this.attributes["Control"]
            if (controlAttr === "UserView") {
                console.assert(
                    this.type.type === "array" && this.type.subtype === "string",
                    "User view rows should be arrays with user view name and arguments",
                )
                // See also getFieldType to understand expected value format.
                // FIXME: proper args
                const viewArgs: IUserViewArguments = { type: "named", source: this.value[0], args: new URLSearchParams(location.search) }
                this.getNestedView(viewArgs)
                this.uv = this.userViews.getUserView(viewArgs)
                return { name: "userview" }
            }
            this.uv = null

            if (this.field !== null) {
                const fieldType = this.field.fieldType
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
    }
</script>

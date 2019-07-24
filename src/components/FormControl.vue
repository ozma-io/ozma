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
    <div class="form-control-panel">
        <div class="nested-menu" v-if="actions.length > 0">
            <ActionsMenu title="view_headline"
                         :actions="actions" />
            <div v-if="caption.length > 0" class="caption-editors">
                {{caption}}
            </div>
        </div>
        <div v-else-if="caption.length > 0" class="caption-editors">
            {{caption}}
        </div>
        <template v-if="inputType.name === 'error'">
            {{ inputType.text }}
        </template>
        <input type="checkbox" v-else-if="inputType.name === 'check'"
                         :value="value"
                         :class="['form-control-panel_checkbox',
                                 {'form-control-panel_checkbox_error': isInvalid,
                                  'form-control-panel_checkbox_req': isAwaited}]"
                         @input="updateValue($event.target.value)"
                         :disabled="isDisabled"
                         ref="control" />
        <textarea v-else-if="inputType.name === 'textarea'"
                         :style="inputType.style"
                         :value="valueText"
                         :class="['form-control-panel_textarea',
                                 {'form-control-panel_textarea_error': isInvalid,
                                  'form-control-panel_textarea_req': isAwaited}]"
                         @input="updateValue($event.target.value)"
                         :disabled="isDisabled"
                         :rows="3"
                         :max-rows="6"
                         :required="!isNullable"
                         ref="control" />
        <!-- Do NOT add any `class` to CodeEditor; it breaks stuff! -->
        <CodeEditor v-else-if="inputType.name === 'codeeditor'"
                    :style="inputType.style"
                    mode="ace/mode/pgsql"
                    :content="valueText"
                    @update:content="updateValue($event)"
                    :readOnly="isDisabled"
                    ref="control" />
        <UserView v-else-if="inputType.name === 'userview'"
                    :uv="nestedUv"
                    :defaultValues="inputType.defaultValues"
                    @update:actions="extraActions = $event"
                    ref="control" />
        <div v-else-if="inputType.name === 'select'" class="select-container">
        <select
                :value="value"
                :class="['form-control-panel_select',
                        {'form-control-panel_select_error': isInvalid,
                         'form-control-panel_select_req': isAwaited}]"
                @input="updateValue($event.target.value)"
                :disabled="isDisabled"
                ref="control">
            <option v-for="option in inputType.options" v-bind:key="option.value" v-bind:value="option.value">
                {{ option.text }}
            </option>
        </select>
        <div class="select-container-after">

        </div>
        </div>
        <!-- We don't use bootstrap-vue's b-form-input type=text because of problems with Safari
                https://github.com/bootstrap-vue/bootstrap-vue/issues/1951
        -->
        <textarea v-else-if="inputType.type === 'text'"
                @keydown.enter.prevent=""
                wrap="soft"
                :value="valueText"
                :style="inputType.style"
                :class="['form-control-panel_textarea',
                        {'form-control-panel_textarea_error': isInvalid,
                         'form-control-panel_textarea_req': isAwaited}]"
                @input="updateValue($event.target.value)"
                :disabled="isDisabled"
                :rows="3"
                :max-rows="6"
                :required="!isNullable"
                ref="control" />
        <textarea v-else
                :value="valueText"
                :style="inputType.style"
                :class="['form-control-panel_textarea',
                        {'form-control-panel_textarea_error': isInvalid,
                         'form-control-panel_textarea_req': isAwaited}]"
                @input="updateValue($event.target.value)"
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
        style: Record<string, any>
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
        @Prop({ type: String, default: ""}) caption!: string

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
            // `calc` is needed because sizes should be relative to base font size.
            const heightSinglelineText = "calc(2em + 6px)"
            const heightMultilineText = "calc(4em + 12px)"
            const heightCodeEditor = "500px"
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
                            const select = Object.entries(entries).map(([id, name]) => ({ text: name, value: String(id) }))
                            return {
                                name: "select",
                                options: [...(this.isNullable ? [{ text: this.$tc("no_value"), value: "" }] : []), ...select],
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
                    return { name: "codeeditor", style: this.controlStyle(heightCodeEditor) }
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

<style scoped>
    .nested-menu > .actions-menu{
        width: max-content;
        display: inline-block;
    }
    .nested-menu >>> .actions-menu_actions-button {
        border: 0px !important;
        line-height: normal;
        padding: 2px;
        padding-left: 1px;
        height: 100%;
        text-align: left;
        border-radius: 0 !important;
    }
    .nested-menu {
        margin-left: -1px;
        left: 0;
        color: var(--ButtonTextColor) !important;
        width: max-content !important;
        display: block;
        margin-right: 7px;
        margin-top: 10px;
        margin-bottom: 2px;
    }
    .caption-editors {
        display: inline-block;
        margin-left: 2px;
    }

    .form-control-panel {
        padding-right: 2px;
    }
    .form-control-panel_select {
        border-color: var(--NavigationBackColor);
        width: 100%;
        padding: .375rem .75rem;
        height: calc(1.5em + .75rem + 2px);
    }
    .form-control-panel_checkbox {
        border-color: var(--NavigationBackColor)
    }
    .form-control-panel_textarea {
        border-color: var(--NavigationBackColor);
        width: 100%;
        overflow-y: hidden !important;
        overflow-x: hidden !important;
        word-wrap: unset !important;
        padding: .375rem .75rem;
        resize: none;
        vertical-align: top;
    }
    .select-container {
        display: flex;
        height: calc(2em + 6px);
    }
    .select-container:after {
        display: inline-block;
        margin-left: .255em;
        vertical-align: .255em;
        content: "";
        border-top: .25em solid;
        border-right: .25em solid transparent;
        border-bottom: 0;
        border-left: .25em solid transparent;
        color: black;
        margin-left: -1.3em;
        margin-top: 1.3em;
        z-index:1;
    }
    .select-container-after{
        width: 0px !important;
        z-index:1;
    }
    .select-container-after:after {
        display: inline-block;
        margin-left: .255em;
        vertical-align: .255em;
        content: "";
        border-right: .25em solid transparent;
        border-bottom: .25em solid;
        border-left: .25em solid transparent;
        color: black;
        margin-bottom: -0.3em;
        margin-left: -1.3em;
    }
    .form-control-panel_select, .form-control-panel_checkbox, .form-control-panel_textarea {
        border-radius: 0;
        box-shadow: none;
        -webkit-appearance: none;
        background: white;
    }
    .form-control-panel_select_req, .form-control-panel_checkbox_req, .form-control-panel_textarea_req {
        background-color: var(--RequiredBackColor)
    }
    .form-control-panel_select_error, .form-control-panel_checkbox_error, .form-control-panel_textarea_error {
        background-color: var(--ErrorBackColor)
    }
    .form-control-panel_select:focus, .form-control-panel_checkbox:focus, .form-control-panel_textarea:focus {
        border-color: var(--NavigationBackColor);
        box-shadow: 0 0 0 white;
    }
    .form-control-panel_select:disabled, .form-control-panel_checkbox:disabled, .form-control-panel_textarea:disabled {
        background-color: var(--ControlDisableColor);
    }
    @media screen and (max-aspect-ratio: 13/9) {
        @media screen and (max-device-width: 480px) {
            .select-container:after {
                position: sticky;
                left: calc(100vw - 1.3em - 1px);
            }
            .select-container-after {
                position: sticky;
                left: calc(100vw - 1px);
            }
            .nested-menu {
                z-index: 0;
                position: sticky;
            }
            .nested-menu > .actions-menu >>>  .div-with-actions{
                position: absolute !important;
            }
            .nested-menu:hover {
                z-index: 1200;
            }
            .form-control-panel_select, .form-control-panel_checkbox, .form-control-panel_textarea {
                width: calc(100vw - 2px);
                position: -webkit-sticky;
                position: sticky;
                left: 1px;
                display: block;
            }
            td > .form-control-panel > .form-control-panel_textarea {
                width: 100%;
            }
            td > div.form-control-panel > pre{
                min-width: 0 !important;
            }
            .caption-editors {
                position: sticky;
                left: 3px;
                width: max-content;
            }
        }
    }
    /*для формконтрола внутри таблицы*/
    td > div.form-control-panel {
        left: calc(50% - 175px);
        top: calc(50% - 50px);
        position: fixed;
        z-index: 1000;
        background-color: var(--MenuColor);
        display: block;
        align-items: center;
        padding: 20px;
    }
    @media screen and (max-device-width: 480px){
        td > div.form-control-panel {
            left: 2px;
            width: calc(100% - 4px);
        }
        td > div.form-control-panel > div.select-container {
            width: calc(100vw - 44px) !important;
            /*padding 20px and left 2px*/
        }

        td > div.form-control-panel > div.select-container > select.form-control-panel_select {
            width: 100%;
        }
        td > div.form-control-panel > div.select-container:after {
            position: relative;
            left: 0px;
        }
    }
    td > div.form-control-panel > div.select-container {
        width: 300px
    }
    td > div.form-control-panel > pre {
        min-width: 600px;
        height: 200px !important;
        margin-bottom: 0px;
    }
    td > div.form-control-panel > textarea {
       white-space:nowrap;
    }
    *:focus {
        border: 0 !important;
        box-shadow: none !important;
    }
</style>
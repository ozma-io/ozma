<i18n>
    {
        "en": {
            "yes": "Yes",
            "no": "No",
            "invalid_uv": "Nested user view rows should be JSON objects with 'ref' and 'args' defined",
            "select_view": "Select in view",
            "follow_reference": "Follow reference"
        },
        "ru": {
            "yes": "Да",
            "no": "Нет",
            "invalid_uv": "Столбцы со вложенными представлениями должны быть JSON-объектами с заданными полями 'ref' и 'args'",
            "select_view": "Выбрать из представления",
            "follow_reference": "Перейти к сущности"
        }
    }
</i18n>

<template>
    <div :class="['form-control-panel', {
                 'form-control-panel_editor': inputType.name === 'codeeditor',
                 }]"
         :style="controlPanelStyle">
        <div v-if="actions.length > 0" class="nested-menu">
            <ActionsMenu title="view_headline"
                         :actions="actions"
                         :indirectLinks="indirectLinks"
                         @goto="$emit('goto', $event)" />
            <div v-if="caption !== ''" class="caption-editors">
                {{ caption }}
            </div>
        </div>
        <div v-else-if="caption !== ''" class="caption-editors">
            {{ caption }}
        </div>

        <SelectUserView v-if="selectViewActive"
                :selectView="selectView"
                :fieldType="fieldType"
                @update:actions="extraActions = $event"
                @select="updateValue($event); selectViewActive = false" />

        <template v-if="inputType.name === 'error'">
            {{ inputType.text }}
        </template>
        <input type="checkbox" v-else-if="inputType.name === 'check'"
               :value="currentValue"
               :class="['form-control-panel_checkbox',
                       {'form-control-panel_checkbox_error': value.erroredOnce,
                       'form-control-panel_checkbox_req': isAwaited && !disableColor}]"
               @input="updateValue($event.target.value)"
               :disabled="isDisabled"
               ref="control" />
        <textarea v-else-if="inputType.name === 'textarea'"
                  :style="inputType.style"
                  :value="textValue"
                  :class="['form-control-panel_textarea', 'multilines',
                          {'form-control-panel_textarea_error': value.erroredOnce,
                          'form-control-panel_textarea_req': isAwaited && !disableColor}]"
                  @input="updateValue($event.target.value)"
                  :disabled="isDisabled"
                  :rows="3"
                  wrap="soft"
                  :max-rows="6"
                  :required="!isNullable"
                  ref="control" />
        <MultiSelect v-else-if="inputType.name === 'select'"
                     :value="currentValue"
                     :options="inputType.options"
                     :height="attributes['ControlHeight']"
                     single
                     @update:value="updateValue($event)"
                     :required="!isNullable"
                     :disabled="isDisabled"
                     ref="control">
            <template v-slot:singleValue="select">
                <span v-if="select.valueOption.meta && select.valueOption.meta.link"
                  :style="select.listValueStyle"
                  class="single_value">
                    <UserViewLink :uv="select.valueOption.meta.link"
                                  @[indirectLinks?`click`:null]="$emit('goto', $event)">
                        {{select.valueOption.label}}
                    </UserViewLink>
                </span>
                <span v-else
                      :style="select.listValueStyle"
                      class="single_value">{{select.valueOption.label}}</span>
            </template>
        </MultiSelect>
        <Calendar v-else-if="inputType.name === 'calendar'"
                  :value="value.value"
                  :textValue="textValue"
                  @update:value="updateValue($event)"
                  :showTime="inputType.showTime" />
        <!-- Do NOT add any `class` to CodeEditor; it breaks stuff! -->
        <CodeEditor v-else-if="inputType.name === 'codeeditor'"
                    :style="inputType.style"
                    mode="ace/mode/pgsql"
                    :content="textValue"
                    @update:content="updateValue($event)"
                    :readOnly="isDisabled"
                    :autofocus="autofocus"
                    ref="control" />
        <UserView v-else-if="inputType.name === 'userview'"
                  :args="inputType.args"
                  :defaultValues="inputType.defaultValues"
                  :indirectLinks="indirectLinks"
                  :scope="scope"
                  @update:actions="extraActions = $event"
                  @goto="$emit('goto', $event)"
                  ref="control" />
        <input v-else-if="inputType.type === 'text'"
                type="text"
                @keydown.enter.prevent=""
                wrap="soft"
                :value="textValue"
                :style="inputType.style"
                :class="['form-control-panel_textarea', 'singleline',
                        {'form-control-panel_textarea_error': value.erroredOnce,
                         'form-control-panel_textarea_req': isAwaited && !disableColor}]"
                @input="updateValue($event.target.value)"
                :disabled="isDisabled"
                :rows="3"
                :max-rows="6"
                :required="!isNullable"
                ref="control" />
        <input v-else
                type="text"
                :value="textValue"
                :style="inputType.style"
                @keydown.enter.prevent=""
                :class="['form-control-panel_textarea', 'singleline',
                        {'form-control-panel_textarea_error': value.erroredOnce,
                         'form-control-panel_textarea_req': isAwaited && !disableColor}]"
                @input="updateValue($event.target.value)"
                :disabled="isDisabled"
                :rows="3"
                :max-rows="6"
                :required="!isNullable"
                ref="control" />
    </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { namespace } from "vuex-class";

import { valueToText, valueIsNull, equalEntityRef } from "@/values";
import { AttributesMap, SchemaName, EntityName, FieldName, ValueType, FieldType, IResultColumnInfo, IColumnField, IUserViewRef, IEntityRef } from "@/api";
import { IAction } from "@/components/ActionsMenu.vue";
import { IValueInfo, IUserViewArguments, CombinedUserView, EntriesMap, CurrentUserViews, homeSchema, ICombinedValue, currentValue } from "@/state/user_view";
import { IQuery, attrToQueryRef, attrToQuerySelf, IAttrToQueryOpts } from "@/state/query";
import { ISelectOption } from "@/components/multiselect/MultiSelect.vue";
import { ISelectionRef } from "@/components/BaseUserView";

interface ITextType {
    name: "text";
    type: "text" | "number";
    style: Record<string, any>;
}

interface ITextAreaType {
    name: "textarea";
    style: Record<string, any>;
}

interface ICodeEditorType {
    name: "codeeditor";
    style: Record<string, any>;
}

interface ISelectType {
    name: "select";
    options: ISelectOption[];
}

interface ICheckType {
    name: "check";
}

interface IUserViewType extends IQuery {
    name: "userview";
}

interface IErrorType {
    name: "error";
    text: string;
}

interface ICalendar {
    name: "calendar";
    showTime: boolean;
}

type IType = ITextType | ITextAreaType | ICodeEditorType | ISelectType | ICheckType | IUserViewType | IErrorType | ICalendar;

const userView = namespace("userView");

@Component({
    components: {
        CodeEditor: () => import("@/components/CodeEditor.vue"),
        MultiSelect: () => import("@/components/multiselect/MultiSelect.vue"),
        Calendar: () => import("@/components/Calendar.vue"),
        SelectUserView: () => import("@/components/SelectUserView.vue"),
    },
})
export default class FormControl extends Vue {
    @Prop({ type: Object, required: true }) type!: ValueType;
    @Prop({ type: Object, required: true }) value!: ICombinedValue;
    @Prop({ type: Object, default: {} }) attributes!: AttributesMap;
    @Prop({ type: Boolean, default: false }) locked!: boolean;
    @Prop({ type: Boolean, default: false }) autofocus!: boolean;
    @Prop({ type: CombinedUserView }) uv!: CombinedUserView;
    @Prop({ type: String, default: ""}) caption!: string;
    @Prop({ type: Boolean, default: false }) disableColor!: boolean;
    @Prop({ type: Boolean, default: false }) indirectLinks!: boolean;
    @Prop({ type: String, required: true }) scope!: string;

    @userView.State("entries") entriesMap!: EntriesMap;
    @userView.Action("getEntries") getEntries!: (_: IEntityRef) => Promise<void>;

    private extraActions: IAction[] = [];
    private selectViewActive = false;

    get isNullable() {
        return this.value.info === undefined || this.value.info.field === null ? true : this.value.info.field.isNullable;
    }

    get currentValue() {
        return currentValue(this.value);
    }

    get isAwaited() {
        // We use `value.value` here to highlight unvalidated values.
        return !this.isNullable && valueIsNull(this.value.value);
    }

    get isDisabled() {
        return this.locked || this.value.info === undefined || this.value.info.field === null;
    }

    get textValue() {
        return valueToText(this.type, this.currentValue);
    }

    get selectView() {
        const home = homeSchema(this.uv.args);
        const linkOpts = home !== null ? { homeSchema: home } : undefined;
        return attrToQuerySelf(this.attributes["SelectView"], this.value.info, linkOpts);
    }

    get actions() {
        const actions: IAction[] = [];
        const home = homeSchema(this.uv.args);
        const linkOpts = home !== null ? { homeSchema: home } : undefined;
        const link = attrToQueryRef(this.attributes["LinkedView"], this.currentValue, this.value.info, linkOpts);
        if (link !== null) {
            actions.push({ name: this.$tc("follow_reference"), query: link });
        }

        if (this.selectView !== null && !this.selectViewActive) {
            actions.push( { name: this.$tc("select_view"), callback: () => {
                this.selectViewActive = true;
            } });
        }

        actions.push(...this.extraActions);
        return actions;
    }

    private get controlPanelStyle() {
        const heightAttr = this.attributes["ControlHeight"];
        const isSelect = this.inputType.name === "select";
        return heightAttr && !isSelect ? { height: `${heightAttr}px`, maxHeight: "initial" } : {};
    }

    private controlStyle(height?: string): Record<string, any> {
        const heightAttr = this.attributes["ControlHeight"];
        const systemHeight = height ? { height } : {};
        const userHeight = !isNaN(heightAttr) ? { height: `${heightAttr}px` } : {};
        const editorStyle = this.attributes["TextType"] === "codeeditor" ? { minHeight: "200px" } : {};
        return { ...systemHeight, ...userHeight, ...editorStyle };
    }

    get fieldType() {
        if (this.value.info !== undefined && this.value.info.field !== null) {
            return this.value.info.field.fieldType;
        } else {
            return null;
        }
    }

    get inputType(): IType {
        const home = homeSchema(this.uv.args);
        const linkOpts = home !== null ? { homeSchema: home } : undefined;

        const controlAttr = this.attributes["Control"];
        if (controlAttr === "UserView") {
            const nestedRef = attrToQuerySelf(this.currentValue, this.value.info, linkOpts);

            if (nestedRef === null) {
                return { name: "error", text: this.$tc("invalid_uv") };
            } else {
                return { name: "userview", ...nestedRef };
            }
        }
        // `calc` is needed because sizes should be relative to base font size.
        const heightSinglelineText = "calc(2em + 6px)";
        const heightMultilineText = "calc(4em + 12px)";
        const heightCodeEditor = "calc(100% - 1.5rem)";
        if (this.fieldType !== null) {
            switch (this.fieldType.type) {
                case "reference":
                    const ref = this.fieldType.entity;
                    this.getEntries(ref);
                    const currentSchema = this.entriesMap[ref.schema];
                    if (currentSchema === undefined) {
                        return { name: "text", type: "number", style: this.controlStyle() };
                    }
                    const entries = currentSchema[ref.name];
                    if (entries === undefined || entries instanceof Promise) {
                        return { name: "text", type: "number", style: this.controlStyle() };
                    } else {
                        const select = Object.entries(entries).map(([id, name]) => ({
                            label: name,
                            value: Number(id),
                            meta: {
                                link: attrToQueryRef(this.attributes["LinkedView"], id, this.value.info, linkOpts),
                            },
                        }));
                        return {
                            name: "select",
                            options: select,
                        };
                    }
                case "enum":
                    return {
                        name: "select",
                        options: this.fieldType.values.map(x => ({ label: x, value: x })),
                    };
                case "bool":
                    return {
                        name: "select",
                        options: [{ label: this.$tc("yes"), value: "true" }, { label: this.$tc("no"), value: "false" }],
                    };
                case "int":
                    return { name: "text", type: "number", style: this.controlStyle() };
                // FIXME: Fix calendar field.
                case "date":
                  return { name: "calendar", showTime: false };
                case "datetime":
                  return { name: "calendar", showTime: true };
            }
        } else {
            switch (this.type.type) {
                case "bool":
                    return {
                        name: "select",
                        options: [  {label: this.$tc("yes"), value: "true" }, { label: this.$tc("no"), value: "false" }],
                    };
                case "int":
                    return { name: "text", type: "number", style: this.controlStyle() };
            }
        }

        // Plain text
        switch (this.attributes["TextType"]) {
            case "multiline":
                return { name: "textarea", style: this.controlStyle(heightMultilineText) };
            case "codeeditor":
                return { name: "codeeditor", style: this.controlStyle(heightCodeEditor) };
            default:
                return { name: "text", type: "text", style: this.controlStyle() };
        }
    }

    private mounted() {
        if (this.autofocus) {
            const type = this.inputType;
            const control: any = this.$refs["control"];
            if (type.name === "text") {
                control.focus();
            } else if (type.name === "textarea") {
                control.focus();
            } else if (type.name === "check") {
                control.focus();
            }
        }
    }

    private updateValue(newValue: any) {
        if (this.value.info === undefined) {
            throw new Error("No update entity defined in view");
        }

        if (this.currentValue !== newValue) {
            this.$emit("update", newValue);
        }
    }

    @Watch("selectView")
    private clearActions() {
        if (this.selectView === null) {
            this.extraActions = [];
        }
    }
}
</script>

<style scoped>
/* Current Z layout:

* Drop-down menu    (1200)
* FormControl       (1000)

*/
    input {
        border: 1px solid rgb(81, 152, 57);
    }
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

    .form-data > .form-control-panel.form-control-panel_editor {
        height: 100%;
        width: 100%;
        max-height: 500px;
    }

    .form-control-panel {
        padding-right: 2px;
        max-width: 60%;
        max-height: 60%;
        min-width: 14rem;
        box-sizing: content-box;
    }
    .form-control-panel_editor {
        width: 60%;
        height: 60%;
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
    .multilines {
        overflow-y: auto !important
    }
    .singleline {
        overflow-x: auto !important;
        max-height: 40px;
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
            .form-control-panel-hidden{
                margin-top: 7px;
                position: sticky;
            }
            .nested-menu {
                z-index: 0; /* чтобы при нажатии на "действия" в подтаблице остальные аналогичные кнопки других подтаблиц были ниже темного блока */
                position: sticky;
            }
            .nested-menu > .actions-menu >>>  .div-with-actions{
                position: absolute !important;
            }
            .nested-menu:hover {
                z-index: 1200; /* меню действий для подтаблиц поверх темного фона */
            }
            .form-control-panel_select, .form-control-panel_checkbox, .form-control-panel_textarea {
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

    *:focus {
        border: 0 !important;
        box-shadow: none !important;
    }
</style>

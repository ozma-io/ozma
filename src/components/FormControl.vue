<i18n>
    {
        "en": {
            "yes": "Yes",
            "no": "No",
            "invalid_uv": "Nested user view rows should be JSON objects with 'ref' and 'args' defined",
            "select_view": "Select in view",
            "follow_reference": "Follow reference",
            "empty": "(empty)"
        },
        "ru": {
            "yes": "Да",
            "no": "Нет",
            "invalid_uv": "Столбцы со вложенными представлениями должны быть JSON-объектами с заданными полями 'ref' и 'args'",
            "select_view": "Выбрать из представления",
            "follow_reference": "Перейти к сущности",
            "empty": "(пусто)"
        }
    }
</i18n>

<template>
    <fragment>
        <template v-if="inputType.name === 'error'">
            {{ inputType.text }}
        </template>
        <InputSlot :label="caption"
            v-if="inputType.name !== 'userview'"
            :inline="!isInline"
            :value="currentValue"
            :actions="actions"
            :autoOpen="autoOpen"
            @update:value="updateValue">
            <template v-slot:input-modal="iSlot">
                <Input v-if="inputType.name === 'text'"
                    :value="iSlot.value"
                    @input="iSlot.onChange($event.target.value)"
                    :dontFocus="dontFocus"
                    :disabled="isDisabled"
                    focus />
                <Textarea v-else-if="inputType.name === 'textarea'"
                    :value="iSlot.value"
                    @update:value="iSlot.onChange($event)"
                    :dontFocus="dontFocus"
                    :disabled="isDisabled" />
                <Calendar v-else-if="inputType.name === 'calendar'"
                    :value="iSlot.value"
                    :textValue="textValue"
                    @update:value="iSlot.onChange"
                    :showTime="inputType.showTime"
                    ref="control" />
                <MultiSelect v-else-if="inputType.name === 'select'"
                    :value="currentValue"
                    :options="inputType.options"
                    :height="attributes['ControlHeight']"
                    single
                    @update:value="updateValue($event)"
                    :required="!isNullable"
                    :disabled="isDisabled"
                    ref="control" />
            </template>
            <template v-slot:input="iSlot">
                <template v-if="inputType.name === 'error'">
                    {{ inputType.text }}
                </template>
                <Input v-if="inputType.name === 'text'"
                    :value="currentValue"
                    @input="updateValue($event.target.value)"
                    @focus="iSlot.onFocus"
                    :dontFocus="dontFocus"
                    :disabled="isDisabled" />
                <Textarea v-else-if="inputType.name === 'textarea'"
                    :value="currentValue"
                    @update:value="updateValue($event)"
                    @focus="iSlot.onFocus"
                    :dontFocus="dontFocus"
                    :disabled="isDisabled" />
                <Calendar v-else-if="inputType.name === 'calendar'"
                    :value="value.value"
                    :textValue="textValue"
                    @focus="iSlot.onFocus"
                    @update:value="updateValue($event)"
                    :showTime="inputType.showTime"
                    ref="control" />
                <MultiSelect v-else-if="inputType.name === 'select'"
                    :value="currentValue"
                    :options="inputType.options"
                    :height="attributes['ControlHeight']"
                    single
                    @update:value="updateValue($event)"
                    @focus="iSlot.onFocus"
                    :dontOpen="isMobile"
                    :required="!isNullable"
                    :disabled="isDisabled"
                    ref="control" />
                <CodeEditor v-else-if="inputType.name === 'codeeditor'"
                    :style="inputType.style"
                    :content="textValue"
                    @update:content="updateValue($event)"
                    :readOnly="isDisabled"
                    :autofocus="autofocus"
                    ref="control" />
                <input type="checkbox" v-else-if="inputType.name === 'check'"
                    :value="currentValue"
                    :class="['form-control-panel_checkbox',
                             {'form-control-panel_checkbox_error': value.erroredOnce,
                             'form-control-panel_checkbox_req': isAwaited && !disableColor}]"
                    @input="updateValue($event.target.value)"
                    @focus="iSlot.onFocus"
                    :disabled="isDisabled"
                    ref="control" />
            </template>
        </InputSlot>
        <template v-if="inputType.name === 'reference' || inputType.name === 'userview'">
            <div v-if="actions.length > 0" class="nested-menu">
                <ActionsMenu title="view_headline"
                    :actions="actions"
                    :indirectLinks="indirectLinks"
                    @goto="$emit('goto', $event)" />
                <label class="input_label">{{ caption }}</label>
            </div>
            <ReferenceField v-if="inputType.name === 'reference'"
                :value="value"
                :height="attributes['ControlHeight']"
                :entry="inputType.ref"
                :linkedAttr="inputType.linkedAttr"
                :selectView="inputType.selectView"
                :controlStyle="inputType.style"
                :uvArgs="uvArgs"
                @update:actions="actions = $event"
                @update="updateValue($event)"
                :isNullable="isNullable"
                :isDisabled="isDisabled"
                ref="control" />
            <UserView v-else-if="inputType.name === 'userview'"
                :args="inputType.args"
                :defaultValues="inputType.defaultValues"
                :indirectLinks="indirectLinks"
                :scope="scope"
                :level="level + 1"
                @update:actions="actions = $event"
                @goto="$emit('goto', $event)"
                ref="control" />
        </template>
    </fragment>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { namespace } from "vuex-class";

import { valueToText, valueIsNull, equalEntityRef } from "@/values";
import { AttributesMap, SchemaName, EntityName, FieldName, ValueType, FieldType, IResultColumnInfo, IColumnField, IUserViewRef, IEntityRef } from "@/api";
import { IAction } from "@/components/ActionsMenu.vue";
import { IValueInfo, IUserViewArguments, CombinedUserView, CurrentUserViews, homeSchema, ICombinedValue, currentValue, IEntriesRef } from "@/state/user_view";
import { IQuery, attrToQuerySelf, IAttrToQueryOpts } from "@/state/query";
import { ISelectOption } from "@/components/multiselect/MultiSelect.vue";
import { ISelectionRef } from "@/components/BaseUserView";
import { isMobile } from "@/utils";

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

interface IReferenceType {
    name: "reference";
    ref: IEntriesRef;
    linkedAttr?: any;
    selectView?: IQuery;
    style?: Record<string, any>;
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

type IType = ITextType | ITextAreaType | ICodeEditorType | ISelectType | IReferenceType | ICheckType | IUserViewType | IErrorType | ICalendar;

const userView = namespace("userView");

const heightExclusions = ["select", "reference"];
const multilineTypes = [ "codeeditor", "textarea" ];
const inlineTypes = ["codeeditor", "textarea", "userview"];

@Component({
    components: {
        CodeEditor: () => import("@/components/CodeEditor.vue"),
        MultiSelect: () => import("@/components/multiselect/MultiSelect.vue"),
        Calendar: () => import("@/components/Calendar.vue"),
        ReferenceField: () => import("@/components/ReferenceField.vue"),
        InputSlot: () => import("@/components/form/InputSlot.vue"),
        Input: () => import("@/components/form/Input.vue"),
        Textarea: () => import("@/components/form/Textarea.vue"),
    },
})
export default class FormControl extends Vue {
    @Prop({ type: Object, required: true }) type!: ValueType;
    @Prop({ type: Object, required: true }) value!: ICombinedValue;
    @Prop({ type: Object, default: () => ({}) }) attributes!: AttributesMap;
    @Prop({ type: Boolean, default: false }) locked!: boolean;
    @Prop({ type: Boolean, default: false }) autofocus!: boolean;
    @Prop({ type: Boolean, default: false }) dontFocus!: boolean;
    @Prop({ type: Object, required: true }) uvArgs!: IUserViewArguments;
    @Prop({ type: String, default: "" }) caption!: string;
    @Prop({ type: Boolean, default: false }) disableColor!: boolean;
    @Prop({ type: Boolean, default: false }) indirectLinks!: boolean;
    @Prop({ type: String, required: true }) scope!: string;
    @Prop({ type: Number, required: true }) level!: number;
    @Prop({ type: Boolean, default: false }) autoOpen!: boolean;

    private actions: IAction[] = [];

    get isInline(): boolean {
        return inlineTypes.includes(this.inputType.name);
    }

    get isNullable() {
        return this.value.info === undefined || this.value.info.field === null ? true : this.value.info.field.isNullable;
    }

    get currentValue() {
        return currentValue(this.value);
    }

    private get isMobile(): boolean {
        return isMobile();
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

    private get controlPanelStyle() {
        const heightAttr = this.attributes["ControlHeight"];
        const excludeHeight = heightExclusions.includes(this.inputType.name);
        const isHeightOnPanel = !multilineTypes.includes(this.inputType.name);
        const height = isHeightOnPanel ? { height: `${heightAttr}px` } : {};
        return heightAttr && !excludeHeight ? { ...height, maxHeight: "initial" } : {};
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
        const home = homeSchema(this.uvArgs);
        const linkOpts = home !== null ? { homeSchema: home } : undefined;

        const controlAttr = this.attributes["Control"];
        if (controlAttr === "UserView") {
            if (this.currentValue === null || this.currentValue === undefined) {
                return { name: "error", text: this.$t("empty").toString() };
            }

            const nestedRef = attrToQuerySelf(this.currentValue, this.value.info, linkOpts);

            if (nestedRef === null) {
                return { name: "error", text: this.$t("invalid_uv").toString() };
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
                    const refEntry: IReferenceType = {
                        name: "reference",
                        ref: this.fieldType,
                    };
                    refEntry.linkedAttr = this.attributes["LinkedView"];
                    refEntry.style = this.controlStyle();
                    const selectView = attrToQuerySelf(this.attributes["SelectView"], this.value.info, linkOpts);
                    if (selectView !== null) {
                        refEntry.selectView = selectView;
                    }
                    return refEntry;
                case "enum":
                    return {
                        name: "select",
                        options: this.fieldType.values.map(x => ({ label: x, value: x })),
                    };
                case "bool":
                    return {
                        name: "select",
                        options: [{ label: this.$t("yes").toString(), value: true }, { label: this.$t("no").toString(), value: false }],
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
                        options: [{ label: this.$t("yes").toString(), value: true }, { label: this.$t("no").toString(), value: false }],
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
            if (control) {
                if (type.name === "text") {
                    control.focus();
                } else if (type.name === "textarea") {
                    control.focus();
                } else if (type.name === "check") {
                    control.focus();
                }
            }
        }
    }

    private updateValue(newValue: any) {
        if (this.currentValue !== newValue) {
            this.$emit("update", newValue);
        }
    }
}
</script>

<style scoped>
/* Current Z layout:

* Drop-down menu    (1200)
* FormControl       (1000)

*/
    .input_label {
        align-self: center;
        margin-bottom: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: pre;
        cursor: question;
        color: var(--MainTextColor);
    }
    input {
        border: 1px solid rgb(81, 152, 57);
    }
    .nested-menu > .actions-menu{
        width: max-content;
        display: inline-block;
        margin-right: 15px;
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
    .actions-menu {
        width: max-content;
        display: inline-block;
    }
    .actions-menu_actions-button {
        border: 0px !important;
        line-height: normal;
        padding: 2px;
        padding-left: 1px;
        height: 100%;
        text-align: left;
        border-radius: 0 !important;
    }
    .nested-menu {
        color: var(--MainBorderColor) !important;
        display: flex;
        align-items: center;
        margin-bottom: 5px;
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

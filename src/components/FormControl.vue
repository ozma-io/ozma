<i18n>
    {
        "en": {
            "yes": "Yes",
            "no": "No",
            "boolean_null": "Empty",
            "invalid_uv": "Nested user view rows should be JSON objects with 'ref' and 'args' defined",
            "select_view": "Add in modal window",
            "data_will_load_after_save": "(Data will load after save)"
        },
        "ru": {
            "yes": "Да",
            "no": "Нет",
            "boolean_null": "Пусто",
            "invalid_uv": "Столбцы со вложенными представлениями должны быть JSON-объектами с заданными полями 'ref' и 'args'",
            "select_view": "Создать во вложенном окне",
            "data_will_load_after_save": "(Данные загрузятся после сохранения)"
        }
    }
</i18n>

<template>
  <fragment>
    <InputSlot
      v-if="inputType.name !== 'userview' && inputType.name !== 'empty_userview'"
      :inline="!isMultiline"
      :modal-only="modalOnly"
      :is-cell-edit="isCellEdit"
      :label="usedCaption"
      :background-color="cellColor"
      :text-align="textAlign"
      :modal="$isMobile && (forceModalOnMobile || isMultiline)"
      :required="!isNullable"
      :empty="currentValueIsNull"
      @close-modal-input="$emit('close-modal-input')"
    >
      <template #default="iSlot">
        <template v-if="inputType.name === 'error'">
          {{ inputType.text }}
        </template>
        <Input
          v-else-if="inputType.name === 'text'"
          :value="currentValue"
          :is-cell-edit="isCellEdit"
          :disabled="isDisabled"
          :required="!isNullable"
          :autofocus="autofocus || iSlot.autofocus"
          :text-align="textAlign"
          :background-color="cellColor"
          @input="updateValue"
          @set-input-height="setInputHeight"
          @focus="iSlot.onFocus"
        />
        <Textarea
          v-else-if="inputType.name === 'textarea'"
          :value="currentValue"
          :is-cell-edit="isCellEdit"
          :disabled="isDisabled"
          :height="customHeight"
          :required="!isNullable"
          :autofocus="autofocus || iSlot.autofocus"
          :text-align="textAlign"
          :background-color="cellColor"
          @set-input-height="setInputHeight"
          @update:value="updateValue"
          @focus="iSlot.onFocus"
        />
        <Calendar
          v-else-if="inputType.name === 'calendar'"
          ref="control"
          :value="currentValue"
          :text-value="textValue"
          :autofocus="autofocus || iSlot.autofocus"
          :is-cell-edit="isCellEdit"
          :show-time="inputType.showTime"
          :time-step="inputType.timeStep ? inputType.timeStep : undefined"
          :required="!isNullable"
          :background-color="cellColor"
          @focus="iSlot.onFocus"
          @update:value="updateValue"
        />
        <ValueSelect
          v-else-if="inputType.name === 'select'"
          ref="control"
          :value="currentValue"
          :options="inputType.options"
          :height="customHeight"
          :autofocus="autofocus || iSlot.autofocus"
          :required="!isNullable"
          :disabled="isDisabled"
          :background-color="cellColor"
          @update:value="updateValue"
          @focus="iSlot.onFocus"
        />
        <CodeEditor
          v-else-if="inputType.name === 'codeeditor'"
          ref="control"
          :language="inputType.language"
          :is-modal="iSlot.modal"
          :style="inputType.style"
          :content="textValue"
          :read-only="isDisabled"
          :autofocus="autofocus || iSlot.autofocus"
          :required="!isNullable"
          @update:content="updateValue"
        />
        <MarkdownEditor
          v-else-if="inputType.name === 'markdown'"
          ref="control"
          :height="customHeight"
          :edit-type="inputType.editType"
          :content="textValue"
          :read-only="isDisabled"
          :autofocus="autofocus || iSlot.autofocus"
          :required="!isNullable"
          @update:content="updateValue"
        />
        <input
          v-else-if="inputType.name === 'check'"
          ref="control"
          type="checkbox"
          :value="currentValue"
          :autofocus="autofocus || iSlot.autofocus"
          :class="['form-control-panel_checkbox',
                   {'form-control-panel_checkbox_req': isAwaited && !disableColor}]"
          :disabled="isDisabled"
          :required="!isNullable"
          @input="updateValue($event.target.value)"
          @focus="iSlot.onFocus"
        >
        <QRCode
          v-else-if="inputType.name === 'qrcode'"
          :id="typeof currentValue === 'number' ? currentValue : undefined"
          :entity="inputType.ref"
          :height="customHeight"
        />
        <BarCodePrint
          v-else-if="inputType.name === 'barcode'"
          ref="control"
          :content="textValue"
          @scanned="barCodeScanned"
        />
        <div v-else-if="inputType.name === 'static_text'">
          {{ textValue }}
        </div>
        <img v-else-if="inputType.name === 'static_image'" :src="textValue">
        <ReferenceField
          v-else-if="inputType.name === 'reference'"
          ref="control"
          :value="value"
          :select-views="inputType.selectViews"
          :height="customHeight"
          :reference-entity="inputType.ref"
          :link-attr="inputType.linkAttr"
          :uv-args="uvArgs"
          :autofocus="autofocus || iSlot.autofocus"
          :nullable="isNullable"
          :disabled="isDisabled"
          :background-color="cellColor"
          :qrcode-input="isQRCodeInput"
          @update:actions="actions = $event"
          @update:buttons="buttons = $event"
          @focus="iSlot.onFocus"
          @update:value="updateValue($event)"
          @goto="$emit('goto', $event)"
        />
      </template>
    </InputSlot>
    <template v-if="inputType.name === 'userview' || inputType.name == 'empty_userview'">
      <b-row>
        <b-col
          v-if="usedCaption"
          :cols="isMultiline ? 12 : 4"
        >
          <NestedUserViewPanel
            :used-caption="usedCaption"
            :actions="actions"
            :enable-filter="enableFilter"
            :input-type="inputType"
            :panel-buttons="panelButtons"
            :filter-string="filterString"
            @update:filterString="filterString = $event"
            @goto="$emit('goto', $event)"
          />
        </b-col>
        <b-col :cols="!isMultiline && usedCaption ? 8 : 12">
          <div v-if="inputType.name === 'userview'" :style="{ backgroundColor: cellColor, borderRadius: '0.2rem' }">
            <NestedUserView
              ref="control"
              :args="inputType.args"
              :default-values="inputType.defaultValues"
              :scope="scope"
              :level="level + 1"
              :filter-string="filterString"
              @update:actions="actions = $event"
              @update:panelButtons="panelButtons = $event"
              @update:enableFilter="enableFilter = $event"
              @update:title="updateTitle"
              @goto="$emit('goto', $event)"
            />
          </div>
        </b-col>
      </b-row>
    </template>
  </fragment>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { namespace } from "vuex-class";
import type { AttributesMap, ValueType } from "ozma-api";

import { valueToText, valueIsNull } from "@/values";
import { Action } from "@/components/ActionsMenu.vue";
import { IQuery, attrToQuerySelf } from "@/state/query";
import { ISelectOption } from "@/components/multiselect/MultiSelect.vue";
import { IEntriesRef, referenceEntriesRef } from "@/state/entries";
import type { ICombinedValue, IUserViewArguments } from "@/user_views/combined";
import { currentValue, homeSchema } from "@/user_views/combined";
import { PanelButton } from "@/components/ButtonsPanel.vue";
import { IEntityRef } from "ozma-api/src";
import { IReferenceSelectAction } from "./ReferenceMultiSelect.vue";

interface ITextType {
  name: "text";
  type: "text" | "number";
  style: Record<string, unknown>;
}

interface ITextAreaType {
  name: "textarea";
  style: Record<string, unknown>;
}

interface ICodeEditorType {
  name: "codeeditor";
  language: string;
  style: Record<string, unknown>;
}

interface IQRCodeType {
  name: "qrcode";
  ref: IEntityRef;
}

interface IBarCodeType {
  name: "barcode";
}

interface IMarkdownEditorType {
  name: "markdown";
  editType: string;
  style: Record<string, unknown>;
}

interface ISelectType {
  name: "select";
  options: ISelectOption<unknown>[];
}

interface IReferenceType {
  name: "reference";
  ref: IEntriesRef;
  linkAttr?: unknown;
  selectViews: IReferenceSelectAction[];
  style?: Record<string, unknown>;
}

interface ICheckType {
  name: "check";
}

export interface IUserViewType extends IQuery {
  name: "userview";
}

interface IEmptyUserViewType {
  name: "empty_userview";
  text: string;
}

interface IErrorType {
  name: "error";
  text: string;
}

interface ICalendarType {
  name: "calendar";
  showTime: boolean;
  timeStep: number | null;
}

interface IStaticTextType {
  name: "static_text";
}

interface IStaticImageType {
  name: "static_image";
}

export type IType =
  ITextType
  | ITextAreaType
  | ICodeEditorType
  | IMarkdownEditorType
  | ISelectType
  | IReferenceType
  | ICheckType
  | IUserViewType
  | IEmptyUserViewType
  | IErrorType
  | ICalendarType
  | IStaticTextType
  | IStaticImageType
  | IQRCodeType
  | IBarCodeType;

const staging = namespace("staging");

const heightExclusions = ["select", "reference"];
const multilineTypes = ["markdown", "codeeditor", "textarea", "userview", "empty_userview", "static_image"];

@Component({
  components: {
    CodeEditor: () => import("@/components/editors/CodeEditor.vue"),
    MarkdownEditor: () => import("@/components/editors/MarkdownEditor.vue"),
    ValueSelect: () => import("@/components/ValueSelect.vue"),
    Calendar: () => import("@/components/Calendar.vue"),
    ReferenceField: () => import("@/components/ReferenceField.vue"),
    InputSlot: () => import("@/components/form/InputSlot.vue"),
    Input: () => import("@/components/form/Input.vue"),
    Textarea: () => import("@/components/form/Textarea.vue"),
    NestedUserView: () => import("@/components/NestedUserView.vue"),
    NestedUserViewPanel: () => import("@/components/panels/NestedUserViewPanel.vue"),
    QRCode: () => import("@/components/qrcode/QRCode.vue"),
    BarCode: () => import("@/components/barcode/BarCode.vue"),
    BarCodePrint: () => import("@/components/barcode/BarCodePrint.vue"),
  },
})
export default class FormControl extends Vue {
  @Prop({ type: Object, required: true }) type!: ValueType; // this.uv.info.columns[x].valueType
  @Prop({ type: Object, required: true }) value!: ICombinedValue; // this.local.getValueByRef, or other value
  @Prop({ type: Object, default: () => ({}) }) attributes!: AttributesMap; // {...this.uv.attributes, ...this.uv.columnAttributes[x], ...row.attributes, ...value.attributes}
  @Prop({ type: Boolean, default: false }) locked!: boolean;
  @Prop({ type: Object, required: true }) uvArgs!: IUserViewArguments; // this.uv.args
  @Prop({ type: String, default: "" }) caption!: string;
  @Prop({ type: Boolean, default: false }) forceCaption!: boolean;
  @Prop({ type: Boolean, default: false }) disableColor!: boolean;
  @Prop({ type: String, required: true }) scope!: string; // this.scope
  @Prop({ type: Number, required: true }) level!: number; // this.level
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;
  // Whether to only use modal, if applicable.
  @Prop({ type: Boolean, default: false }) modalOnly!: boolean;
  // Is this FormControl used from a Table.
  // FIXME: maybe we can get rid of this?
  @Prop({ type: Boolean, default: false }) isCellEdit!: boolean;
  @Prop({ type: Boolean, default: false }) forceModalOnMobile!: boolean;

  private actions: Action[] = [];
  private panelButtons: PanelButton[] = [];
  private codeEditorKey = 0;
  private filterString = "";
  private title = "";
  private enableFilter = false;

  get isNullable() {
    return this.value.info === undefined || this.value.info.field === null ? true : this.value.info.field.isNullable;
  }

  // Current value, can be a raw value (e.g., a string for a `datetime` value) or a validated value.
  get currentValue() {
    return currentValue(this.value);
  }

  get currentValueIsNull() {
    return valueIsNull(this.currentValue);
  }

  get isAwaited() {
    // We use `value.value` here to highlight unvalidated values.
    return !this.isNullable && valueIsNull(this.value.value);
  }

  get isDisabled() {
    return this.locked || this.value.info === undefined || this.value.info.field === null;
  }

  // Textual representation of `currentValue`.
  get textValue() {
    return valueToText(this.type, this.currentValue);
  }

  get isMultiline() {
    return multilineTypes.includes(this.inputType.name);
  }

  // Priority of captions:
  // 1. "caption", if caption is forced;
  // 2. "title", if there is a title or we show static content. The latter has "no title", because most likely
  //    a user doesn't want to have a caption for these.
  // 3. "caption".
  get usedCaption(): string {
    if (this.forceCaption) {
      return this.caption;
    } else if (this.inputType.name === "static_text" || this.inputType.name === "static_image" || this.title !== "") {
      return this.title;
    } else {
      return this.caption;
    }
  }

  get controlPanelStyle() {
    if (this.customHeight === null) {
      return {};
    }

    const excludeHeight = heightExclusions.includes(this.inputType.name);
    const isHeightOnPanel = !this.isMultiline;
    const height = isHeightOnPanel ? { height: `${this.customHeight}px` } : {};
    return !excludeHeight ? { ...height, maxHeight: "initial" } : {};
  }

  private updateTitle(title: string | null) {
    this.title = title ?? this.caption;
  }

  private setInputHeight(value: number) {
    this.$emit("set-input-height", value);
  }

  private barCodeScanned(code: string) {
    this.updateValue(code);
    this.$emit("close-modal-input");
  }

  get isQRCodeInput() {
    return "qrcode_input" in this.attributes ? this.attributes["qrcode_input"] : false;
  }

  get textAlign() {
    if ("text_align" in this.attributes) {
      return String(this.attributes["text_align"]);
    } else if (this.inputType.name === "text" && this.inputType.type === "number") {
      return "right";
    } else {
      return "left";
    }
  }

  get cellColor() {
    return "cell_color" in this.attributes ? String(this.attributes["cell_color"]) : null;
  }

  get customHeight() {
    const heightAttr = Number(this.attributes["control_height"]);
    return Number.isNaN(heightAttr) ? null : heightAttr;
  }

  get textType() {
    return String(this.attributes["text_type"]);
  }

  private controlStyle(defaultHeight?: string): Record<string, unknown> {
    const height = this.customHeight !== null ? `${this.customHeight}px` : defaultHeight;
    return { height };
  }

  get fieldType() {
    return this.value.info?.field?.fieldType || null;
  }

  get inputType(): IType {
    const home = homeSchema(this.uvArgs);
    const linkOpts = home !== null ? { homeSchema: home } : undefined;

    const controlAttr = String(this.attributes["control"]);
    if (controlAttr === "user_view") {
      if (this.currentValue === null || this.currentValue === undefined) {
        return { name: "empty_userview", text: this.$t("data_will_load_after_save").toString() };
      }

      const nestedRef = attrToQuerySelf(this.currentValue, this.value.info, linkOpts);

      if (nestedRef === null) {
        return { name: "error", text: this.$t("invalid_uv").toString() };
      } else {
        return { name: "userview", ...nestedRef };
      }
    } else if (controlAttr === "static_text") {
      return { name: "static_text" };
    } else if (controlAttr === "static_image") {
      return { name: "static_image" };
    }
    // `calc` is needed because sizes should be relative to base font size.
    const heightMultilineText = "calc(4em + 12px)";
    const heightCodeEditor = "200px";

    // FIXME: return proper type from backend instead.
    if (this.value.info?.fieldRef.name === "id") {
      if (controlAttr === "qrcode") {
        return { name: "qrcode", ref: this.value.info.fieldRef.entity };
      }

      if (controlAttr === "barcode") {
        return { name: "barcode" };
      }
    }

    const booleanOptions = [{ label: this.$t("yes").toString(), value: true }, { label: this.$t("no").toString(), value: false }];
    const booleanNullableOptions = [...booleanOptions, { label: this.$t("boolean_null").toString(), value: null }];

    if (this.fieldType !== null) {
      switch (this.fieldType.type) {
        case "reference": {
          if (controlAttr === "qrcode") {
            return { name: "qrcode", ref: referenceEntriesRef(this.fieldType).entity };
          }

          if (controlAttr === "barcode") {
            return { name: "barcode" };
          }

          const refEntry: IReferenceType = {
            name: "reference",
            ref: referenceEntriesRef(this.fieldType),
            selectViews: [],
          };
          refEntry.linkAttr = this.attributes["link"];
          refEntry.style = this.controlStyle();

          const selectView = attrToQuerySelf(this.attributes["select_view"], this.value.info, linkOpts);
          if (selectView !== null) {
            refEntry.selectViews.push({
              name: this.$t("select_view").toString(),
              query: selectView,
            });
          }
          const extraActions = this.attributes["extra_select_views"];
          if (Array.isArray(extraActions)) {
            extraActions.forEach(action => {
              if (typeof action === "object" && action.name) {
                const querySelf = attrToQuerySelf(action, this.value.info, linkOpts);
                if (querySelf) {
                  refEntry.selectViews.push({
                    name: String(action.name),
                    query: querySelf,
                  });
                }
              }
            });
          }
          return refEntry;
        }
        case "enum":
          return {
            name: "select",
            options: this.fieldType.values.map(x => ({ label: x, value: x })),
          };
        case "bool":
          return {
            name: "select",
            options: this.isNullable ? booleanNullableOptions : booleanOptions,
          };
        case "int":
          return { name: "text", type: "number", style: this.controlStyle() };
        // FIXME: Fix calendar field.
        case "date":
          return { name: "calendar", showTime: false, timeStep: null };
        case "datetime": {
          const timeStep = Number(this.attributes["time_step"]);
          return { name: "calendar", showTime: true, timeStep: Number.isNaN(timeStep) ? null : timeStep };
        }
        case "json":
          return {
            name: "codeeditor",
            language: "json",
            style: this.controlStyle(heightCodeEditor),
          };
      }
    } else {
      switch (this.type.type) {
        case "bool":
          return {
            name: "select",
            options: this.isNullable ? booleanNullableOptions : booleanOptions,
          };
        case "int":
          return { name: "text", type: "number", style: this.controlStyle() };
        case "date":
          return { name: "calendar", showTime: false, timeStep: null };
        case "datetime": {
          const timeStep = Number(this.attributes["time_step"]);
          return { name: "calendar", showTime: true, timeStep: Number.isNaN(timeStep) ? null : timeStep };
        }
        case "json":
          return {
            name: "codeeditor",
            language: "json",
            style: this.controlStyle(heightCodeEditor),
          };
      }
    }

    // Plain text
    switch (this.textType) {
      case "multiline":
        return { name: "textarea", style: this.controlStyle(heightMultilineText) };
      case "codeeditor":
        return {
          name: "codeeditor",
          language: String(this.attributes["language"] || "sql"),
          style: this.controlStyle(heightCodeEditor),
        };
      case "markdown":
        return {
          name: "markdown",
          editType: "markdown",
          style: this.controlStyle(heightMultilineText),
        };
      case "wysiwyg":
        return {
          name: "markdown",
          editType: "wysiwyg",
          style: this.controlStyle(heightMultilineText),
        };
      default:
        return { name: "text", type: "text", style: this.controlStyle() };
    }
  }

  @Watch("inputType.name")
  private watchInputType() {
    // These state values are essentially "backward props", that is, are supposed to be set by child components
    // via `update:` events. This creates a problem: when do we clean these state values? For example, when
    // switched from "user_view" to "text" component type, we can't expect `update:actions` event that will
    // clear `actions`, as the new component is not aware of actions at all.
    //
    // To address this, we assume that every single component is capable of correctly reacting to update of its props
    // and issues `update:` events as needed. Therefore we only need to focus on switches between components.
    // If we detect a switch we clear all state values and expect the new component to emit `update:` events for
    // values it actually supports.

    this.actions = [];
    this.panelButtons = [];
    this.title = "";
    this.filterString = "";
    this.enableFilter = false;
  }

  private mounted() {
    if (this.autofocus) {
      const type = this.inputType;
      const control = this.$refs["control"];
      if (control) {
        if (type.name === "text") {
          (control as HTMLElement).focus();
        } else if (type.name === "textarea") {
          (control as HTMLElement).focus();
        } else if (type.name === "check") {
          (control as HTMLElement).focus();
        }
      }
    }
  }

  private updateValue(newValue: unknown) {
    if (this.currentValue !== newValue) {
      this.$emit("update", newValue);
    }
  }
}
</script>

<style lang="scss" scoped>
  /* Current Z layout:

  * Drop-down menu    (1200)
  * FormControl       (1000)

  */

  .fullscreen_button {
    background: none;
    border: none;
    cursor: pointer;
    float: right;
    color: var(--MainTextColor);
  }

  .input_label__container {
    padding: 0;
    display: flex;
    height: 2em;
  }

  .input_label {
    align-self: center;
    margin-bottom: 3px;
    margin-right: 5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: pre;
    cursor: question;
    color: var(--MainTextColor);
    font-weight: 600;
    font-size: 1.25em;
  }

  .input_label_single {
    align-self: center;
    margin-bottom: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: pre;
    cursor: question;
    width: 100%;
    opacity: 0.7;
    color: var(--MainTextColorLight);
  }

  .empty_userview_text {
    opacity: 0.7;
    color: var(--MainTextColorLight);
  }

  .actions-menu {
    width: max-content;
    display: inline-block;
  }

  .actions-menu_actions-button {
    border: 0 !important;
    line-height: normal;
    padding: 2px;
    padding-left: 1px;
    height: 100%;
    text-align: left;
    border-radius: 0 !important;
  }

  .nested-menu {
    height: 30px;
    margin-top: 5px;
    display: flex;
    align-items: center;
    color: var(--MainTextColor) !important;

    .input_label {
      margin-right: auto;

      &:focus {
        outline: none;
      }
    }

    > .actions-menu {
      width: max-content;
      display: inline-block;
    }

    ::v-deep .actions-menu_actions-button {
      border: 0 !important;
      line-height: normal;
      padding: 2px;
      height: 100%;
      width: auto;
      text-align: left;
      border-radius: 0 !important;
      margin-right: 0;
    }
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
    padding: 0.375rem 0.75rem;
    height: calc(1.5em + 0.75rem + 2px);
  }

  .form-control-panel_checkbox {
    border-color: var(--NavigationBackColor);
  }

  .form-control-panel_textarea {
    border-color: var(--NavigationBackColor);
    width: 100%;
    overflow-y: hidden !important;
    overflow-x: hidden !important;
    word-wrap: unset !important;
    padding: 0.375rem 0.75rem;
    resize: none;
    vertical-align: top;
  }

  .multilines {
    overflow-y: auto !important;
  }

  .singleline {
    overflow-x: auto !important;
    max-height: 40px;
  }

  .form-control-panel_select,
  .form-control-panel_checkbox,
  .form-control-panel_textarea {
    border-radius: 0;
    box-shadow: none;
    -webkit-appearance: none;
    background: white;
  }

  .form-control-panel_select_req,
  .form-control-panel_checkbox_req,
  .form-control-panel_textarea_req {
    background-color: var(--WarningColor);
  }

  .form-control-panel_select_error,
  .form-control-panel_checkbox_error,
  .form-control-panel_textarea_error {
    background-color: var(--FailColor) !important;
  }

  .form-control-panel_select:focus,
  .form-control-panel_checkbox:focus,
  .form-control-panel_textarea:focus {
    border-color: var(--NavigationBackColor);
    box-shadow: 0 0 0 white;
  }

  .form-control-panel_select:disabled,
  .form-control-panel_checkbox:disabled,
  .form-control-panel_textarea:disabled {
    background-color: var(--ControlDisableColor);
  }

  @media screen and (max-aspect-ratio: 13/9) {
    @media screen and (max-device-width: 480px) {
      .form-control-panel-hidden {
        margin-top: 7px;
        position: sticky;
      }

      .nested-menu {
        z-index: 0; /* чтобы при нажатии на "действия" в подтаблице остальные аналогичные кнопки других подтаблиц были ниже темного блока */
        position: sticky;
      }

      ::v-deep .nested-menu > .actions-menu .div-with-actions {
        position: absolute !important;
        top: 35px;
        left: -30px;
      }

      .nested-menu:hover {
        z-index: 1200; /* меню действий для подтаблиц поверх темного фона */
      }

      .form-control-panel_select,
      .form-control-panel_checkbox,
      .form-control-panel_textarea {
        position: -webkit-sticky;
        position: sticky;
        left: 1px;
        display: block;
      }

      td > .form-control-panel > .form-control-panel_textarea {
        width: 100%;
      }

      td > div.form-control-panel > pre {
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

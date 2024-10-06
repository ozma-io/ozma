<i18n>
    {
        "en": {
            "yes": "Yes",
            "no": "No",
            "boolean_null": "Empty",
            "invalid_uv": "Nested user view rows should be JSON objects with 'ref' and 'args' defined",
            "iframe_no_markup": "Iframe requires `iframe_markup`, `iframe_src` or `iframe_srcdoc` attribute",
            "data_will_load_after_save": "Data will load after save",
            "select_view": "Add in modal window"
        },
        "ru": {
            "yes": "Да",
            "no": "Нет",
            "boolean_null": "Пусто",
            "invalid_uv": "Столбцы со вложенными представлениями должны быть JSON-объектами с заданными полями 'ref' и 'args'",
            "iframe_no_markup": "Для Iframe необходим атрибут `iframe_markup`, `iframe_src` или `iframe_srcdoc`",
            "data_will_load_after_save": "Данные загрузятся после сохранения",
            "select_view": "Создать во вложенном окне"
        },
        "es": {
            "yes": "Sí",
            "no": "No",
            "boolean_null": "Vacio",
            "invalid_uv": "Las filas de vista de usuario añadidas deben ser objetos JSON con `ref`` y `args` definidos",
            "iframe_no_markup": "Iframe requiere el atributo `iframe_markup`, `iframe_src` o `iframe_srcdoc`",
            "data_will_load_after_save": "Los datos se cargarán después de guardar",
            "select_view": "Añadir la  ventana modal"
        }
    }
</i18n>

<template>
  <div style="width: 100%">
    <InputSlot
      v-if="
        inputType.name !== 'user_view' && inputType.name !== 'empty_user_view'
      "
      :modal-only="modalOnly"
      :is-cell-edit="isCellEdit"
      :label="usedCaption"
      :background-color="cellColor"
      :color-variant-attribute="colorVariantAttribute"
      :text-align="textAlign"
      :modal="$isMobile && (forceModalOnMobile || isMultiline)"
      :required="!isNullable"
      :disabled="isDisabled"
      :hide-required-and-disabled-icons="hideRequiredAndDisabledIcons"
      :empty="valueIsNull"
      @close-modal-input="$emit('close-modal-input')"
      @focus="onFocus"
    >
      <template #default="iSlot">
        <Errorbox v-if="inputType.name === 'error'" :message="inputType.text" />
        <Input
          v-else-if="inputType.name === 'text'"
          :value="textValue"
          :qrcode-input="isQRCodeInput"
          :is-cell-edit="isCellEdit"
          :disabled="isDisabled"
          :required="!isNullable"
          :autofocus="autofocus || iSlot.autofocus"
          :text-align="textAlign"
          :background-color="cellColor"
          @input="updateValue"
          @focus="iSlot.onFocus"
          @blur="iSlot.onBlur"
          @enter-pressed="$emit('close-modal-input', $event)"
          @tab-pressed="$emit('close-modal-input', $event)"
        />
        <Textarea
          v-else-if="inputType.name === 'textarea'"
          :value="value"
          :is-cell-edit="isCellEdit"
          :disabled="isDisabled"
          :height="customHeight"
          :required="!isNullable"
          :autofocus="autofocus || iSlot.autofocus"
          :text-align="textAlign"
          :background-color="cellColor"
          @update:value="updateValue"
          @focus="iSlot.onFocus"
          @blur="iSlot.onBlur"
        />
        <Input
          v-else-if="inputType.name === 'array'"
          :value="textValue"
          :is-cell-edit="isCellEdit"
          :disabled="isDisabled"
          :required="!isNullable"
          :autofocus="autofocus || iSlot.autofocus"
          :background-color="cellColor"
          @input="updateValue"
          @focus="iSlot.onFocus"
          @blur="iSlot.onBlur"
          @enter-pressed="$emit('close-modal-input', $event)"
          @tab-pressed="$emit('close-modal-input', $event)"
        />
        <Calendar
          v-else-if="inputType.name === 'calendar'"
          ref="control"
          :value="value"
          :autofocus="autofocus || iSlot.autofocus"
          :is-cell-edit="isCellEdit"
          :show-time="inputType.showTime"
          :time-step="inputType.timeStep ? inputType.timeStep : undefined"
          :time-default="
            inputType.timeDefault ? inputType.timeDefault : undefined
          "
          :format="inputType.format ? inputType.format : undefined"
          :required="!isNullable"
          :disabled="isDisabled"
          :background-color="cellColor"
          @focus="iSlot.onFocus"
          @blur="iSlot.onBlur"
          @enter-pressed="$emit('close-modal-input', $event)"
          @tab-pressed="$emit('close-modal-input', $event)"
          @update:value="updateValue"
        />
        <ValueSelect
          v-else-if="inputType.name === 'select'"
          ref="control"
          :single="inputType.single"
          :value="value"
          :label="usedCaption"
          :options="inputType.options"
          :height="customHeight"
          :autofocus="autofocus || iSlot.autofocus"
          :required="!isNullable"
          :disabled="isDisabled"
          :is-cell-edit="isCellEdit"
          :background-color="cellColor"
          :option-color-variant-attribute="optionColorVariantAttribute"
          @update:value="updateValue"
          @focus="iSlot.onFocus"
          @blur="iSlot.onBlur"
        />
        <ArrayReferenceField
          v-else-if="inputType.name === 'array_select'"
          ref="control"
          :value="value"
          :label="usedCaption"
          :options-view="inputType.optionsView"
          :reference-entity="inputType.entity"
          :height="customHeight"
          :autofocus="autofocus || iSlot.autofocus"
          :required="!isNullable"
          :disabled="isDisabled"
          :background-color="cellColor"
          :home-schema="homeSchema"
          :compact-mode="compactMode"
          :option-color-variant-attribute="optionColorVariantAttribute"
          @update:value="updateValue"
          @popup-opened="iSlot.onFocus"
          @popup-closed="iSlot.onBlur"
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
          @focus="iSlot.onFocus"
          @blur="iSlot.onBlur"
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
          @focus="iSlot.onFocus"
          @blur="iSlot.onBlur"
        />
        <input
          v-else-if="inputType.name === 'check'"
          ref="control"
          type="checkbox"
          :value="value"
          :autofocus="autofocus || iSlot.autofocus"
          :class="[
            'form-control-panel_checkbox',
            { 'form-control-panel_checkbox_req': isAwaited && !disableColor },
          ]"
          :disabled="isDisabled"
          :required="!isNullable"
          @input="updateValue($event.target.value)"
          @focus="iSlot.onFocus"
          @blur="iSlot.onBlur"
        />
        <QRCode
          v-else-if="inputType.name === 'qrcode'"
          :id="typeof value === 'number' ? value : undefined"
          :entity="inputType.ref"
          :height="customHeight"
        />
        <BarCodePrint
          v-else-if="inputType.name === 'barcode'"
          ref="control"
          :content="textValue"
          :format="inputType.format"
        />
        <ButtonsPanel
          v-else-if="inputType.name === 'buttons'"
          :buttons="inputType.buttons"
          @goto="$emit('goto', $event)"
        />
        <IframeControl
          v-else-if="inputType.name === 'iframe'"
          :iframe-ref="inputType.ref"
          :src="inputType.src"
          :srcdoc="inputType.srcdoc"
          :value="value"
          :height="customHeight"
          @update:value="updateValue($event)"
          @goto="$emit('goto', $event)"
        />
        <div v-else-if="inputType.name === 'static_text'">
          {{ textValue }}
        </div>
        <img v-else-if="inputType.name === 'static_image'" :src="textValue" />
        <ReferenceField
          v-else-if="inputType.name === 'reference'"
          ref="control"
          :is-cell-edit="isCellEdit"
          :value="value"
          :pun="pun"
          :referencing-field="fieldRef"
          :referencing-row-id="rowId"
          :label="usedCaption"
          :select-views="inputType.selectViews"
          :height="customHeight"
          :reference-entity="fieldType.entity"
          :options-view="inputType.optionsView"
          :link-attr="inputType.linkAttr"
          :home-schema="homeSchema"
          :autofocus="autofocus || iSlot.autofocus"
          :nullable="isNullable"
          :disabled="isDisabled"
          :background-color="cellColor"
          :qrcode-input="isQRCodeInput"
          :scope="scope"
          :compact-mode="compactMode"
          :option-color-variant-attribute="optionColorVariantAttribute"
          @update:actions="actions = $event"
          @update:buttons="buttons = $event"
          @popup-opened="iSlot.onFocus"
          @popup-closed="iSlot.onBlur"
          @update:value="updateValue($event)"
          @goto="$emit('goto', $event)"
        />
      </template>
    </InputSlot>
    <div v-else :class="['nested-userview', { mobile: $isMobile }]">
      <div v-if="inputType.name == 'empty_user_view'">
        <div class="nested-menu">
          <!-- `tabindex` is required for closing tooltip on blur -->
          <label
            v-b-tooltip.click.blur.bottom.noninteractive
            tabindex="0"
            class="input_label not-loaded"
            :title="$ustOrEmpty(usedCaption)"
          >
            {{ $ustOrEmpty(usedCaption) }}
          </label>
        </div>
        <div class="empty_userview_text">
          {{ $t('data_will_load_after_save') }}
        </div>
      </div>
      <HeaderPanel
        v-else-if="inputType.name === 'user_view'"
        type="component"
        :title="usedCaption"
        :buttons="buttons"
        :is-enable-filter="enableFilter"
        :view="inputType"
        :filter-string="filterString"
        :is-loading="isUserViewLoading"
        :argument-editor-props="argumentEditorProps"
        @update:filter-string="filterString = $event"
        @goto="$emit('goto', $event)"
      />
      <div
        v-if="inputType.name === 'user_view'"
        :style="{ backgroundColor: cellColor, height: `${customHeight}px` }"
      >
        <NestedUserView
          ref="control"
          :args="inputType.args"
          :default-values="inputType.defaultValues"
          :scope="scope"
          :level="level + 1"
          :filter-string="filterString"
          :in-container="customHeight !== null"
          :argumentEditorProps="argumentEditorProps"
          @update:buttons="buttons = $event"
          @update:enable-filter="enableFilter = $event"
          @update:is-loading="isUserViewLoading = $event"
          @update:title="title = $event"
          @goto="$emit('goto', $event)"
          @update:argument-editor-props="argumentEditorProps = $event"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator'
import type {
  AttributesMap,
  FieldType,
  IFieldRef,
  RowId,
  ValueType,
} from '@ozma-io/ozmadb-js/client'
import { z } from 'zod'
import { namespace } from 'vuex-class'

import { IEntityRef } from '@ozma-io/ozmadb-js/client'
import { valueIsNull, valueToText } from '@/values'
import { IQuery, attrToQuerySelf, attrObjectToQuery } from '@/state/query'
import { ISelectOption } from '@/components/multiselect/MultiSelect.vue'
import { AutoSaveLock } from '@/state/staging_changes'

import { colorVariantFromAttribute } from '@/utils_colors'
import type { ColorVariantAttribute } from '@/utils_colors'
import type { Button } from '@/components/buttons/buttons'
import { attrToButtons } from '@/components/buttons/buttons'
import FormInputPlaceholder from '@/components/FormInputPlaceholder.vue'
import type { MarkdownEditType } from '@/components/editors/MarkdownEditor.vue'
import { IReferenceSelectAction } from '@/components/ReferenceMultiSelect.vue'
import { EntityRef } from '@/links'
import { IIframeRef } from '@/api'
import { ITime } from '@/components/Calendar.vue'
import type { ConvertedBoundAttributesMap } from '@/user_views/combined'
import { formatRawValue } from '@/user_views/format'
import { UserString, isOptionalUserString } from '@/state/translations'
import { IArgumentEditorProps } from './ArgumentEditor.vue'

interface ITextType {
  name: 'text'
  type: 'text' | 'number'
  style: Record<string, unknown>
}

interface ITextAreaType {
  name: 'textarea'
  style: Record<string, unknown>
}

interface ICodeEditorType {
  name: 'codeeditor'
  language: string
  style: Record<string, unknown>
}

interface IQRCodeType {
  name: 'qrcode'
  ref: IEntityRef
}

interface IBarCodeType {
  name: 'barcode'
  format?: string
}

type IIframeType =
  | {
      name: 'iframe'
      src: string
    }
  | {
      name: 'iframe'
      srcdoc: string
    }
  | {
      name: 'iframe'
      ref: IIframeRef
    }

interface IMarkdownEditorType {
  name: 'markdown'
  editType: MarkdownEditType
  style: Record<string, unknown>
}

interface ISelectType {
  name: 'select'
  options: ISelectOption<unknown>[]
  single: boolean
}

interface IArrayType {
  name: 'array'
}

interface IArrayReferenceFieldType {
  name: 'array_select'
  optionsView: IQuery | null
  entity: IEntityRef
}

interface IReferenceType {
  name: 'reference'
  optionsView: IQuery | null
  linkAttr?: unknown
  selectViews: IReferenceSelectAction[]
  style?: Record<string, unknown>
}

interface ICheckType {
  name: 'check'
}

export interface IUserViewType extends IQuery {
  name: 'user_view'
}

interface IEmptyUserViewType {
  name: 'empty_user_view'
}

interface IErrorType {
  name: 'error'
  text: string
}

interface ICalendarType {
  name: 'calendar'
  showTime: boolean
  timeStep: number | null
  timeDefault: ITime | null
  format: string | null
}

interface IStaticTextType {
  name: 'static_text'
}

interface IStaticImageType {
  name: 'static_image'
}

interface IButtonsType {
  name: 'buttons'
  buttons: Button[]
}

const staging = namespace('staging')

export type IType =
  | ITextType
  | ITextAreaType
  | IArrayType
  | ICodeEditorType
  | IMarkdownEditorType
  | ISelectType
  | IArrayReferenceFieldType
  | IReferenceType
  | ICheckType
  | IUserViewType
  | IEmptyUserViewType
  | IErrorType
  | ICalendarType
  | IStaticTextType
  | IStaticImageType
  | IQRCodeType
  | IIframeType
  | IBarCodeType
  | IButtonsType

const multilineTypes: Set<IType['name']> = new Set([
  'markdown',
  'codeeditor',
  'textarea',
  'user_view',
  'empty_user_view',
  'static_image',
  'iframe',
])
const closeAfterUpdateTypes: Set<IType['name']> = new Set([
  'select',
  'reference',
])
const hideRequiredAndDisabledIconsTypes: Set<IType['name']> = new Set([
  'buttons',
  'user_view',
  'iframe',
])

const parseTime = (raw: string): ITime | null => {
  const [_, hours, mins] =
    /^([0-9]|0[0-9]|1[0-9]|2[0-3]):([0-9]|[0-5][0-9])$/.exec(raw) ?? []
  return hours !== undefined && mins !== undefined
    ? {
        hour: Number(hours),
        min: Number(mins),
      }
    : null
}

export const entityRefSchema = z.object({
  schema: z.string(),
  name: z.string(),
})

// Must be the same as `IEntityRef`!
// We can force it with TypeScript magic but it's very cumbersome and unnecessary.
type IEntityRefSchema = z.infer<typeof entityRefSchema>

@Component({
  // Looks ugly and wordy, but due to `import` this can not be generated.
  // `as any` due to weird typing, see https://github.com/vuejs/vue-class-component/issues/323
  components: {
    CodeEditor: () => ({
      component: import('@/components/editors/CodeEditor.vue') as any,
      loading: FormInputPlaceholder,
    }),
    MarkdownEditor: () => ({
      component: import('@/components/editors/MarkdownEditor.vue') as any,
      loading: FormInputPlaceholder,
    }),
    ValueSelect: () => ({
      component: import('@/components/ValueSelect.vue') as any,
      loading: FormInputPlaceholder,
    }),
    ArrayReferenceField: () => ({
      component: import('@/components/ArrayReferenceField.vue') as any,
      loading: FormInputPlaceholder,
    }),
    Calendar: () => ({
      component: import('@/components/Calendar.vue') as any,
      loading: FormInputPlaceholder,
    }),
    ReferenceField: () => ({
      component: import('@/components/ReferenceField.vue') as any,
      loading: FormInputPlaceholder,
    }),
    InputSlot: () => ({
      component: import('@/components/form/InputSlot.vue') as any,
      // InputSlot require different placeholder, otherwise it looks bad, but I don't want to clutter it.
    }),
    Input: () => ({
      component: import('@/components/form/Input.vue') as any,
      loading: FormInputPlaceholder,
    }),
    Textarea: () => ({
      component: import('@/components/form/Textarea.vue') as any,
      loading: FormInputPlaceholder,
    }),
    NestedUserView: () => ({
      component: import('@/components/NestedUserView.vue') as any,
      loading: FormInputPlaceholder,
    }),
    HeaderPanel: () => ({
      component: import('@/components/panels/HeaderPanel.vue') as any,
      loading: FormInputPlaceholder,
    }),
    QRCode: () => ({
      component: import('@/components/qrcode/QRCode.vue') as any,
      loading: FormInputPlaceholder,
    }),
    BarCode: () => ({
      component: import('@/components/barcode/BarCode.vue') as any,
      loading: FormInputPlaceholder,
    }),
    BarCodePrint: () => ({
      component: import('@/components/barcode/BarCodePrint.vue') as any,
      loading: FormInputPlaceholder,
    }),
    IframeControl: () => ({
      component: import('@/components/IframeControl.vue') as any,
      loading: FormInputPlaceholder,
    }),
    Errorbox: () => ({
      component: import('@/components/Errorbox.vue') as any,
      loading: FormInputPlaceholder,
    }),
  },
})
export default class FormControl extends Vue {
  @staging.Action('addAutoSaveLock')
  addAutoSaveLock!: () => Promise<AutoSaveLock>
  @staging.Action('removeAutoSaveLock') removeAutoSaveLock!: (
    id: AutoSaveLock,
  ) => Promise<void>

  @Prop({ type: Object, required: true }) type!: ValueType // this.uv.info.columns[x].valueType
  @Prop() value!: unknown
  @Prop({ type: String }) pun!: string | undefined
  @Prop({ type: Boolean, default: false }) isNullable!: boolean
  @Prop({ type: Object }) fieldRef!: IFieldRef | undefined
  @Prop({ type: Object }) fieldType!: FieldType | undefined
  @Prop({ type: Number }) rowId!: RowId | undefined
  @Prop({ type: Object, default: () => ({}) }) attributes!: AttributesMap // {...this.uv.attributes, ...row.attributes, ...this.uv.columnAttributes[x], ...value.attributes}
  @Prop({ type: Object, default: () => ({}) })
  attributeMappings!: ConvertedBoundAttributesMap
  @Prop({ type: Boolean, default: false }) locked!: boolean
  @Prop({ type: String }) homeSchema!: string | undefined
  @Prop({ validator: isOptionalUserString }) caption!: UserString | undefined
  @Prop({ type: Boolean, default: false }) forceCaption!: boolean
  @Prop({ type: Boolean, default: false }) compactMode!: boolean
  @Prop({ type: Boolean, default: false }) disableColor!: boolean
  @Prop({ type: String }) scope!: string | undefined // this.scope
  @Prop({ type: Number, required: true }) level!: number // this.level
  @Prop({ type: Boolean, default: false }) autofocus!: boolean
  // Whether to only use modal, if applicable.
  @Prop({ type: Boolean, default: false }) modalOnly!: boolean
  // Is this FormControl used from a Table.
  // FIXME: maybe we can get rid of this?
  @Prop({ type: Boolean, default: false }) isCellEdit!: boolean
  @Prop({ type: Boolean, default: false }) forceModalOnMobile!: boolean

  private buttons: Button[] = []
  private filterString = ''
  private title: UserString | null = null
  private enableFilter = false
  private isUserViewLoading = false
  private autoSaveLock: AutoSaveLock | null = null

  private argumentEditorProps: IArgumentEditorProps | null = null

  get valueIsNull() {
    return valueIsNull(this.value)
  }

  get isAwaited() {
    // We use `value.value` here to highlight unvalidated values.
    return !this.isNullable && valueIsNull(this.value)
  }

  get isDisabled() {
    const softDisabled = Boolean(this.attributes['soft_disabled'])
    return softDisabled || this.locked
  }

  get hideRequiredAndDisabledIcons() {
    return hideRequiredAndDisabledIconsTypes.has(this.inputType.name)
  }

  // Textual representation of `value`.
  get textValue() {
    // Don't format if a value is editable.
    if (!this.isDisabled) {
      return valueToText(this.type, this.value)
    } else {
      return formatRawValue(this.type, this.value, {
        getCellAttr: (name) => this.attributes[name],
        columnAttributeMappings: this.attributeMappings,
      })
    }
  }

  get isMultiline() {
    return multilineTypes.has(this.inputType.name)
  }

  // Priority of captions:
  // 1. "caption", if caption is forced;
  // 2. "title", if there is a title or we show static content. The latter has "no title", because most likely
  //    a user doesn't want to have a caption for these.
  // 3. "caption".
  get usedCaption(): UserString {
    if (this.forceCaption && this.caption) {
      return this.caption
    } else if (this.title) {
      return this.title
    } else if (
      !(
        this.inputType.name === 'buttons' ||
        this.inputType.name === 'static_text' ||
        this.inputType.name === 'static_image'
      ) &&
      this.caption
    ) {
      return this.caption
    } else {
      return ''
    }
  }

  get isQRCodeInput() {
    return Boolean(this.attributes['barcode_camera_input'])
  }

  get textAlign() {
    if ('text_align' in this.attributes) {
      return String(this.attributes['text_align'])
    } else if (
      this.inputType.name === 'text' &&
      this.inputType.type === 'number'
    ) {
      return 'right'
    } else {
      return 'left'
    }
  }

  get cellColor() {
    if (this.attributes['cell_color'])
      return String(this.attributes['cell_color'])
    else if (this.attributes['control'] === 'buttons') return 'transparent'
    else return null
  }

  private get colorVariantAttribute(): ColorVariantAttribute {
    if (this.attributes['cell_variant']) {
      return colorVariantFromAttribute(this.attributes['cell_variant'])
    } else if (this.cellColor) {
      return colorVariantFromAttribute({ background: this.cellColor })
    } else {
      return { type: 'existing', className: 'cell' }
    }
  }

  private get optionColorVariantAttribute(): ColorVariantAttribute {
    return colorVariantFromAttribute(this.attributes['option_variant'], {
      type: 'existing',
      className: 'option',
    })
  }

  get customHeight() {
    const heightAttr = Number(this.attributes['control_height'])
    return Number.isNaN(heightAttr) ? null : heightAttr
  }

  get textType() {
    return String(this.attributes['text_type'])
  }

  private controlStyle(defaultHeight?: string): Record<string, unknown> {
    const height =
      this.customHeight !== null ? `${this.customHeight}px` : defaultHeight
    return { height }
  }

  private getEnumOptions(values: string[]): ISelectOption<string>[] {
    const textMapping = this.attributeMappings['text']
    return values.map((x) => {
      let label = x
      if (textMapping) {
        const mappedLabel = textMapping.entries[x]
        if (mappedLabel) {
          label = String(mappedLabel)
        } else if (textMapping.default) {
          label = String(textMapping.default)
        }
      }
      return { label, value: x }
    })
  }

  get inputType(): IType {
    const linkOpts = this.homeSchema
      ? { homeSchema: this.homeSchema }
      : undefined

    const idInfo = this.rowId ? { id: this.rowId } : undefined

    const controlAttr = String(this.attributes['control'])
    if (controlAttr === 'user_view') {
      if (valueIsNull(this.value)) {
        return { name: 'empty_user_view' }
      }

      const nestedRef = attrToQuerySelf(this.value, idInfo, linkOpts)

      if (nestedRef === null) {
        return { name: 'error', text: this.$t('invalid_uv').toString() }
      } else {
        return { name: 'user_view', ...nestedRef }
      }
    } else if (controlAttr === 'static_text') {
      return { name: 'static_text' }
    } else if (controlAttr === 'static_image') {
      return { name: 'static_image' }
    } else if (controlAttr === 'buttons') {
      const buttons = attrToButtons(this.value)
      return { name: 'buttons', buttons }
    }
    // `calc` is needed because sizes should be relative to base font size.
    const heightMultilineText = 'calc(4em + 12px)'
    const heightCodeEditor = 'var(--table-cell-edit-height, 10rem)'

    // FIXME: return proper type from backend instead.
    if (this.fieldRef?.name === 'id') {
      if (controlAttr === 'qrcode') {
        return { name: 'qrcode', ref: this.fieldRef.entity }
      }

      if (controlAttr === 'barcode') {
        return {
          name: 'barcode',
          format: this.attributes['format']
            ? String(this.attributes['format'])
            : undefined,
        }
      }
    }

    if (controlAttr === 'iframe') {
      const markupRef = EntityRef.safeParse(this.attributes['iframe_markup'])
      const oldMarkupName = this.attributes['iframe_markup_name']
      const srcdoc = this.attributes['iframe_srcdoc']
      const src = this.attributes['iframe_src']
      if (markupRef.success) {
        return { name: 'iframe', ref: markupRef.data }
      } else if (typeof oldMarkupName === 'string') {
        console.error(
          'Attribute iframe_markup_name is deprecated, use iframe_markup',
        )
        return { name: 'iframe', ref: { schema: 'user', name: oldMarkupName } }
      } else if (typeof srcdoc === 'string') {
        return { name: 'iframe', srcdoc }
      } else if (typeof src === 'string') {
        return { name: 'iframe', src }
      } else {
        return { name: 'error', text: this.$t('iframe_no_markup').toString() }
      }
    }

    const booleanOptions = [
      { label: this.$t('yes').toString(), value: true },
      { label: this.$t('no').toString(), value: false },
    ]
    const booleanNullableOptions = [
      ...booleanOptions,
      { label: this.$t('boolean_null').toString(), value: null },
    ]

    if (this.fieldType) {
      switch (this.fieldType.type) {
        case 'array': {
          switch (this.fieldType.subtype.type) {
            case 'reference': {
              const optionsView = attrObjectToQuery(
                this.attributes['options_view'],
              )
              return {
                name: 'array_select',
                optionsView,
                entity: this.fieldType.subtype.entity,
              }
            }
            case 'enum': {
              const options = this.getEnumOptions(this.fieldType.subtype.values)
              return {
                name: 'select',
                single: false,
                options,
              }
            }
            default:
              return { name: 'array' }
          }
        }
        case 'reference': {
          if (controlAttr === 'qrcode') {
            return { name: 'qrcode', ref: this.fieldType.entity }
          }

          if (controlAttr === 'barcode') {
            return {
              name: 'barcode',
              format: this.attributes['format']
                ? String(this.attributes['format'])
                : undefined,
            }
          }

          // `constraint_view` and `entries_view` are deprecated and almost never used, delete it after some time.
          const optionsView =
            attrObjectToQuery(this.attributes['options_view']) ??
            attrObjectToQuery(this.attributes['entries_view']) ??
            attrObjectToQuery(this.attributes['constraint_view'])

          const refEntry: IReferenceType = {
            name: 'reference',
            optionsView,
            selectViews: [],
          }
          refEntry.linkAttr = this.attributes['link']
          refEntry.style = this.controlStyle()

          const selectView = attrToQuerySelf(
            this.attributes['select_view'],
            idInfo,
            linkOpts,
          )
          if (selectView !== null) {
            refEntry.selectViews.push({
              name: this.$t('select_view').toString(),
              query: selectView,
            })
          }
          const extraActions = this.attributes['extra_select_views']
          if (Array.isArray(extraActions)) {
            extraActions.forEach((action) => {
              if (typeof action === 'object' && action.name) {
                const querySelf = attrToQuerySelf(action, idInfo, linkOpts)
                if (querySelf) {
                  refEntry.selectViews.push({
                    name: String(action.name),
                    query: querySelf,
                  })
                }
              }
            })
          }
          return refEntry
        }
        case 'enum': {
          const options = this.getEnumOptions(this.fieldType.values)
          return {
            name: 'select',
            single: true,
            options,
          }
        }
        case 'bool':
          return {
            name: 'select',
            single: true,
            options: this.isNullable ? booleanNullableOptions : booleanOptions,
          }
        case 'int':
          return { name: 'text', type: 'number', style: this.controlStyle() }
        // FIXME: Fix calendar field.
        case 'date':
          return {
            name: 'calendar',
            showTime: false,
            timeStep: null,
            timeDefault: null,
            format: null,
          }
        case 'datetime': {
          const timeStepRaw = Number(this.attributes['time_step'])
          const timeStep = Number.isNaN(timeStepRaw) ? null : timeStepRaw
          const timeDefaultRaw = this.attributes['time_default']
          const timeDefault =
            typeof timeDefaultRaw === 'string'
              ? parseTime(timeDefaultRaw)
              : null
          const showSecondsRaw = this.attributes['show_seconds']
          const format = showSecondsRaw ? 'L LTS' : null
          return {
            name: 'calendar',
            showTime: true,
            timeStep,
            timeDefault,
            format,
          }
        }
        case 'json':
          return {
            name: 'codeeditor',
            language: 'json',
            style: this.controlStyle(heightCodeEditor),
          }
      }
    } else {
      switch (this.type.type) {
        case 'array':
          return {
            name: 'array',
          }
        case 'bool':
          return {
            name: 'select',
            options: this.isNullable ? booleanNullableOptions : booleanOptions,
            single: true,
          }
        case 'int':
        case 'decimal':
          return { name: 'text', type: 'number', style: this.controlStyle() }
        case 'date':
          return {
            name: 'calendar',
            showTime: false,
            timeStep: null,
            timeDefault: null,
            format: null,
          }
        case 'localdatetime':
        case 'datetime': {
          const timeStepRaw = Number(this.attributes['time_step'])
          const timeStep = Number.isNaN(timeStepRaw) ? null : timeStepRaw
          const timeDefaultRaw = this.attributes['time_default']
          const timeDefault =
            typeof timeDefaultRaw === 'string'
              ? parseTime(timeDefaultRaw)
              : null
          const showSecondsRaw = this.attributes['show_seconds']
          const format = showSecondsRaw ? 'L LTS' : null
          return {
            name: 'calendar',
            showTime: true,
            timeStep,
            timeDefault,
            format,
          }
        }
        case 'json':
          return {
            name: 'codeeditor',
            language: 'json',
            style: this.controlStyle(heightCodeEditor),
          }
      }
    }

    // Plain text
    switch (this.textType) {
      case 'multiline':
        return {
          name: 'textarea',
          style: this.controlStyle(heightMultilineText),
        }
      case 'codeeditor':
        return {
          name: 'codeeditor',
          language: String(this.attributes['language'] || 'sql'),
          style: this.controlStyle(heightCodeEditor),
        }
      case 'markdown':
      case 'wysiwyg':
        return {
          name: 'markdown',
          editType: this.textType,
          style: this.controlStyle(heightMultilineText),
        }
      default:
        return { name: 'text', type: 'text', style: this.controlStyle() }
    }
  }

  @Watch('inputType.name')
  private watchInputType(newName: string, oldName: string) {
    // These state values are essentially "backward props", that is, are supposed to be set by child components
    // via `update:` events. This creates a problem: when do we clean these state values? For example, when
    // switched from "user_view" to "text" component type, we can't expect `update:actions` event that will
    // clear `actions`, as the new component is not aware of actions at all.
    //
    // To address this, we assume that every single component is capable of correctly reacting to update of its props
    // and issues `update:` events as needed. Therefore we only need to focus on switches between components.
    // If we detect a switch we clear all state values and expect the new component to emit `update:` events for
    // values it actually supports.

    if (newName === oldName) return

    this.buttons = []
    this.title = ''
    this.filterString = ''
    this.enableFilter = false
    this.isUserViewLoading = false
  }

  private mounted() {
    if (this.autofocus) {
      const control = this.$refs['control'] as HTMLElement | undefined
      control?.focus?.()
    }
  }

  private updateValue(newValue: unknown) {
    if (this.value !== newValue) {
      this.$emit('update', newValue)
    }

    if (closeAfterUpdateTypes.has(this.inputType.name)) {
      this.$emit('close-modal-input')
    }
  }

  private removeAutoSaveLockFormControl() {
    if (this.autoSaveLock === null) return

    void this.removeAutoSaveLock(this.autoSaveLock)
    this.autoSaveLock = null
  }

  private async onFocus() {
    if (!this.isCellEdit) {
      this.$root.$emit('form-input-focused')
    }

    if (this.autoSaveLock === null) {
      const lock = await this.addAutoSaveLock()
      this.autoSaveLock = lock
    }

    this.$emit('focus')
  }

  private onBlur() {
    this.removeAutoSaveLockFormControl()
    this.$emit('blur')
  }

  protected beforeDestroy() {
    this.removeAutoSaveLockFormControl()
    this.$emit('blur')
  }
}
</script>

<style lang="scss" scoped>
.input_label__container {
  display: flex;
  padding: 0;
  height: 100%;
}

.input_label {
  align-self: center;
  margin-right: 5px;
  margin-bottom: 3px;
  overflow: hidden;
  color: var(--MainTextColor);
  font-weight: 600;
  font-weight: 600;
  font-size: 1rem;
  text-overflow: ellipsis;
  white-space: pre;

  &.not-loaded {
    margin-left: 0.5rem;
    color: var(--MainTextColorLight);
  }
}

.empty_userview_text {
  opacity: 0.7;
  margin: 0.5rem;
  border: 1px dashed var(--MainBorderColor);
  border-radius: 0.5rem;
  padding: 0.25rem 0.5rem;
  color: var(--MainTextColorLight);
}

.nested-userview {
  margin-bottom: 0.25rem;
  border-radius: 0.5rem;
  overflow: hidden;

  &:not(.mobile):not(:hover) ::v-deep {
    .header-panel .button-element,
    .button-container,
    .filters-button,
    .search-wrapper {
      opacity: 0.1;
    }
  }
}

.nested-menu {
  display: flex;
  align-items: center;
  margin-top: 5px;
  height: 30px;
  color: var(--MainTextColor) !important;

  .input_label {
    margin-right: auto;

    &:focus {
      outline: none;
    }
  }
}

.form-control-panel_checkbox {
  -webkit-appearance: none;
  box-shadow: none;
  border-color: var(--NavigationBackColor);
  border-radius: 0;
  background: white;
}

.form-control-panel_checkbox_req {
  background-color: var(--WarningColor);
}

.form-control-panel_checkbox_error {
  background-color: var(--FailColor) !important;
}

.form-control-panel_checkbox:focus {
  box-shadow: 0 0 0 white;
  border-color: var(--NavigationBackColor);
}

.form-control-panel_checkbox:disabled {
  background-color: var(--ControlDisableColor);
}

@media screen and (max-aspect-ratio: 13/9) {
  @media screen and (max-device-width: 480px) {
    .nested-menu {
      position: sticky;
      z-index: 0; /* чтобы при нажатии на "действия" в подтаблице остальные аналогичные кнопки других подтаблиц были ниже темного блока */
    }

    .nested-menu:hover {
      z-index: 1200; /* меню действий для подтаблиц поверх темного фона */
    }

    .form-control-panel_checkbox {
      display: block;
      position: -webkit-sticky;
      position: sticky;
      left: 1px;
    }

    td > div.form-control-panel > pre {
      min-width: 0 !important;
    }
  }
}

*:focus {
  box-shadow: none !important;
  border: 0 !important;
}

::v-deep .button-element > button {
  width: 100%;
}
</style>

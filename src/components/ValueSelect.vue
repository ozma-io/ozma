<i18n>
  {
    "en": {
      "error": "Error",
      "error_qrcode_is_inappropriate" : "QRCode is inappropriate"
    },
    "ru": {
      "error": "Ошибка",
      "error_qrcode_is_inappropriate" : "QRCode не соответствует назначению"
    },
    "es": {
      "error": "El error",
      "error_qrcode_is_inappropriate" : "El código QR es inapropiado"
    }
  }
</i18n>

<template>
  <MultiSelect
    :style="{ minWidth: isCellEdit ? '25rem' : undefined }"
    :value="selectedValue"
    :label="label"
    :options="options"
    :single="single"
    show-filter
    :required="required"
    :disabled="disabled"
    :height="height"
    :options-list-height="optionsListHeight"
    :autofocus="autofocus"
    :option-color-variant-attribute="optionColorVariantAttribute"
    @update:value="updateValue"
    @add-value="addValue"
    @remove-value="removeValue"
    @clear-values="clearValues"
    @popup-opened="$emit('focus')"
    @popup-closed="$emit('blur')"
  />
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'

import {
  ISelectOption,
  default as MultiSelect,
} from '@/components/multiselect/MultiSelect.vue'

import { valueIsNull } from '@/values'
import type { ColorVariantAttribute } from '@/utils_colors'
import { UserString, isOptionalUserString } from '@/state/translations'

@Component({
  components: {
    MultiSelect,
  },
})
export default class ValueSelect extends Vue {
  @Prop({ required: true }) value!: unknown[] | unknown | null
  @Prop({ type: Boolean, default: false }) single!: boolean
  @Prop({ type: Array, required: true }) options!: ISelectOption<unknown>[]
  @Prop({ type: Boolean, default: false }) required!: boolean
  @Prop({ type: Boolean, default: false }) disabled!: boolean
  @Prop({ type: Number }) height!: number | undefined
  @Prop({ type: Number }) optionsListHeight!: number | undefined
  @Prop({ type: Boolean, default: false }) autofocus!: boolean
  @Prop({ type: Boolean, default: false }) isCellEdit!: boolean
  @Prop({ validator: isOptionalUserString }) label!: UserString | undefined
  @Prop({ type: Object }) optionColorVariantAttribute!: ColorVariantAttribute

  private getValueIndex(value: unknown) {
    const idx = this.options.findIndex((opt) => opt.value === value)
    if (idx === -1) {
      throw new Error("Can't find selected option in options array")
    }
    return idx
  }

  get selectedValue() {
    if (this.single) {
      if (valueIsNull(this.value)) {
        return null
      } else {
        return this.getValueIndex(this.value)
      }
    } else {
      const values = this.value as unknown[] | null
      return values?.map((value) => this.getValueIndex(value)) ?? []
    }
  }

  private updateValue(index: number | null) {
    if (index === null) {
      this.$emit('update:value', null)
    } else {
      this.$emit('update:value', this.options[index].value)
    }
  }

  private addValue(index: number) {
    const value = this.options[index]
    if (valueIsNull(this.value)) {
      this.$emit('update:value', [value.value])
    } else {
      this.$emit('update:value', [...(this.value as unknown[]), value.value])
    }
  }

  private removeValue(index: number) {
    if (this.value === null) return

    const rawNewValue = (this.value as unknown[]).slice()
    rawNewValue.splice(index, 1)
    const newValue =
      rawNewValue.length === 0 && !this.required ? null : rawNewValue
    this.$emit('update:value', newValue)
  }

  private clearValues() {
    const newValue = !this.required ? null : []
    this.$emit('update:value', newValue)
  }
}
</script>

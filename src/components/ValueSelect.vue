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
import { Component, Prop, Vue, Watch } from 'vue-property-decorator'

import {
  ISelectOption,
  default as MultiSelect,
} from '@/components/multiselect/MultiSelect.vue'

import { valueIsNull } from '@/values'
import type { ColorVariantAttribute } from '@/utils_colors'
import { UserString, isOptionalUserString } from '@/state/translations'

// Sentinel: `undefined` means "no buffered change pending". `null`, arrays, and
// scalar values are all valid pending values that get emitted once on the next
// tick.
const NO_PENDING = undefined as unknown as undefined

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

  // Buffered next value. `undefined` is the sentinel meaning "no pending
  // change"; once a click is recorded we always store something concrete here
  // (an array, a scalar, or `null`).
  private pendingValue: unknown[] | unknown | null | undefined = NO_PENDING
  // Set to true while a `nextTick` callback is queued so synchronous-burst
  // clicks coalesce into a single emit.
  private flushScheduled = false

  @Watch('value')
  private onValuePropChanged() {
    // Parent confirmed the prop — discard any buffered state so the next user
    // action recomputes from the freshly-arrived prop, not from a stale buffer.
    this.pendingValue = NO_PENDING
  }

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

  private currentBase(): unknown {
    return this.pendingValue !== NO_PENDING ? this.pendingValue : this.value
  }

  private scheduleEmit() {
    if (this.flushScheduled) return
    this.flushScheduled = true
    void this.$nextTick(() => {
      this.flushScheduled = false
      if (this.pendingValue !== NO_PENDING) {
        this.$emit('update:value', this.pendingValue)
        // Note: we do NOT clear `pendingValue` here. The parent's prop update
        // will trigger `@Watch('value')` which clears it. Clearing it now
        // would re-introduce the race for any synchronous click that lands
        // between this emit and the parent's prop arrival.
      }
    })
  }

  private updateValue(index: number | null) {
    if (index === null) {
      this.pendingValue = null
    } else {
      this.pendingValue = this.options[index].value
    }
    this.scheduleEmit()
  }

  private addValue(index: number) {
    const value = this.options[index]
    const base = this.currentBase()
    if (valueIsNull(base)) {
      this.pendingValue = [value.value]
    } else {
      this.pendingValue = [...(base as unknown[]), value.value]
    }
    this.scheduleEmit()
  }

  private removeValue(index: number) {
    const base = this.currentBase()
    if (base === null) return

    const rawNewValue = (base as unknown[]).slice()
    rawNewValue.splice(index, 1)
    this.pendingValue =
      rawNewValue.length === 0 && !this.required ? null : rawNewValue
    this.scheduleEmit()
  }

  private clearValues() {
    this.pendingValue = !this.required ? null : []
    this.scheduleEmit()
  }
}
</script>

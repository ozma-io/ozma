<i18n>
  {
    "en": {
      "error": "Error in array field",
      "not_all_values_found_in_options" : "Not all values found in options"
    },
    "ru": {
      "error": "Ошибка в поле с массивом",
      "not_all_values_found_in_options" : "Не все значения найдены в опциях"
    },
    "es": {
      "error": "El error en el campo de la matriz",
      "not_all_values_found_in_options" : "No todos los valores están encontrados en las opciones"
    }
  }
</i18n>

<template>
  <ReferenceMultiSelect
    :value="values"
    :label="label"
    load-pun-on-mount
    :entries="entriesRef"
    :reference-entity="referenceEntity"
    :home-schema="homeSchema"
    :required="required"
    :disabled="disabled"
    :height="height"
    :options-list-height="optionsListHeight"
    :autofocus="autofocus"
    :compact-mode="compactMode"
    :option-color-variant-attribute="optionColorVariantAttribute"
    @add-value="addValue"
    @remove-index="removeIndex"
    @clear-values="clearValues"
    @popup-opened="$emit('popup-opened')"
    @popup-closed="$emit('popup-closed')"
  />
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import type { IEntityRef, SchemaName } from 'ozma-api'

import ReferenceMultiSelect from '@/components/ReferenceMultiSelect.vue'
import { valueIsNull } from '@/values'
import { EntriesRef } from '@/state/entries'
import type { IQuery } from '@/state/query'
import type { ColorVariantAttribute } from '@/utils_colors'

@Component({
  components: {
    ReferenceMultiSelect,
  },
})
export default class ArrayReferenceField extends Vue {
  @Prop({ required: true }) value!: unknown[] | null
  @Prop({ type: Object }) optionsView!: IQuery | undefined
  @Prop({ type: Object, required: true }) referenceEntity!: IEntityRef
  @Prop({ type: Boolean, default: false }) required!: boolean
  @Prop({ type: Boolean, default: false }) disabled!: boolean
  @Prop({ type: Number }) height!: number | undefined
  @Prop({ type: Number }) optionsListHeight!: number | undefined
  @Prop({ type: Boolean, default: false }) autofocus!: boolean
  @Prop({ type: String }) homeSchema!: SchemaName | undefined
  @Prop({ type: String }) label!: string | undefined
  @Prop({ type: Boolean, default: false }) compactMode!: boolean
  @Prop({ type: Object }) optionColorVariantAttribute!: ColorVariantAttribute

  get entriesRef(): EntriesRef {
    if (this.optionsView) {
      return {
        fetchBy: 'options_view',
        optionsView: this.optionsView,
        referencedTo: this.referenceEntity,
      }
    } else {
      return {
        fetchBy: 'entity',
        entity: this.referenceEntity,
      }
    }
  }

  private get values() {
    return this.value?.map((value) => ({ value, pun: undefined })) ?? []
  }

  private addValue(id: number) {
    if (valueIsNull(this.value)) {
      this.$emit('update:value', [id])
    } else {
      this.$emit('update:value', [...this.value, id])
    }
  }

  private removeIndex(index: number) {
    if (this.value === null) return

    const rawNewValue = this.value.slice()
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

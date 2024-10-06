<template>
  <div
    class="reference-field"
    :style="{
      backgroundColor: backgroundColor,
      maxWidth: isCellEdit ? '25rem' : undefined,
    }"
  >
    <ReferenceMultiSelect
      :value="referenceValue"
      :label="label"
      :height="height"
      single
      :autofocus="autofocus"
      :required="!nullable"
      :disabled="disabled"
      :entries="entriesRef"
      :reference-entity="referenceEntity"
      :home-schema="homeSchema"
      :link-attr="linkAttr"
      :select-views="selectViews"
      :qrcode-input="qrcodeInput"
      :scope="scope"
      :compact-mode="compactMode"
      :option-color-variant-attribute="optionColorVariantAttribute"
      @update:value="$emit('update:value', $event)"
      @popup-opened="$emit('popup-opened')"
      @popup-closed="$emit('popup-closed')"
      @goto="$emit('goto', $event)"
    />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import { namespace } from 'vuex-class'
import type {
  IEntityRef,
  IFieldRef,
  RowId,
  SchemaName,
} from '@ozma-io/ozmadb-js/client'

import type {
  IReferenceSelectAction,
  IReferenceValue,
} from '@/components/ReferenceMultiSelect.vue'
import ReferenceMultiSelect from '@/components/ReferenceMultiSelect.vue'
import { EntriesRef } from '@/state/entries'
import { IQuery } from '@/state/query'
import type { ScopeName } from '@/state/staging_changes'
import type { ColorVariantAttribute } from '@/utils_colors'
import { UserString, isOptionalUserString } from '@/state/translations'

const query = namespace('query')

@Component({
  components: {
    ReferenceMultiSelect,
  },
})
export default class ReferenceField extends Vue {
  @Prop({ type: Array, default: () => [] })
  selectViews!: IReferenceSelectAction[]
  @Prop({ required: true }) value!: number | null
  @Prop({ type: String }) pun!: string | undefined
  @Prop({ type: Object }) referencingField!: IFieldRef | undefined
  @Prop({ type: Number }) referencingRowId!: RowId | undefined
  @Prop({ type: Object, required: true }) referenceEntity!: IEntityRef
  @Prop({ type: Object, default: null }) optionsView!: IQuery | null
  @Prop({ type: String }) homeSchema!: SchemaName | undefined
  @Prop({ type: Boolean, default: false }) isCellEdit!: boolean
  @Prop({ type: Object }) linkAttr!: any | undefined
  @Prop({ type: Boolean, default: false }) disabled!: boolean
  @Prop({ type: Boolean, default: false }) nullable!: boolean
  @Prop({ type: Number }) height!: number | undefined
  @Prop({ type: Boolean, default: false }) autofocus!: boolean
  @Prop({ type: String }) backgroundColor!: string
  @Prop({ type: Boolean, default: false }) qrcodeInput!: boolean
  @Prop({ type: String }) scope!: ScopeName
  @Prop({ validator: isOptionalUserString }) label!: UserString | undefined
  @Prop({ type: Boolean, default: false }) compactMode!: boolean
  @Prop({ type: Object }) optionColorVariantAttribute!: ColorVariantAttribute

  get referenceValue(): IReferenceValue {
    return {
      value: this.value,
      pun: this.pun,
    }
  }

  get entriesRef(): EntriesRef {
    if (this.optionsView) {
      return {
        fetchBy: 'options_view',
        optionsView: this.optionsView,
        referencedTo: this.referenceEntity,
      }
    } else if (this.referencingField) {
      return {
        fetchBy: 'domain',
        entity: this.referenceEntity,
        referencedBy: {
          field: this.referencingField,
          rowId: this.referencingRowId ?? null,
        },
      }
    } else {
      return {
        fetchBy: 'entity',
        entity: this.referenceEntity,
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.reference-field {
  border-radius: 0.5rem;
}
</style>

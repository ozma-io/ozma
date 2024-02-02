<template>
  <span>
    <FormValueControl
      v-if="visible"
      :caption="element.caption"
      :force-caption="element.forceCaption"
      :column-info-name="element.columnInfo.name"
      :value="value"
      :attributes="attributes"
      :attribute-mappings="uv.columnAttributeMappings[element.index]"
      :type="element.columnInfo.valueType"
      :locked="locked || softDisabled"
      :home-schema="uv.homeSchema"
      :scope="scope"
      :level="level"
      :autofocus="element.autofocus"
      @goto="$emit('goto', $event)"
      @update="$emit('update', $event)"
    />
  </span>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'

import type {
  IElementField,
  IFormCombinedUserView,
  IFormExtendedRowCommon,
} from '../Form.vue'
import type { ICombinedValue } from '@/user_views/combined'
import FormValueControl from '@/components/FormValueControl'

@Component({ components: { FormValueControl } })
export default class FormField extends Vue {
  @Prop({ type: Object, required: true }) uv!: IFormCombinedUserView
  @Prop({ type: Object, required: true }) row!: IFormExtendedRowCommon
  @Prop({ type: Object, required: true }) element!: IElementField
  @Prop({ type: String, required: true }) scope!: string
  @Prop({ type: Number, required: true }) level!: number
  @Prop({ type: Boolean, default: false }) locked!: boolean
  @Prop({ type: Object, required: true }) value!: ICombinedValue

  get visible() {
    return Boolean(this.attributes['visible'] ?? true)
  }

  get softDisabled() {
    return Boolean(this.attributes['soft_disabled'])
  }

  get attributes() {
    const columnAttrs = this.uv.columnAttributes[this.element.index]
    return {
      ...this.uv.attributes,
      ...this.row.attributes,
      ...columnAttrs,
      ...this.value.attributes,
    }
  }
}
</script>

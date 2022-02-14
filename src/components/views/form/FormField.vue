<template>
  <span>
    <FormValueControl
      v-if="visible"
      :caption="element.caption"
      :force-caption="element.forceCaption"
      :column-info-name="element.columnInfo.name"
      :value="value"
      :value-formatted="valueFormatted"
      :attributes="attributes"
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
import { Component, Vue, Prop } from "vue-property-decorator";

import { getNumberFormatter, isValidNumberFormat } from "@/utils";
import type { IElementField, IFormCombinedUserView, IFormExtendedRowCommon } from "../Form.vue";
import type { ICombinedValue } from "@/user_views/combined";
import FormValueControl from "@/components/FormValueControl";

@Component({ components: { FormValueControl } })
export default class FormField extends Vue {
  @Prop({ type: Object, required: true }) uv!: IFormCombinedUserView;
  @Prop({ type: Object, required: true }) row!: IFormExtendedRowCommon;
  @Prop({ type: Object, required: true }) element!: IElementField;
  @Prop({ type: String, required: true }) scope!: string;
  @Prop({ type: Number, required: true }) level!: number;
  @Prop({ type: Boolean, default: false }) locked!: boolean;
  @Prop({ type: Object, required: true }) value!: ICombinedValue;

  get valueFormatted() {
    let valueFormatted: string | undefined;
    // Formatting  of editable inputs (or input masking) is a huge pain and brings many troubles, so only for read-only inputs.
    const isReadOnly = this.value.info === undefined || this.softDisabled;
    if (isReadOnly && typeof this.value.value === "number") {
      const numberFormat = this.attributes["number_format"];
      if (typeof numberFormat === "string" && isValidNumberFormat(numberFormat)) {
        const fractionDigitsRaw = this.attributes["fraction_digits"];
        const fractionDigits = typeof fractionDigitsRaw === "number" ? fractionDigitsRaw : undefined;
        valueFormatted = getNumberFormatter(numberFormat, fractionDigits).format(this.value.value);
      }
    }
    return valueFormatted;
  }

  get visible() {
    return Boolean(this.attributes["visible"] ?? true);
  }

  get softDisabled() {
    return Boolean(this.attributes["soft_disabled"]);
  }

  get attributes() {
    const columnAttrs = this.uv.columnAttributes[this.element.index];
    return {
      ...this.uv.attributes,
      ...this.row.attributes,
      ...columnAttrs,
      ...this.value.attributes,
    };
  }
}
</script>

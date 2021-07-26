<i18n>
  {
    "en": {
      "error": "Error",
      "error_qrcode_is_inappropriate" : "QRCode is inappropriate"
    },
    "ru": {
      "error": "Ошибка",
      "error_qrcode_is_inappropriate" : "QRCode не соответствует назначению"
    }
  }
</i18n>

<template>
  <MultiSelect
    :style="{ minWidth: isCellEdit ? '25rem' : undefined}"
    :value="selectedValue"
    :options="options"
    single
    show-filter
    :required="required"
    :disabled="disabled"
    :height="height"
    :options-list-height="optionsListHeight"
    :autofocus="autofocus"
    @update:value="updateValue"
    @focus="$emit('focus')"
  />
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import { ISelectOption, default as MultiSelect } from "@/components/multiselect/MultiSelect.vue";

import { valueIsNull } from "@/values";

@Component({
  components: {
    MultiSelect,
  },
})
export default class ValueSelect extends Vue {
  @Prop({ required: true }) value!: unknown | null;
  @Prop({ type: Array, required: true }) options!: ISelectOption<unknown>[];
  @Prop({ type: Boolean, default: false }) required!: boolean;
  @Prop({ type: Boolean, default: false }) disabled!: boolean;
  @Prop({ type: Number }) height!: number | undefined;
  @Prop({ type: Number }) optionsListHeight!: number | undefined;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;
  @Prop({ type: Boolean, default: false }) isCellEdit!: boolean;

  get selectedValue() {
    if (valueIsNull(this.value)) {
      return null;
    }
    const idx = this.options.findIndex(opt => opt.value === this.value);
    if (idx === -1) {
      throw new Error("Can't find selected option in options array");
    }
    return idx;
  }

  private updateValue(index: number | null) {
    if (index === null) {
      this.$emit("update:value", null);
    } else {
      this.$emit("update:value", this.options[index].value);
    }
  }
}
</script>

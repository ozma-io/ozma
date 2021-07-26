<i18n>
  {
    "en": {
      "error": "Error in array field",
      "not_all_values_found_in_options" : "Not all values found in options"
    },
    "ru": {
      "error": "Ошибка в поле с массивом",
      "not_all_values_found_in_options" : "Не все значения найдены в опциях"
    }
  }
</i18n>

<template>
  <ReferenceMultiSelect
    :value="values"
    load-pun-on-mount
    :entries="entriesRef"
    :reference-entity="{}"
    :uv-args="uvArgs"
    :required="required"
    :disabled="disabled"
    :height="height"
    :options-list-height="optionsListHeight"
    :autofocus="autofocus"
    @add-value="addValue"
    @remove-index="removeIndex"
    @clear-values="clearValues"
    @focus="$emit('focus')"
  />
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import ReferenceMultiSelect from "@/components/ReferenceMultiSelect.vue";
import { valueIsNull } from "@/values";
import { EntriesRef } from "@/state/entries";
import type { IQuery } from "@/state/query";
import type { IUserViewArguments } from "@/user_views/combined";
import { IEntityRef } from "ozma-api";

@Component({
  components: {
    ReferenceMultiSelect,
  },
})
export default class ArrayReferenceField extends Vue {
  @Prop({ required: true }) value!: unknown[] | null;
  @Prop({ type: Object, default: null }) optionsView!: IQuery;
  @Prop({ type: Object, default: null }) referenceEntity!: IEntityRef | null;
  @Prop({ type: Boolean, default: false }) required!: boolean;
  @Prop({ type: Boolean, default: false }) disabled!: boolean;
  @Prop({ type: Number }) height!: number | undefined;
  @Prop({ type: Number }) optionsListHeight!: number | undefined;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;
  @Prop({ type: Object, required: true }) uvArgs!: IUserViewArguments;

  private get entriesRef(): EntriesRef {
    return {
      fetchBy: "options_view",
      optionsView: this.optionsView,
      referencedTo: this.referenceEntity,
    };
  }

  private get values() {
    return this.value?.map(value => ({ value, pun: undefined })) ?? [];
  }

  private addValue(id: number) {
    if (valueIsNull(this.value)) {
      this.$emit("update:value", [id]);
    } else {
      this.$emit("update:value", [...this.value, id]);
    }
  }

  private removeIndex(index: number) {
    if (this.value === null) return;

    if (this.value.length <= 1) {
      this.$emit("update:value", null);
    } else {
      this.$emit("update:value", this.value.filter((_, i) => i !== index));
    }
  }

  private clearValues() {
    this.$emit("update:value", null);
  }
}
</script>

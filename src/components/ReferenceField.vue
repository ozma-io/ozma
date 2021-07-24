<template>
  <div
    class="reference-field"
    :style="{ backgroundColor: backgroundColor, minWidth: isCellEdit ? '25rem' : undefined}"
  >
    <ReferenceMultiSelect
      :value="value"
      :label="label"
      :height="height"
      single
      :autofocus="autofocus"
      :required="!nullable"
      :disabled="disabled"
      :entries="entriesRef"
      :reference-entity="referenceEntity"
      :uv-args="uvArgs"
      :link-attr="linkAttr"
      :select-views="selectViews"
      :qrcode-input="qrcodeInput"
      @update:value="$emit('update:value', $event)"
      @focus="$emit('focus')"
      @goto="$emit('goto', $event)"
    />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { namespace } from "vuex-class";
import type { IEntityRef } from "ozma-api";

import ReferenceMultiSelect, { IReferenceSelectAction } from "@/components/ReferenceMultiSelect.vue";
import type { ICombinedValue, IUserViewArguments } from "@/user_views/combined";
import { EntriesRef } from "@/state/entries";
import { IQuery } from "@/state/query";

const query = namespace("query");

@Component({
  components: {
    ReferenceMultiSelect,
  },
})
export default class ReferenceField extends Vue {
  @Prop({ type: Array, default: () => [] }) selectViews!: IReferenceSelectAction[];
  @Prop({ type: Object, required: true }) value!: ICombinedValue;
  @Prop({ type: Object, required: true }) referenceEntity!: IEntityRef;
  @Prop({ type: Object, default: null }) optionsView!: IQuery | null;
  @Prop({ type: Object, required: true }) uvArgs!: IUserViewArguments;
  @Prop({ type: Boolean, default: false }) isCellEdit!: boolean;
  @Prop({ type: Object }) linkAttr!: any | undefined;
  @Prop({ type: Boolean, default: false }) disabled!: boolean;
  @Prop({ type: Boolean, default: false }) nullable!: boolean;
  @Prop({ type: Number }) height!: number | undefined;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;
  @Prop({ type: String }) backgroundColor!: string;
  @Prop({ type: Boolean, default: false }) qrcodeInput!: boolean;
  @Prop({ type: String, default: null }) label!: string | null;

  get entriesRef(): EntriesRef {
    return this.optionsView
      ? {
        fetchBy: "options_view",
        optionsView: this.optionsView,
        referencedTo: this.referenceEntity,
      }
      : {
        fetchBy: "domain",
        entity: this.referenceEntity,
        referencedBy: {
          field: this.value.info!.fieldRef,
          rowId: this.value.info!.id ?? null,
        },
      };
  }
}
</script>

<style lang="scss" scoped>
  .reference-field {
    border-radius: 0.2rem;
  }
</style>

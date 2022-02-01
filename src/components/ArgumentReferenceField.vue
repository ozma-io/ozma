<template>
  <div
    class="reference-field"
    :style="{ backgroundColor: backgroundColor }"
  >
    <ReferenceMultiSelect
      :value="value"
      :label="label"
      :height="height"
      single
      load-pun-on-mount
      :autofocus="autofocus"
      :required="!nullable"
      :disabled="disabled"
      :entries="entriesRef"
      :reference-entity="referenceEntity"
      :uv-args="uvArgs"
      :link-attr="linkAttr"
      :select-views="selectViews"
      :qrcode-input="qrcodeInput"
      :compact-mode="compactMode"
      @update:value="$emit('update:value', $event)"
      @popup-opened="$emit('popup-opened')"
      @popup-closed="$emit('popup-closed')"
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
export default class ArgumentReferenceField extends Vue {
  @Prop({ type: Array, default: () => [] }) selectViews!: IReferenceSelectAction[];
  @Prop({ type: Object, required: true }) value!: ICombinedValue;
  @Prop({ type: Object, required: true }) referenceEntity!: IEntityRef;
  @Prop({ type: Object, required: true }) uvArgs!: IUserViewArguments;
  @Prop({ type: Object, default: null }) optionsView!: IQuery | null;
  @Prop({ type: Object }) linkAttr!: any | undefined;
  @Prop({ type: Boolean, default: false }) disabled!: boolean;
  @Prop({ type: Boolean, default: false }) nullable!: boolean;
  @Prop({ type: Number }) height!: number | undefined;
  @Prop({ type: Boolean, default: false }) autofocus!: boolean;
  @Prop({ type: String }) backgroundColor!: string;
  @Prop({ type: Boolean, default: false }) qrcodeInput!: boolean;
  @Prop({ type: String, default: null }) label!: string | null;
  @Prop({ type: Boolean, default: false }) compactMode!: boolean;

  private get entriesRef(): EntriesRef {
    return this.optionsView
      ? {
        fetchBy: "options_view",
        optionsView: this.optionsView,
        referencedTo: this.referenceEntity,
      }
      : {
        fetchBy: "entity",
        entity: this.referenceEntity,
      };
  }
}
</script>

<style lang="scss" scoped>
  .reference-field {
    border-radius: 0.2rem;
  }
</style>

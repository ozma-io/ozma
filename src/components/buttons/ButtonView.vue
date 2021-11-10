<template>
  <!-- Cathing `contextmenu` event there for context menu in tables, it doesn't work in other places, don't know why -->
  <b-list-group-item
    v-if="listItem"
    class="list-group-item-action"
    :variant="listItemVariant"
    :disabled="button.disabled"
    @click="$emit('click')"
    @contextmenu.capture.stop.prevent
  >
    <ButtonContent
      :button="button"
      :phantom-icon="phantomIcon"
      list-item
    />
  </b-list-group-item>

  <b-button
    v-else
    v-b-tooltip.hover.noninteractive.viewport
    :class="[variantClassName, 'button-local-variant', alignRight ? '' : 'd-flex justify-content-center', buttonClass]"
    :style="variantVariables"
    variant="light"
    :title="button.tooltip"
    :disabled="button.disabled"
    :tabindex="tabindex"
    @click="$emit('click')"
  >
    <ButtonContent
      :button="button"
    />
  </b-button>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import type { Button } from "@/components/buttons/buttons";
import ButtonContent from "@/components/buttons/ButtonContent.vue";
import { getColorVariantAttributeClassName, getColorVariantAttributeVariables } from "@/utils_colors";

@Component({
  components: {
    ButtonContent,
  },
})
export default class ButtonView extends Vue {
  @Prop({ type: Object, required: true }) button!: Button;
  @Prop({ type: Boolean, default: false }) listItem!: boolean;
  @Prop({ type: Boolean, default: false }) phantomIcon!: boolean;
  @Prop({ type: Boolean, default: false }) alignRight!: boolean;
  @Prop({ type: Number }) tabindex!: number;

  private get buttonClass() {
    return !this.button.caption
      ? "button-only-icon"
      : this.button.icon
        ? "button-icon-caption"
        : "button-only-caption";
  }

  private get variantClassName(): string | null {
    return getColorVariantAttributeClassName(this.button.variant);
  }

  // TODO: support our variants for list item.
  private get listItemVariant(): string {
    return this.button.variant.type === "existing" ? this.button.variant.className : "light";
  }

  private get variantVariables(): Record<string, string> | null {
    return getColorVariantAttributeVariables(this.button.variant);
  }
}
</script>

<style lang="scss" scoped>
  @include variant-to-local("button");

  .list-group-item {
    cursor: pointer;
    text-align: left;
  }
</style>

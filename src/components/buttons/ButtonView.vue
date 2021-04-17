<template>
  <b-list-group-item
    v-if="listItem"
    class="list-group-item-action"
    :variant="button.variant"
    :disabled="button.disabled"
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
    :class="buttonClass"
    :style="button.colorVariables"
    variant="light"
    :title="button.tooltip"
    :disabled="button.disabled"
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

@Component({
  components: {
    ButtonContent,
  },
})
export default class ButtonView extends Vue {
  @Prop({ type: Object, required: true }) button!: Button;
  @Prop({ type: Boolean, default: false }) listItem!: boolean;
  @Prop({ type: Boolean, default: false }) phantomIcon!: boolean;

  private get buttonClass() {
    return !this.button.caption
      ? "button-only-icon"
      : this.button.icon
        ? "button-icon-caption"
        : "button-only-caption";
  }
}
</script>

<style lang="scss" scoped>
  .list-group-item {
    cursor: pointer;
    text-align: left;
  }
</style>

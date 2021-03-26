<template>
  <b-list-group-item
    v-if="listItem"
    :variant="button.variant"
    class="d-flex list-group-item-action p-2"
  >
    <ButtonContent
      :button="button"
      list-item
    />
  </b-list-group-item>

  <b-button
    v-else
    v-b-tooltip.hover.noninteractive
    :class="buttonClass"
    :variant="button.variant ? button.variant : 'light'"
    :title="button.tooltip"
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

  private get buttonClass() {
    return !this.button.name
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

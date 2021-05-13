<template>
  <fragment>
    <span
      v-if="button.icon"
      :class="[
        'icon',
        iconType === 'emoji' ? 'emoji-icon' : 'material-icons',
      ]"
    >{{ button.icon }}</span>
    <span
      v-else-if="listItem && phantomIcon"
      v-visible="false"
      class="material-icons"
    >arrow_right</span>

    <span
      v-if="button.caption || listItem"
      :class="[listItem ? 'mx-2' : 'button-caption']"
    >{{ button.caption || button.tooltip }}</span>

    <span
      v-if="button.caption && button.type == 'button-group'"
      class="material-icons ml-auto dropdown-icon"
    >arrow_drop_down</span>

    <span
      v-if="!button.caption"
    >&#8203;</span>
  </fragment>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import type { Button } from "@/components/buttons/buttons";
import { getIconType } from "@/utils";

@Component
export default class ButtonContent extends Vue {
  @Prop({ type: Object, required: true }) button!: Button;
  @Prop({ type: Boolean, default: false }) listItem!: boolean;
  @Prop({ type: Boolean, default: false }) phantomIcon!: boolean;

  private get iconType() {
    return getIconType(this.button.icon);
  }
}
</script>

<style lang="scss" scoped>
  .dropdown-icon {
    margin: -0.1rem 0;
    line-height: 0;
  }
</style>

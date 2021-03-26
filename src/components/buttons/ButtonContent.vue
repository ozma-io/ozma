<template>
  <fragment>
    <span
      v-if="button.icon"
      :class="[
        'icon',
        {
          'emoji-icon': iconType === 'emoji',
          'material-icons': iconType === 'material',
        },
      ]"
    >{{ button.icon }}</span>
    <!--
    <span
      v-else-if="listItem"
      v-visible="false"
      class="material-icons"
    >arrow_right</span>
    -->

    <span
      v-if="button.name || listItem"
      :class="[listItem ? 'mx-2' : 'button-caption']"
    >{{ button.name || button.tooltip }}</span>

    <span
      v-if="button.name && button.type == 'button-group'"
      class="material-icons md-18"
    >arrow_drop_down</span>
  </fragment>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import type { Button } from "@/components/buttons/buttons";
import { getIconType } from "@/utils";

@Component
export default class ButtonView extends Vue {
  @Prop({ type: Object, required: true }) button!: Button;
  @Prop({ type: Boolean, default: false }) listItem!: boolean;

  private get iconType() {
    return getIconType(this.button.icon);
  }
}
</script>

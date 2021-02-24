<template>
  <fragment>
    <span v-if="button.icon"  :class="[getIconType(button.icon) === 'emoji' ? 'emoji':'material-icons']">{{ button.icon }}</span>
    <span v-else-if="!isButton" v-visible="false" class="material-icons">arrow_right</span>

    <span v-if="button.title"  class="mx-1 text-nowrap">{{ button.title }}</span>
    <span v-else-if="!isButton" class="mx-1 text-nowrap" >{{ button.tooltip }}</span>
  </fragment>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import type { Button } from "@/components/buttons/buttons";
import { getIconType } from "@/utils";

@Component
export default class ButtonView extends Vue {
  @Prop({ type: Object, required: true }) button!: Button;
  @Prop({ type: Boolean, required: true }) isButton!: boolean;

  private getIconType(str: string | undefined | null) {
    return getIconType(str);
  }
}
</script>
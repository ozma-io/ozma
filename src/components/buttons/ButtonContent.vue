<template>
  <fragment>
    <span v-if="button.icon"  :class="[getIconType(button.icon) === 'emoji' ? 'emoji':'material-icons']">{{ button.icon }}</span>
    <span v-else-if="listItem" v-visible="false" class="material-icons">arrow_right</span>

    <span v-if="button.name"  :class="[listItem ? 'mx-2' : 'mx-1  text-nowrap']">{{ button.name }}</span>
    <span v-else-if="listItem" :class="[listItem ? 'mx-2' : 'mx-1  text-nowrap']">{{ button.tooltip }}</span>
    
    <span v-if="button.name && button.type == 'button-group'" class="material-icons">arrow_drop_down</span>
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

  private getIconType(str: string | undefined | null) {
    return getIconType(str);
  }
}
</script>
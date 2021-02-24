<template>
  <b-button
    :block="!isButton"
    :squared="!isButton"
    :class="['d-flex p-1',{'btn-sm': isButton}]"
    variant="light" 
    v-b-tooltip.hover
    :title="button.tooltip"
  >
    <ButtonContent 
      :button="button"
      :is-button="isButton"
    />
  </b-button>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import type { Button } from "@/components/buttons/buttons";
import ButtonContent from "@/components/buttons/ButtonContent.vue";

import { getIconType } from "@/utils";


@Component({ 
  components: {
    ButtonContent,
  } 
})
export default class ButtonView extends Vue {
  @Prop({ type: Object, required: true }) button!: Button;
  @Prop({ type: Boolean, required: true }) isButton!: boolean;

  private getIconType(str: string | undefined | null) {
    return getIconType(str);
  }
}
</script>
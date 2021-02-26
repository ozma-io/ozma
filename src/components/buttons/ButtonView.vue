<template>
  <b-button
    :block="showCaption"
    :squared="showCaption"
    :class="['d-flex p-0-5',{'btn-sm': !showCaption}]"
    variant="light" 
    v-b-tooltip.hover.noninteractive
    :title="button.tooltip"
  >
    <ButtonContent 
      :button="button"
      :show-caption="showCaption"
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
  } 
})
export default class ButtonView extends Vue {
  @Prop({ type: Object, required: true }) button!: Button;
  @Prop({ type: Boolean, default: false }) showCaption!: boolean;
}
</script>
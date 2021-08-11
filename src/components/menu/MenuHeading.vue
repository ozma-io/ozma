<template>
  <component :is="`h${headingLevel}`">
    <slot />
  </component>
</template>

<script lang="ts">
import R from "ramda";
import { Vue, Component, Prop } from "vue-property-decorator";

@Component
export default class MenuHeading extends Vue {
  @Prop({ type: Number, default: 1 }) level!: number;

  private get headingLevel(): number {
    return R.clamp(1, 6, this.level + 1);
  }
}

</script>

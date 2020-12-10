<template>
  <component :is="`h${headingLevel}`">
    <slot />
  </component>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";

@Component
export default class MenuHeading extends Vue {
  @Prop({ type: Number, default: 1 }) level!: number;

  private get headingLevel(): number {
    if (this.level < 1) {
      return 1;
    } else if (this.level > 6) {
      return 6;
    }
    return this.level;
  }
}

</script>

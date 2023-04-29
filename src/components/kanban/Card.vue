<template>
  <div
    :class="[ variantClassName, 'kanbanCard-variant', 'kanbanCard-local-variant', 'card_container', 'shadow-sm' ]"
    :style="variantVariables"
  >
    <slot />
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";

import type { ColorVariantAttribute } from "@/utils_colors";
import { getColorVariantAttributeClassName, getColorVariantAttributeVariables } from "@/utils_colors";

@Component
export default class KanbanCard extends Vue {
  // FIXME: Again, specific to our usage of kanban. Can we move this logic to a slot?
  @Prop({ type: String }) backgroundColor!: string | undefined;
  @Prop({ type: Object }) colorVariantAttribute!: ColorVariantAttribute;

  get cardStyle() {
    return {
      backgroundColor: this.backgroundColor,
    };
  }

  private get variantClassName(): string | null {
    return getColorVariantAttributeClassName(this.colorVariantAttribute);
  }

  private get variantVariables(): Record<string, string> | null {
    return getColorVariantAttributeVariables(this.colorVariantAttribute);
  }
}
</script>

<style lang="scss" scoped>
  @include variant-to-local("kanbanCard");

  .card_container {
    display: block;
    border-radius: 0.25rem;
    box-shadow: var(--backgroundDarker2Color) 0 0 3px 2px!important;
    background-color: var(--kanbanCard-backgroundColor);
    color: var(--kanbanCard-foregroundColor);
    margin-bottom: 0.4rem;
    user-select: none;
    min-height: 3.6rem;
  }

  @media screen and (max-width: 700px) {
    .card_container {
      width: unset;
      max-width: 50vw;
      user-select: none;
    }
  }

  @media screen and (max-width: 490px) {
    .card_container {
      max-width: 80vw;
    }
  }
</style>

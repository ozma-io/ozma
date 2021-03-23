<template>
  <div
    class="card_container shadow-sm"
    :style="colorVariables"
  >
    <slot />
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";

@Component
export default class KanbanCard extends Vue {
  // FIXME: Again, specific to our usage of kanban. Can we move this logic to a slot?
  @Prop({ type: String }) backgroundColor!: string | undefined;
  @Prop({ type: Object }) colorVariables!: Record<string, string>;

  get cardStyle() {
    return {
      backgroundColor: this.backgroundColor,
    };
  }
}
</script>

<style lang="scss" scoped>
  .card_container {
    display: block;
    border: 1px solid var(--kanbanCard-borderColor, var(--MainBorderColor));
    border-radius: 0.25rem;
    background-color: var(--kanbanCard-backgroundColor, var(--MainBackgroundColor));
    color: var(--kanbanCard-foregroundColor, var(--MainTextColor));
    margin-bottom: 0.4rem;
    user-select: none;
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

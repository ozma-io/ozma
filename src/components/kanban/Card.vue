<template>
  <div
    :class="['card_container', { 'dragging': dragging }]"
    :style="cardStyle"
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
  @Prop({ type: Boolean, default: false }) dragging!: boolean;

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
    border: 1px solid var(--MainBorderColor);
    border-radius: 0.25rem;
    background-color: var(--MainBackgroundColor);
    color: var(--MainTextColor);
    padding: 10px;
    margin-bottom: 15px;
    user-select: none;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);

    &:not(.dragging) {
      cursor: pointer;
    }
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

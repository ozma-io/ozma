<template>
  <div
    class="column_container"
    data-dragscroll
    :style="style"
  >
    <div
      class="column_header"
      data-dragscroll
    >
      <div
        class="column_header__title_block"
        data-dragscroll
      >
        <span
          class="column_header__title"
          :title="title"
          data-dragscroll
        >
          {{ title }} {{ cardCount }}
        </span>
        <span class="column_controls" data-dragscroll>
          <i
            v-if="createButton"
            class="material-icons material-button rounded-circle new-card-icon"
            @click="$emit('create')"
          >add</i>
        </span>
      </div>
    </div>
    <!-- force-fallback is needed for *-class properties to work:
         https://github.com/SortableJS/Sortable/issues/1268 -->
    <draggable
      class="column_body"
      :group="{ name: $parent.uid, put: true }"
      ghost-class="card_dragging_ghost"
      chosen-class="card_dragging_chosen"
      drag-class="card_dragging_drag"
      touch-start-threshold="10"
      delay-on-touch-only="true"
      force-fallback="true"
      delay="200"
      animation="200"
      data-dragscroll
      :style="[{ width }, colorVariables]"
      :value="cards"
      :disabled="!allowDragging"
      @start="onDragStart"
      @end="onDragEnd"
      @change="onChange"
    >
      <Card
        v-for="(card, cardIndex) in cards"
        :key="card.key"
        :background-color="card.backgroundColor"
        :color-variables="card.colorVariables"
      >
        <slot
          name="card"
          :dragged="cardIndex === draggedIndex"
          :card="card.card"
        />
      </Card>
    </draggable>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import draggable from "vuedraggable";

import Card from "@/components/kanban/Card.vue";
import { nextRender } from "@/utils";

export interface ICard<CardT> {
  key: unknown;
  card: CardT;
  backgroundColor?: string;
  colorVariables: Record<string, string>;
}

@Component({ components: { Card, draggable } })
export default class KanbanColumn extends Vue {
  @Prop({ type: Array, required: true }) cards!: ICard<unknown>[];
  @Prop({ type: String, required: true }) title!: string;
  @Prop({ type: Boolean, default: false }) createButton!: boolean;
  @Prop({ type: Number, default: 300 }) width!: number;
  @Prop({ type: Object }) colorVariables!: Record<string, string>;
  /* @Prop({ type: String, default: "none" }) headerColor!: string; */
  @Prop({ type: String, default: "none" }) backgroundColor!: string;
  @Prop({ type: Boolean, default: false }) allowDragging!: string;

  private draggedIndex: number | null = null;

  get style() {
    return {
      width: `${this.width}px`,
      minWidth: `${this.width}px`,
    };
  }

  get cardCount() {
    return (this.cards.length > 0) ? `(${this.cards.length})` : "";
  }

  private onDragStart(evt: any) {
    this.draggedIndex = evt.oldIndex;
    this.$emit("drag-start", evt.oldIndex);
  }

  private onDragEnd() {
    // On slow browsers `dragging` is unset too fast, which causes disabled links in draggable to be clicked.
    void nextRender().then(() => {
      this.draggedIndex = null;
      this.$emit("drag-end");
    });
  }

  private onChange(event: any) {
    if ("added" in event) {
      this.$emit("add", event.added.element.card, event.added.newIndex);
    } else if ("moved" in event) {
      this.$emit("move", event.moved.element.card, event.moved.oldIndex, event.moved.newIndex);
    } else if ("removed" in event) {
      this.$emit("remove", event.removed.element.card, event.removed.oldIndex);
    }
  }
}
</script>

<style lang="scss" scoped>
  .column_container {
    margin-right: 0.25rem;
    margin-left: 0.25rem;
    display: flex;
    flex-direction: column;
    background-color: var(--kanban-backgroundDarker1Color, var(--default-backgroundDarker1Color));
    color: var(--MainTextColor);
    border-radius: 0.2rem;
  }

  .column_header {
    padding: 0.5rem;
    display: flex;
  }

  .column_header__title_block {
    width: 100%;
    display: flex;
    align-items: center;
    color: var(--kanban-foregroundColor, var(--MainTextColor));
  }

  .column_header__title {
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    font-weight: bold;
  }

  .column_select_checkbox {
    vertical-align: middle;
  }

  .column_body {
    padding: 0.4rem;
    padding-bottom: 0;
    overflow-x: hidden;
    height: 100%;
    min-height: 100px;
  }

  .column_controls {
    margin-left: auto;
  }

  .column_controls > i {
    vertical-align: middle;
  }

  ::v-deep .card_dragging_ghost {
    background-color: var(--kanban-backgroundDarker2Color, #ddd) !important;
    border-radius: 0.25rem;
    border-width: 0;

    > * {
      visibility: hidden;
    }
  }

  .card_dragging_drag {
    opacity: 1 !important;
    transform: rotate(3deg);
    box-shadow: 0 10px 10px -10px;
    font-size: 14px;
  }

  ::-webkit-scrollbar {
    width: 5px;
    height: 10px;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(150, 150, 150, 0.2);
  }

  ::-webkit-scrollbar-track {
    background: rgba(50, 50, 50, 0.1);
  }

  ::-webkit-scrollbar-thumb:vertical:hover {
    background: #999;
    width: 100px;
  }

  ::-webkit-scrollbar-thumb:vertical:active {
    background: #777;
  }
</style>

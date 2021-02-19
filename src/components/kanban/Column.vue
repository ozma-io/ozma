<template>
  <div
    class="column_container"
    data-dragscroll
    :style="style"
  >
    <div
      class="column_header"
      :style="titleStyle"
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
            class="material-icons new-card-icon"
            style="font-size: 20px;"
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
      :style="{ width, backgroundColor }"
      :value="cards"
      :disabled="!allowDragging"
      @start="onDragStart"
      @end="onDragEnd"
      @change="onChange"
    >
      <Card
        v-for="card in cards"
        :key="card.key"
        :background-color="card.backgroundColor"
        :dragging="dragging"
      >
        <slot
          name="card"
          :dragging="dragging"
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

export interface ICard<CardT> {
  key: unknown;
  card: CardT;
  backgroundColor?: string;
}

@Component({ components: { Card, draggable } })
export default class KanbanColumn extends Vue {
  @Prop({ type: Array, required: true }) cards!: ICard<unknown>[];
  @Prop({ type: String, required: true }) title!: string;
  @Prop({ type: Boolean, default: false }) createButton!: boolean;
  @Prop({ type: Number, default: 300 }) width!: number;
  @Prop({ type: String, default: "none" }) headerColor!: string;
  @Prop({ type: String, default: "none" }) backgroundColor!: string;
  @Prop({ type: Boolean, default: false }) allowDragging!: string;

  private dragging = false;

  get style() {
    return {
      width: `${this.width}px`,
    };
  }

  get titleStyle() {
    return {
      ...this.style,
      backgroundColor: this.headerColor,
    };
  }

  get cardCount() {
    return (this.cards.length > 0) ? `(${this.cards.length})` : "";
  }

  private onDragStart() {
    this.dragging = true;
    this.$emit("drag-start");
  }

  private onDragEnd() {
    this.dragging = false;
    this.$emit("drag-end");
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
    color: var(--MainTextColor);
    border: 1px solid var(--MainBorderColor);
    box-sizing: content-box;
    display: flex;
    flex-direction: column;
  }

  .column_header {
    border-bottom: 1px solid var(--MainBorderColor);
    border-top: 1px solid var(--MainBorderColor);
    padding: 10px 10px 10px 12px;
    display: flex;
    opacity: 0.5;
    min-height: 44px;
  }

  .column_header__title_block {
    display: flex;
    width: 100%;
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
    padding: 15px 10px 0 10px;
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

  ::v-deep .card_dragging_chosen.card_dragging_ghost {
    background-color: #ddd !important;
    border-radius: 0.25rem;

    > .card_link {
      visibility: hidden;
    }
  }

  .card_dragging_drag {
    opacity: 1 !important;
    transform: rotate(3deg);
    box-shadow: 0 10px 10px -10px;
    font-size: 14px;
  }

  .new-card-icon {
    padding: 2px;
    border-radius: 2px;
    cursor: pointer;
    background-color: initial;
    color: initial;
    transition: background-color 0.5s ease;
    transition: color 0.25s ease;
  }

  .new-card-icon:hover {
    transition: background-color 0.5s ease;
    transition: color 0.25s ease;
    background-color: var(--SuccessColor);
    color: var(--MainBackgroundColor);
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

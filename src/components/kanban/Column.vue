<template>
  <div class="column_container" :style="style">
    <div
      class="column_header"
      :style="titleStyle"
    >
      <div
        class="column_header__title_block"
      >
        <span
          class="column_header__title"
          :title="title"
        >
          {{ title }} {{ cardCount }}
        </span>
        <span class="column_controls">
          <i
            v-if="createView !== undefined"
            class="material-icons new-card-icon"
            style="font-size: 20px;"
            @click="openModal"
          >add</i>
        </span>
      </div>
    </div>
    <draggable
      class="column_body"
      :group="{ name: 'cards', put: true }"
      ghost-class="card_dragging_ghost"
      chosen-class="card_dragging_chosen"
      drag-class="card_dragging_drag"
      :style="{ width, backgroundColor }"
      :force-fallback="true"
      :fallback-on-body="true"
      :fallback-tolerance="10"
      :touch-start-threshold="10"
      :delay-on-touch-only="true"
      :delay="200"
      :animation="200"
      :list="cards"
      @add="onAdd"
      @start="onDragStart"
      @end="onDragEnd"
    >
      <Card
        v-for="(card, index) in cards"
        :key="index"
        :data="card"
        :target="cardTarget"
        data-no-dragscroll
        :width="width"
        :dragging="dragging"
        :selected="isCardSelected(card.groupRef.position)"
        @goto="$emit('goto', $event)"
      />
    </draggable>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import draggable, { IVueDraggableEvent } from "vuedraggable";
import { dragscroll } from "vue-dragscroll";
import { namespace } from "vuex-class";
import * as R from "ramda";

import Card from "@/components/kanban/Card.vue";
import type { ICard, CardTarget } from "@/components/kanban/Card.vue";
import { nextRender } from "@/utils";
import { IQuery } from "@/state/query";
import { ValueRef } from "@/user_views/combined";

export interface IColumn {
  id?: any;
  title: string;
  createView?: IQuery;
  fieldName?: string;
  cards: ICard[];
}

export interface IColumnStyle {
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  flex?: number;
  backgroundColor?: string;
}

const query = namespace("query");

@Component({ components: { Card, draggable }, directives: { dragscroll } })
export default class Column extends Vue {
  @query.Action("addWindow") addWindow!: (queryObj: IQuery) => Promise<void>;
  @Prop() id!: any;
  @Prop({ type: Array, required: true }) cards!: ICard[];
  @Prop({ type: String, required: true }) title!: string;
  @Prop({ type: String, required: true }) fieldName!: string;
  @Prop({ type: String, required: true }) orderFieldName!: string;
  @Prop({ type: Object }) createView!: IQuery | undefined;
  // FIXME: convert these to events.
  @Prop({ type: Function, required: false }) add!: (ref: ValueRef, value: any) => void;
  @Prop({ type: Function, required: false }) move!: (ref: ValueRef, value: any) => void;
  @Prop({ type: Number, required: false, default: 300 }) width!: number;
  @Prop({ type: String, required: true, default: "none" }) headerColor!: string;
  @Prop({ type: String, required: true, default: "none" }) backgroundColor!: string;
  @Prop({ type: String, required: false }) cardTarget!: CardTarget;

  selected: number[] = [];
  dragging = false;

  private async openModal() {
    const modalQuery: IQuery = {
      args: {
        ...this.createView!.args,
      },
      defaultValues: {
        ...this.createView!.defaultValues,
        [this.fieldName]: this.id,
      },
      search: "",
    };

    if (this.orderFieldName.length > 0) {
      modalQuery.defaultValues[this.orderFieldName] = this.cards[0] && this.cards[0].order ? this.cards[0].order - 1 : 1;
    }

    await this.addWindow(modalQuery);
  }

  private isCardSelected(rowIndex: number) {
    return this.selected.includes(rowIndex);
  }

  private get style(): IColumnStyle {
    return {
      width: `${this.width}px`,
    };
  }

  private get titleStyle(): IColumnStyle {
    const strWidth = `${this.width}px`;
    return {
      width: strWidth,
      backgroundColor: this.headerColor,
    };
  }

  private get cardCount() {
    return (this.cards.length > 0) ? `(${this.cards.length})` : "";
  }

  private get isAllSelected() {
    return this.selected.length === this.cards.length;
  }

  private set isAllSelected(val: boolean) {
    if (val) {
      this.selectAll();
    } else {
      this.deselectAll();
    }
  }

  private onCheckboxClick(event: Event) {
    event.preventDefault();
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      this.selectAll();
    } else {
      this.deselectAll();
    }
  }

  private selectAll() {
    this.selected = this.cards.map(card => R.pathOr(-1, ["groupRef", "position"], card));
  }

  private deselectAll() {
    this.selected = [];
  }

  private onSelect(rowIndex: number) {
    this.selected = R.uniq([...this.selected, rowIndex]);
  }

  private onDeselect(rowIndex: number) {
    this.selected = this.selected.filter(val => val !== rowIndex);
  }

  private onDragStart(event: IVueDraggableEvent) {
    this.$emit("drag-start");
    this.dragging = true;
  }

  private getPrevAndNextCardOrders(index: number): [prevCardOrder: number, nextCardOrder: number] {
    const prevCardIndex = index - 1;
    const nextCardIndex = index + 1;
    const getCardOrder = (cardIndex: number, defaultOrder: number) =>
      R.pathOr<number>(defaultOrder, [cardIndex, "order"], this.cards);
    const prevCardOrder = prevCardIndex === -1 ? 0 : getCardOrder(prevCardIndex, 0);
    const nextCardOrder = getCardOrder(nextCardIndex, prevCardOrder + 1);

    return [prevCardOrder, nextCardOrder];
  }

  private calculateMean(prevCardOrder: number, nextCardOrder: number) {
    let mean = 0;
    if (prevCardOrder === 0 && nextCardOrder < 0) {
      mean = nextCardOrder * 2;
    } else {
      mean = (prevCardOrder + nextCardOrder) / 2;
    }
    return mean;
  }

  private getNewCardOrder(index: number): number {
    const [prevCardOrder, nextCardOrder] = this.getPrevAndNextCardOrders(index);
    return this.calculateMean(prevCardOrder, nextCardOrder);
  }

  private onDragEnd(event: IVueDraggableEvent) {
    this.$emit("drag-end");

    void nextRender().then(() => {
    });

    this.dragging = false;

    if (event.oldDraggableIndex === event.newDraggableIndex
     && event.from === event.to) return;

    const newCard = this.cards[event.newIndex];
    // Avoid calling onDragEnd after onAdd event: It should do it on it's own.
    if (!newCard) return;

    if (this.move && newCard.orderRef) {
      const order = this.getNewCardOrder(event.newIndex);
      this.move(newCard.orderRef, order);
    }
  }

  private onAdd(event: IVueDraggableEvent) {
    const newCard = this.cards[event.newIndex];
    if (this.add && newCard.groupRef) {
      this.onDragEnd(event);
      this.add(newCard.groupRef, this.id);
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

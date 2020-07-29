<template>
  <div class="column_container" :style="style">
    <div class="column_header">
      <ModalUserView
        v-if="modalView !== null"
        :initial-view="modalView"
        @close="modalView = null"
      />
      <!-- input type="checkbox"
                v-model="isAllSelected"
                class="column_select_checkbox" -->
      <div
        class="column_header__title_block"
        :style="titleStyle"
      >
        <span
          class="column_header__title"
          :title="title"
        >
          {{ title }}
        </span>
        <span class="column_controls">
          <i
            class="material-icons card_open_icon"
            style="font-size: 20px;"
            @click="openModal"
          >add</i>
          <!-- i class="material-icons card_open_icon">more_vert</i -->
        </span>
      </div>
    </div>
    <draggable
      class="column_body"
      group="cards"
      ghost-class="card_dragging"
      :options="{delayOnTouchOnly: true, delay: 400, forceFallback: true}"
      :list="cards"
      @add="onAdd"
      @end="onMove"
    >
      <Card
        v-for="(card, index) in cards"
        :key="index"
        :data="card"
        :width="width"
        :selected="isCardSelected(card.groupRef.position)"
      />
    </draggable>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import draggable from "vuedraggable";
import * as R from "ramda";

import ModalUserView from "@/components/ModalUserView.vue";

import Card, { ICard } from "@/components/kanban/Card.vue";
import { ValueRef } from "../../local_user_view";
import { IQuery } from "../../state/query";

export interface IColumn {
  id?: any;
  title: string;
  createView?: IQuery;
  fieldName?: string;
  cards: ICard[];
}

// This is an interface to a 3rd Party Vue plugin
// It lists only properties that are used or are of use for the board
// Consult https://github.com/SortableJS/Vue.Draggable
// Please add types to this interface if something you use is missing
export interface IVueDraggableEvent {
  type: "start" | "add" | "remove" | "update" | "end" | "choose" | "unchoose" | "sort" | "filter" | "clone";
  originalEvent: Event;
  newIndex: number;
  oldIndex: number;
  oldDraggableIndex: number;
  newDraggableIndex: number;
}

export interface IColumnStyle {
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  flex?: number;
}

@Component({ components: { Card, draggable, ModalUserView } })
export default class Column extends Vue {
  @Prop() id!: any;
  @Prop({ type: Array, required: true }) cards!: ICard[];
  @Prop({ type: String, required: true }) title!: string;
  @Prop({ type: String, required: true }) fieldName!: string;
  @Prop({ type: Object, required: true }) createView!: IQuery;
  @Prop({ type: Function, required: false }) add!: (ref: ValueRef, value: any) => void;
  @Prop({ type: Function, required: false }) move!: (ref: ValueRef, value: any) => void;
  @Prop({ type: Number, required: false, default: 300 }) width!: number;
  @Prop({ type: Boolean, default: false }) lastColumn!: boolean;

  modalView: IQuery | null = null;

  selected: number[] = [];

  private openModal() {
    const query: IQuery = {
      args: {
        ...this.createView.args,
      },
      defaultValues: {
        [this.fieldName]: this.id,
      },
    };

    this.modalView = query;
  }

  private isCardSelected(rowIndex: number) {
    return this.selected.includes(rowIndex);
  }

  private get style(): IColumnStyle {
    const strWidth = `${this.width}px`;
    const finalWidth = this.lastColumn ? undefined : strWidth;
    return {
      width: finalWidth,
      minWidth: strWidth,
      maxWidth: finalWidth,
      flex: this.lastColumn ? 1 : undefined,
    }
  }

  private get titleStyle(): IColumnStyle {
    const strWidth = `${this.width}px`;
    return {
      maxWidth: strWidth,
    }
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

  private onMove(event: IVueDraggableEvent) {
    const newCard = this.cards[event.newIndex];
    // Avoid calling onMove after onAdd event: It should do it on it's own.
    if (newCard) {
      const prevCardOrder = R.pathOr<number>(0, [event.newIndex - 1, "order"], this.cards);
      const nextCardOrder = R.pathOr<number>(prevCardOrder + 1, [event.newIndex + 1, "order"], this.cards);
      const mean = (prevCardOrder + nextCardOrder) / 2;
    }
  }

  private onAdd(event: IVueDraggableEvent) {
    const newCard = this.cards[event.newIndex];
    this.onMove(event);
    if (this.add && newCard.groupRef) {
      this.add(newCard.groupRef, this.id);
    }
  }
}
</script>

<style scoped>
  .column_container {
    color: var(--MainTextColor);
    border: 1px solid var(--MainBorderColor);
    box-sizing: content-box;
    display: flex;
    flex-direction: column;
  }

  .column_header {
    border-bottom: 1px solid var(--MainBorderColor);
    padding: 10px;
    display: flex;
  }

  .column_header__title_block {
    display: flex;
    width: 100%;
  }

  .column_header__title {
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .column_select_checkbox {
    vertical-align: middle;
  }

  .column_body {
    padding: 15px 10px 0 10px;
    overflow-y: auto;
    height: 100%;
  }

  .column_controls {
    margin-left: auto;
  }

  .column_controls > i {
    vertical-align: middle;
  }

  @media screen and (max-width: 700px) {
    .column_container {
      width: unset;
      min-width: 50vw;
    }
  }

  @media screen and (max-width: 490px) {
    .column_container {
      min-width: 80vw;
    }
  }

  .card_dragging {
    background-color: var(--MainBorderColor);
    width: 100%;
    height: 15px;
  }

  .card_open_icon {
    padding: 2px;
    border-radius: 2px;
    cursor: pointer;
    background-color: initial;
    color: initial;
    transition: background-color 0.5s ease;
    transition: color 0.25s ease;
  }

  .card_open_icon:hover {
    transition: background-color 0.5s ease;
    transition: color 0.25s ease;
    background-color: var(--SuccessColor);
    color: var(--MainBackgroundColor);
  }

  /deep/ .card_dragging > .card_row {
    display: none;
  }
</style>

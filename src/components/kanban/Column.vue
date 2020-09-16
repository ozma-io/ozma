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
          {{ title }} {{ cardCount }}
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
      v-dragscroll.y
      class="column_body"
      :group="{ name: 'cards', put: true }"
      ghost-class="card_dragging_ghost"
      chosen-class="card_dragging_chosen"
      drag-class="card_dragging_drag"
      :delayOnTouchOnly= "true"
      :delay="400"
      :animation= "500"
      :list="cards"
      @add="onAdd"
      @start="onStart"
      @end="onMove"
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
      />
    </draggable>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import draggable from "vuedraggable";
import * as R from "ramda";

import ModalUserView from "@/components/ModalUserView.vue";

import Card, { ICard, CardTarget } from "@/components/kanban/Card.vue";
import { ValueRef } from "../../local_user_view";
import { IQuery } from "../../state/query";
import { dragscroll } from 'vue-dragscroll';
import { nextRender } from "@/utils";

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

@Component({ components: { Card, draggable, ModalUserView }, directives: { dragscroll } })
export default class Column extends Vue {
  @Prop() id!: any;
  @Prop({ type: Array, required: true }) cards!: ICard[];
  @Prop({ type: String, required: true }) title!: string;
  @Prop({ type: String, required: true }) fieldName!: string;
  @Prop({ type: String, required: true }) orderFieldName!: string;
  @Prop({ type: Object, required: true }) createView!: IQuery;
  @Prop({ type: Function, required: false }) add!: (ref: ValueRef, value: any) => void;
  @Prop({ type: Function, required: false }) move!: (ref: ValueRef, value: any) => void;
  @Prop({ type: Number, required: false, default: 300 }) width!: number;
  @Prop({ type: String, required: false }) cardTarget!: CardTarget;

  modalView: IQuery | null = null;

  selected: number[] = [];
  dragging = false;

  private openModal() {
    const query: IQuery = {
      args: {
        ...this.createView.args,
      },
      defaultValues: {
        [this.fieldName]: this.id,
      },
    };

    if(this.orderFieldName.length > 0){
      query.defaultValues[this.orderFieldName] = this.cards[0] && this.cards[0].order ? this.cards[0].order - 1 : 1;
    }

    this.modalView = query;
  }

  private isCardSelected(rowIndex: number) {
    return this.selected.includes(rowIndex);
  }

  private get style(): IColumnStyle {
    return {
      width: `${this.width}px`
    }
  }

  private get titleStyle(): IColumnStyle {
    const strWidth = `${this.width}px`;
    return {
      maxWidth: strWidth,
    }
  }

  private get cardCount() {
    return (this.cards.length > 0) ? `(${this.cards.length})` : '';
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

  private onStart(event: IVueDraggableEvent){
    this.dragging = true;
  }

  private onMove(event: IVueDraggableEvent) {

    nextRender().then(() => {
      this.dragging = false;
    });
    
    const newCard = this.cards[event.newIndex];
    // Avoid calling onMove after onAdd event: It should do it on it's own.
    if (newCard) {
      const prevCardIndex = event.newIndex - 1;
      const prevCardOrder = (
        prevCardIndex > -1
          ? R.pathOr<number>(0, [event.newIndex - 1, "order"], this.cards)
          : 0
      );
      const nextCardOrder = R.pathOr<number>(prevCardOrder + 1, [event.newIndex + 1, "order"], this.cards);
      
      let mean = 0;
      if(prevCardOrder == 0 && nextCardOrder < 0){
        mean = nextCardOrder * 2 ;
      }else{
        mean = (prevCardOrder + nextCardOrder) / 2;
      }
      
      if (this.move && newCard.orderRef) {
        this.move(newCard.orderRef, mean);
      }
    }
  }

  private onAdd(event: IVueDraggableEvent) {
    const newCard = this.cards[event.newIndex];
    if (this.add && newCard.groupRef) {
      this.onMove(event);
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
    background-color: #fff0f5;
    border-bottom: 1px solid var(--MainBorderColor);
    border-top: 1px solid var(--MainBorderColor);
    padding: 10px 10px 10px 12px;
    display: flex;
    opacity: 0.5;
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
    background-color: rgba(255, 250, 250, 0.6);
  }

  .column_controls {
    margin-left: auto;
  }

  .column_controls > i {
    vertical-align: middle;
  }

  .card_dragging_ghost {
    background-color: black;
    width: 100%;
    height: 5px;
    margin-top: -10px;
    margin-bottom: 5px;
    padding: 0;
    border: solid 2px black;
    opacity: 0.8 !important;
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

  /deep/ .card_dragging_chosen.card_dragging_ghost > .card_row {
    visibility: hidden;
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

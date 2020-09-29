<template>
  <!-- <draggable tag="v-layout" v-model="columns" group="column"> -->
  <div 
    v-dragscroll.x="!isMobile" 
    class="board_container"
  >
    <Column
      v-for="(column, columnIndex) in columns"
      :id="column.id"
      :key="columnIndex"
      :title="getColumnTitle(column.id, column.title)"
      :field-name="column.fieldName"
      :order-field-name="column.orderFieldName"
      :create-view="column.createView"
      :cards="column.cards"
      :card-target="cardTarget"
      :width="columnWidth"
      :header-color="columnHeaderColor"
      :add="add"
      :move="move"
      @goto="$emit('goto', $event)"
    />
  </div>
  <!-- </draggable> -->
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import draggable from "vuedraggable";

import { ICard, CardTarget } from "@/components/kanban/Card.vue";
import Column, { IColumn } from "@/components/kanban/Column.vue";
import { ValueRef } from "../../local_user_view";
import { dragscroll } from "vue-dragscroll";
import { isMobile } from "@/utils";

@Component({ components: { Column, draggable }, directives: { dragscroll } })
export default class Board extends Vue {
  @Prop({ type: Array, required: true }) columns!: IColumn[];
  @Prop({ type: Function, required: false }) add!: (ref: ValueRef, value: any) => void;
  @Prop({ type: Function, required: false }) move!: (ref: ValueRef, value: any) => void;
  @Prop({ type: Object }) titles!: { [key: number]: string } | null;
  @Prop({ type: Number }) columnWidth!: number | null;
  @Prop({ type: String }) columnHeaderColor!: string;
  @Prop({ type: String, required: false }) cardTarget!: CardTarget;

  private get isMobile(): boolean {
    return isMobile;
  }

  private getColumnTitle(id: number, title: string) {
    if (this.titles) {
      return this.titles[id] || title;
    }
    return title;
  }
}
</script>

<style scoped lang="css">  
  .board_container {
    width: 100%;
    height: 100%;
    overflow-y: hidden;
    overflow-x: auto;
    display: flex;
    flex-direction: row;
    max-height: calc(100vh - 56px);
  }

  /deep/ .column_container {
    border-left: 0;
    border-top: 0;
    border-bottom: 0;
  }

  /deep/ .column_container:last-of-type {
    border-right: 0;
  }
</style>

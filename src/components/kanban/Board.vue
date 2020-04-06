<template>
  <!-- <draggable tag="v-layout" v-model="columns" group="column"> -->
  <div class="board_container">
    <Column
      v-for="(column, columnIndex) in columns"
      :id="column.id"
      :key="columnIndex"
      :title="getColumnTitle(column.id, column.title)"
      :field-name="column.fieldName"
      :create-view="column.createView"
      :cards="column.cards"
      :add="add"
      :move="move"
    />
  </div>
  <!-- </draggable> -->
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import draggable from "vuedraggable";

import { ICard } from "@/components/kanban/Card.vue";
import Column, { IColumn } from "@/components/kanban/Column.vue";
import { ValueRef } from "../../local_user_view";

@Component({ components: { Column, draggable } })
export default class Board extends Vue {
  @Prop({ type: Array, required: true }) columns!: IColumn[];
  @Prop({ type: Function, required: false }) add!: (ref: ValueRef, value: any) => void;
  @Prop({ type: Function, required: false }) move!: (ref: ValueRef, value: any) => void;
  @Prop({ type: Object }) titles!: { [key: number]: string } | null;

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

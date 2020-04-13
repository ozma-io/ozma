<template>
  <div
    :class="['table-cell-edit', {'table-cell-edit_last-fixed': isLastFixedCell}]"
    :style="{
      top: `${coords.y}px`,
      left: `${coords.x}px`,
      height: height ? `${height}px` : 'auto',
      width: width ? `${width}px` : '200px'
    }"
  >
    <slot />
  </div>
</template>

<script lang="ts">
export interface ICellCoords {
  x: number;
  y: number;
}

export interface IEditParams {
  width: number;
  height: number;
}

import {Component, Prop, Vue} from "vue-property-decorator";

@Component
export default class TableCellEdit extends Vue {
  @Prop({default: () => ({x: 0, y: 0}) }) coords!: ICellCoords;
  @Prop() width!: number;
  @Prop() height!: number;
  @Prop({type: Boolean, default: false}) isLastFixedCell!: boolean;
}
</script>

<style scoped>
  .table-cell-edit {
    box-shadow: 0 0 10px 5px var(--MainBorderColor);
    background: #fff;
    display: flex;
    box-sizing: border-box;
    padding: 5px;
    align-items: center;
    position: fixed;
    top: 0;
    z-index: 9999;
  }

  .table-cell-edit_last-fixed {
    padding: 5px 5px 5px 7px;
  }
</style>

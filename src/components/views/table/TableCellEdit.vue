<template>
  <div
    :class="[
      'table-cell-edit',
      'border',
      'shadow-lg',
      {
        'table-cell-edit_last-fixed': isLastFixedCell
      }
    ]"
    :style="{
      top: `${coords.y}px`,
      left: `${coords.x}px`,
      height: height ? `${height}px` : 'auto',
      minHeight: minHeight ? `${minHeight}px` : 'auto',
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
  minHeight: number;
}

import { Component, Prop, Vue } from "vue-property-decorator";

@Component
export default class TableCellEdit extends Vue {
  @Prop({ default: () => ({ x: 0, y: 0 }) }) coords!: ICellCoords;
  @Prop() width!: number;
  @Prop() height!: number;
  @Prop() minHeight!: number;
  @Prop({ type: Boolean, default: false }) isLastFixedCell!: boolean;
}
</script>

<style scoped>
  .table-cell-edit {
    background: #fff;
    position: fixed;
    top: 0;
    z-index: 9999;
  }

  .table-cell-edit_last-fixed {
    padding: 2px 2px 0 2px;
  }
</style>

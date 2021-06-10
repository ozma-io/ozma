<template>
  <div
    :class="[
      'table-cell-edit',
      'border',
    ]"
    :style="{
      top: `${coords.y}px`,
      left: `${coords.x}px`,
      height: height ? `${height}px` : 'auto',
      '--editor-height': height ? `${height}px` : 'auto',
      minHeight: minHeight ? `${minHeight}px` : 'auto',
      width: width ? `${width}px` : '200px',
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
}
</script>

<style scoped>
  .table-cell-edit {
    background: transparent;
    height: auto !important; /* TODO: So do we need `height` in `:style` at all? */
    position: fixed;
    top: 0;
    z-index: 9999;

    /* First shadow is as `shadow-lg` */
    box-shadow:
      0 1rem 3rem rgba(0, 0, 0, 0.175),
      0 0 0 0.2rem var(--FocusBorderColor);
  }
</style>

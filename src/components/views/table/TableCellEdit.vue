<template>
  <div
    ref="cellEdit"
    :class="[
      'cell-variant',
      'cell-local-variant',
      'table-cell-edit',
      'border',
    ]"
    :style="{
      top: `${cellCoords.y}px`,
      left: `${cellCoords.x}px`,
      '--editor-height': height ? `${height}px` : 'auto',
      minHeight: minHeight ? `${minHeight}px` : 'auto',
      minWidth: width ? `${width}px` : '200px',
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

  private movedCellCoords: ICellCoords | null = null;

  private mounted() {
    const cellRect = (this.$refs["cellEdit"] as HTMLElement).getBoundingClientRect();
    const viewportRect = document.querySelector(".userview-div")?.getBoundingClientRect();
    if (!viewportRect) {
      throw Error("Can't find `.userview-div` selector");
    }

    const offsetX = cellRect.right > viewportRect.right ? cellRect.right - viewportRect.right : 0;
    const offsetY = cellRect.bottom > viewportRect.bottom ? cellRect.bottom - viewportRect.bottom : 0;

    this.movedCellCoords = {
      x: cellRect.x - offsetX,
      y: cellRect.y - offsetY,
    };
  }

  private get cellCoords(): ICellCoords {
    return this.movedCellCoords ?? this.coords;
  }
}
</script>

<style lang="scss" scoped>
  @include variant-to-local("cell");

  .table-cell-edit {
    background: var(--cell-backgroundColor);
    height: auto !important;
    width: auto;
    position: fixed;
    top: 0;
    z-index: 9999;

    /* First shadow is as `shadow-lg` */
    box-shadow:
      0 1rem 3rem rgba(0, 0, 0, 0.175),
      0 0 0 0.2rem var(--FocusBorderColor);
  }
</style>

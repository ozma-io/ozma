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
import { Component, Prop, Vue, Watch } from "vue-property-decorator";

interface ICellCoords {
  x: number;
  y: number;
}

@Component
export default class TableCellEdit extends Vue {
  @Prop({ type: Number }) x!: number | undefined;
  @Prop({ type: Number }) y!: number | undefined;
  @Prop() width!: number;
  @Prop() height!: number;
  @Prop() minHeight!: number;

  private movedCellCoords: ICellCoords | null = null;

  private updateMovedCoords() {
    const cellRect = (this.$refs["cellEdit"] as HTMLElement | undefined)?.getBoundingClientRect();
    if (!cellRect) {
      this.movedCellCoords = null;
      return;
    }
    const viewportRect = document.querySelector(".userview-div")?.getBoundingClientRect();
    if (!viewportRect) {
      this.movedCellCoords = null;
      throw Error("Can't find `.userview-div` selector");
    }

    const offsetX = cellRect.right > viewportRect.right ? cellRect.right - viewportRect.right : 0;
    const offsetY = cellRect.bottom > viewportRect.bottom ? cellRect.bottom - viewportRect.bottom : 0;

    this.movedCellCoords = {
      x: this.sourceCoords.x - offsetX,
      y: this.sourceCoords.y - offsetY,
    };
  }

  private mounted() {
    this.updateMovedCoords();
  }

  @Watch("sourceCoords")
  private coordsUpdated() {
    this.updateMovedCoords();
  }

  private get sourceCoords(): ICellCoords {
    return { x: this.x ?? 0, y: this.y ?? 0 };
  }

  private get cellCoords(): ICellCoords {
    return this.movedCellCoords ?? this.sourceCoords;
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

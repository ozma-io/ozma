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
      '--table-cell-edit-height': height ? `${height}px` : 'auto',
      minHeight: minHeight ? `${minHeight}px` : 'auto',
      maxHeight: `${maxHeight}px`,
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

  /* TableCellEdit can be bigger than cell it represents, but we need to constrain it's max-height by screen height.
   * We can't do it by CSS, so we update it in JS */
  private maxHeight = 0;

  /* TableCellEdit's height can be changed by editing
   * and to keep it's position updated we need to observe it by ResizeObserver */
  private resizeObserver: ResizeObserver | null = null;

  private updateMaxHeight() {
    const viewportRect = document.querySelector(".userview-div")?.getBoundingClientRect();
    this.maxHeight = viewportRect?.height ?? this.height;
  }

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

    const cellRight = this.sourceCoords.x + cellRect.width;
    const cellBottom = this.sourceCoords.y + cellRect.height;
    const offsetX = cellRight > viewportRect.right ? cellRight - viewportRect.right : 0;
    const offsetY = cellBottom > viewportRect.bottom ? cellBottom - viewportRect.bottom : 0;

    this.movedCellCoords = {
      x: this.sourceCoords.x - offsetX,
      y: this.sourceCoords.y - offsetY,
    };
  }

  private mounted() {
    const cellRef = this.$refs["cellEdit"] as HTMLElement | undefined;
    if (!cellRef) {
      throw Error("Can't find `cellEdit` ref");
    }
    this.resizeObserver = new ResizeObserver(() => this.updateMovedCoords());
    this.resizeObserver.observe(cellRef);
    this.updateMovedCoords();
    this.updateMaxHeight();

    /* eslint-disable @typescript-eslint/unbound-method */
    window.addEventListener("resize", this.updateMaxHeight);
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  private beforeDestroy() {
    this.resizeObserver?.disconnect();
    /* eslint-disable @typescript-eslint/unbound-method */
    window.removeEventListener("resize", this.updateMaxHeight);
    /* eslint-enable @typescript-eslint/unbound-method */
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

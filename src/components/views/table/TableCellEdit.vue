<template>
  <div
    ref="cellEdit"
    :class="['cell-variant', 'cell-local-variant', 'table-cell-edit', 'border']"
    :style="{
      top: `${renderedCellCoords.y}px`,
      left: `${renderedCellCoords.x}px`,
      '--table-cell-edit-height': height ? `${height}px` : 'auto',
      minHeight: minHeight ? `${minHeight}px` : 'auto',
      maxHeight: `${maxHeight}px`,
      minWidth: width && width > 200 ? `${width}px` : '200px',
    }"
  >
    <slot />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator'

interface ICellCoords {
  x: number
  y: number
}

@Component
export default class TableCellEdit extends Vue {
  @Prop({ type: Number }) x!: number | undefined
  @Prop({ type: Number }) y!: number | undefined
  @Prop() width!: number
  @Prop() height!: number
  @Prop() minHeight!: number

  private movedCellCoords: ICellCoords | null = null

  /* TableCellEdit can be bigger than cell it represents, but we need to constrain it's max-height by screen height.
   * We can't do it by CSS, so we update it in JS */
  private maxHeight = 0

  /* TableCellEdit's height can be changed by editing
   * and to keep it's position updated we need to observe it by ResizeObserver */
  private resizeObserver: ResizeObserver | null = null

  private getFixedContainingBlock(): HTMLElement | null {
    let current = (this.$el as HTMLElement | undefined)?.parentElement ?? null

    while (current) {
      const style = window.getComputedStyle(current)
      const backdropFilter =
        style.backdropFilter || style.getPropertyValue('backdrop-filter')
      const webkitBackdropFilter = style.getPropertyValue(
        '-webkit-backdrop-filter',
      )
      const willChange = style.willChange || ''
      const contain = style.contain || ''
      const hasContainingBlock =
        style.transform !== 'none' ||
        style.perspective !== 'none' ||
        style.filter !== 'none' ||
        (backdropFilter !== '' && backdropFilter !== 'none') ||
        (webkitBackdropFilter !== '' && webkitBackdropFilter !== 'none') ||
        contain.includes('paint') ||
        willChange.includes('transform') ||
        willChange.includes('filter')

      if (hasContainingBlock) {
        return current
      }

      current = current.parentElement
    }

    return null
  }

  private getViewportRect(): DOMRect {
    const ownRoot = this.$el as HTMLElement | undefined
    const viewport = ownRoot?.closest('.userview-div')

    if (viewport instanceof HTMLElement) {
      return viewport.getBoundingClientRect()
    }

    return new DOMRect(0, 0, window.innerWidth, window.innerHeight)
  }

  private updateMaxHeight() {
    this.maxHeight = this.getViewportRect().height || this.height || 0
  }

  private updateMovedCoords() {
    const cellRect = (
      this.$refs['cellEdit'] as HTMLElement | undefined
    )?.getBoundingClientRect()
    if (!cellRect) {
      this.movedCellCoords = null
      return
    }
    const viewportRect = this.getViewportRect()

    const cellRight = this.sourceCoords.x + cellRect.width
    const cellBottom = this.sourceCoords.y + cellRect.height
    const offsetX =
      cellRight > viewportRect.right ? cellRight - viewportRect.right : 0
    const offsetY =
      cellBottom > viewportRect.bottom ? cellBottom - viewportRect.bottom : 0

    this.movedCellCoords = {
      x: this.sourceCoords.x - offsetX,
      y: this.sourceCoords.y - offsetY,
    }
  }

  private mounted() {
    const cellRef = this.$refs['cellEdit'] as HTMLElement | undefined
    if (!cellRef) {
      throw Error("Can't find `cellEdit` ref")
    }
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.updateMovedCoords())
      this.resizeObserver.observe(cellRef)
    }
    this.updateMovedCoords()
    this.updateMaxHeight()

    /* eslint-disable @typescript-eslint/unbound-method */
    window.addEventListener('resize', this.updateMaxHeight)
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  private beforeDestroy() {
    this.resizeObserver?.disconnect()
    /* eslint-disable @typescript-eslint/unbound-method */
    window.removeEventListener('resize', this.updateMaxHeight)
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  @Watch('sourceCoords')
  private coordsUpdated() {
    this.updateMovedCoords()
  }

  private get sourceCoords(): ICellCoords {
    return { x: this.x ?? 0, y: this.y ?? 0 }
  }

  private get cellCoords(): ICellCoords {
    return this.movedCellCoords ?? this.sourceCoords
  }

  private get renderedCellCoords(): ICellCoords {
    const coords = this.cellCoords
    const containingBlock = this.getFixedContainingBlock()

    if (!containingBlock) {
      return coords
    }
    const containingBlockRect = containingBlock.getBoundingClientRect()

    return {
      x: coords.x - containingBlockRect.left + containingBlock.scrollLeft,
      y: coords.y - containingBlockRect.top + containingBlock.scrollTop,
    }
  }
}
</script>

<style lang="scss" scoped>
@include variant-to-local('cell');

.table-cell-edit {
  display: flex;
  position: fixed;
  top: 0;
  z-index: 9999;
  box-shadow:
    0 1rem 3rem rgba(0, 0, 0, 0.175),
    0 0 0 0.2rem var(--FocusBorderColor); /* First shadow is as `shadow-lg` */
  background: var(--cell-backgroundColor);
  padding: 1rem 0.5rem 0 0.5rem;
  width: min-content;
  font-size: 0.875rem;

  ::v-deep .input-textarea {
    padding: 0;
  }

  ::v-deep {
    .select-container {
      border: none;
    }
  }
}
</style>

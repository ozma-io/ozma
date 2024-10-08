<template>
  <div
    v-dragscroll:nochilddrag.x="!$isMobile"
    :class="['board_container', { dragging: dragging }]"
  >
    <Column
      v-for="(column, columnIndex) in columns"
      :key="column.key"
      data-dragscroll
      :title="column.title ? $ustOrEmpty(column.title) : undefined"
      :cards="column.cards"
      :width="columnWidth"
      :color-variables="column.colorVariables"
      :background-color="backgroundColor"
      :create-button="createButton"
      :allow-dragging="allowDragging"
      @add="onAdd(column.column, columnIndex, ...arguments)"
      @move="onMove(column.column, columnIndex, ...arguments)"
      @remove="onRemove(column.column, columnIndex, ...arguments)"
      @create="$emit('create', column.column, columnIndex)"
      @drag-start="dragging = true"
      @drag-end="dragging = false"
    >
      <template #card="card">
        <slot name="card" :column="column.column" v-bind="card" />
      </template>
    </Column>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import { dragscroll } from 'vue-dragscroll'

import { ICard, default as Column } from '@/components/kanban/Column.vue'
import { UserString } from '@/state/translations'

export interface IColumn<CardT, ColumnT> {
  title: UserString | null
  key: unknown
  column: ColumnT
  cards: ICard<CardT>[]
}

@Component({ components: { Column }, directives: { dragscroll } })
export default class Board extends Vue {
  @Prop({ type: Array, required: true }) columns!: IColumn<unknown, unknown>[]
  @Prop({ type: Boolean, default: false }) createButton!: boolean
  @Prop({ type: Number }) columnWidth!: number | null
  @Prop({ type: String }) backgroundColor!: string
  @Prop({ type: Boolean, default: false }) allowDragging!: string

  private dragging = false

  private onAdd(
    column: unknown,
    columnIndex: number,
    card: unknown,
    newIndex: number,
  ) {
    this.$emit('add', column, columnIndex, card, newIndex)
  }

  private onMove(
    column: unknown,
    columnIndex: number,
    card: unknown,
    oldIndex: number,
    newIndex: number,
  ) {
    this.$emit('move', column, columnIndex, card, oldIndex, newIndex)
  }

  private onRemove(
    column: unknown,
    columnIndex: number,
    card: unknown,
    oldIndex: number,
  ) {
    this.$emit('remove', column, columnIndex, card, oldIndex)
  }
}
</script>

<style lang="scss" scoped>
.board_container {
  display: flex;
  flex-direction: row;
  gap: 0.625rem;
  background-color: var(--userview-background-color);
  padding: 1.875rem 2.25rem;
  width: 100%;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;

  @include mobile {
    padding: 1rem;
  }

  &.dragging {
    cursor: grabbing !important;
  }
}
</style>

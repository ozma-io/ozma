<template>
  <tr :style="style" :class="['table-tr', { selected: row.extra.selected }]">
    <td
      v-if="showSelectionColumn"
      class="fixed-cell select-row-cell"
      :class="{
        'last-fixed-cell': !showLinkColumn && fixedColumnsLength === 0,
      }"
      @click="$emit('select', $event)"
    >
      <div class="cell-wrapper">
        <Checkbox :checked="row.extra.selected" />
      </div>
    </td>
    <td
      v-if="showLinkColumn"
      class="fixed-cell add-entry-cell"
      :class="{
        'without-selection-cell': !showSelectionColumn,
        'has-link': row.extra.link,
        'last-fixed-cell': fixedColumnsLength === 0,
      }"
    >
      <OzmaLink
        v-if="row.extra.link"
        :link="row.extra.link"
        class="icon-link"
        @goto="$emit('goto', $event)"
      >
        <i class="material-icons edit-in-modal-icon">edit_note</i>
      </OzmaLink>
    </td>
    <TableCell
      v-for="(i, tableColI) in columnIndexes"
      :key="i"
      ref="cells"
      :uv="uv"
      :row="row"
      :value="row.values[i]"
      :tree="row.extra.tree || undefined"
      :column-index="i"
      :column="columns[i]"
      :not-existing="notExisting"
      :last-fixed="tableColI === fixedColumnsLength - 1"
      :fixed-left="fixedColumnPositions[i]"
      :show-tree="showTree"
      :height="height"
      :show-add-child="Boolean(uv.emptyRow)"
      @cell-click="$emit('cell-click', tableColI, arguments[0], arguments[1])"
      @cell-mousedown="
        $emit('cell-mousedown', tableColI, arguments[0], arguments[1])
      "
      @cell-mouseover="
        $emit('cell-mouseover', tableColI, arguments[0], arguments[1])
      "
      @cell-mouseup="
        $emit('cell-mouseup', tableColI, arguments[0], arguments[1])
      "
      @cell-contextmenu="
        $emit('cell-contextmenu', tableColI, arguments[0], arguments[1])
      "
      @toggle-children="$emit('toggle-children', $event)"
      @add-child="$emit('add-child')"
      @goto="$emit('goto', $event)"
    />
  </tr>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'

import TableCell from '@/components/views/table/TableCell.vue'
import Checkbox from '@/components/checkbox/Checkbox.vue'
import type {
  IColumn,
  ITableCombinedUserView,
  ITableExtendedRowCommon,
} from '@/components/views/Table.vue'

@Component({
  components: {
    TableCell,
    Checkbox,
  },
})
export default class TableRow extends Vue {
  // The reason this is not a functional component is because of performance.
  // See https://forum.vuejs.org/t/performance-for-large-numbers-of-components/13545/10
  @Prop({ type: Object, required: true }) row!: ITableExtendedRowCommon
  @Prop({ type: Array, required: true }) columnIndexes!: number[]
  @Prop({ type: Array, required: true }) columns!: IColumn[]
  @Prop({ type: Object, required: true }) fixedColumnPositions!: Record<
    number,
    number
  >
  @Prop({ type: Number, required: true }) fixedColumnsLength!: number
  @Prop({ type: Object, required: true }) uv!: ITableCombinedUserView
  @Prop({ type: Boolean, default: false }) notExisting!: boolean
  @Prop({ type: Boolean, default: false }) showTree!: boolean
  @Prop({ type: Boolean, default: false }) showLinkColumn!: boolean
  @Prop({ type: Boolean, default: false }) showSelectionColumn!: boolean

  private getRowAttr(name: string) {
    return this.row.attributes?.[name] || this.uv.attributes[name]
  }

  get style() {
    const style: Record<string, unknown> = {}

    if (this.height !== null) {
      style['white-space'] = 'nowrap'
      style['--max-height'] = `${this.height}px`
    }

    return style
  }

  get height() {
    const raw = this.getRowAttr('row_height')
    if (typeof raw === 'number') {
      return raw
    } else {
      return null
    }
  }
}
</script>

<style lang="scss" scoped>
.disabled-cell {
  background-color: var(--ControlDisableColor);
}

.add-entry-cell {
  width: 100%;
  height: 100%;
}
.icon-link {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  padding-top: 1.25rem;
  width: 100%;
  height: 100%;
  color: var(--icon-color);
  &:hover {
    background-color: var(--button-hover-background);
    text-decoration: none;
  }
}

.table-tr {
  background-color: var(--table-backgroundColor);
  height: 100%;
}

td {
  vertical-align: top;
  background-color: var(--cell-backgroundColor, var(--table-backgroundColor));
  overflow: hidden;
  color: var(--cell-foregroundColor, var(--table-foregroundColor));
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-row-cell {
  height: 100%;
  .cell-wrapper {
    height: 100%;
  }
}

.selected td {
  background-color: var(--table-backgroundDarker1Color);
  color: var(--table-foregroundColor);
}

.table-tr > td:last-child {
  border-right: none;
}

td ::v-deep p {
  max-height: var(--max-height, 10rem);
  overflow-y: auto;
}

td ::v-deep p {
  margin: 0;
  width: 100%;
  overflow: hidden;
  line-height: normal;
  text-overflow: ellipsis;
  white-space: initial;
}

td ::v-deep p:hover {
  overflow-x: hidden;
  overflow-y: auto;
}

/* !importants was used because styles for fixed columns have priority otherwise. */
td.required-cell {
  background-color: var(--WarningColor) !important;
}

td.selected {
  z-index: 15;
}

@media screen and (min-device-width: 813px) and (orientation: landscape) {
  td.select_fixed {
    position: sticky;
    z-index: 20;
  }

  .table-tr.selected .fixed-cell {
    background-color: var(--table-backgroundDarker1Color);
  }
}
</style>

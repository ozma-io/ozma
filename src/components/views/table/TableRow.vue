<template>
  <tr
    :style="style"
    :class="['table-tr', { selected: row.extra.selected }]"
  >
    <td
      v-if="showSelectionColumn"
      class="fixed-column checkbox-cells"
      @click="$emit('select', $event)"
    >
      <!-- Key is needed to force checkbox re-render when `selected` changes. Not sure why. -->
      <span class="table-td_span">
        <Checkbox :checked="row.extra.selected" />
      </span>
    </td>
    <td
      v-if="showLinkColumn"
      :class="[
        'fixed-column',
        'openform-cells',
        {
          'without-selection-cell': !showSelectionColumn,
          'has-link': row.extra.link,
        }
      ]"
    >
      <FunLink
        v-if="row.extra.link"
        :link="row.extra.link"
        class="icon-link"
        @goto="$emit('goto', $event)"
      >
        <i class="material-icons edit-in-modal-icon">open_in_new</i>
      </FunLink>
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
      :first-non-fixed="tableColI == fixedColumnsLength"
      :fixed-left="fixedColumnPositions[i]"
      :show-tree="showTree"
      :height="height"
      :show-add-child="Boolean(uv.emptyRow)"
      @cell-click="$emit('cell-click', tableColI, arguments[0], arguments[1])"
      @cell-mousedown="$emit('cell-mousedown', tableColI, arguments[0], arguments[1])"
      @cell-mouseover="$emit('cell-mouseover', tableColI, arguments[0], arguments[1])"
      @cell-mouseup="$emit('cell-mouseup', tableColI, arguments[0], arguments[1])"
      @cell-contextmenu="$emit('cell-contextmenu', tableColI, arguments[0], arguments[1])"
      @toggle-children="$emit('toggle-children', $event)"
      @add-child="$emit('add-child')"
      @goto="$emit('goto', $event)"
    />
  </tr>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

import TableCell from "@/components/views/table/TableCell.vue";
import Checkbox from "@/components/checkbox/Checkbox.vue";
import type { IColumn, ITableCombinedUserView, ITableExtendedRowCommon } from "@/components/views/Table.vue";

@Component({
  components: {
    TableCell, Checkbox,
  },
})
export default class TableRow extends Vue {
  // The reason this is not a functional component is because of performance.
  // See https://forum.vuejs.org/t/performance-for-large-numbers-of-components/13545/10
  @Prop({ type: Object, required: true }) row!: ITableExtendedRowCommon;
  @Prop({ type: Array, required: true }) columnIndexes!: number[];
  @Prop({ type: Array, required: true }) columns!: IColumn[];
  @Prop({ type: Object, required: true }) fixedColumnPositions!: Record<number, number>;
  @Prop({ type: Number, required: true }) fixedColumnsLength!: number;
  @Prop({ type: Object, required: true }) uv!: ITableCombinedUserView;
  @Prop({ type: Boolean, default: false }) notExisting!: boolean;
  @Prop({ type: Boolean, default: false }) showTree!: boolean;
  @Prop({ type: Boolean, default: false }) showLinkColumn!: boolean;
  @Prop({ type: Boolean, default: false }) showSelectionColumn!: boolean;

  private getRowAttr(name: string) {
    return this.row.attributes?.[name] || this.uv.attributes[name];
  }

  get style() {
    const style: Record<string, unknown> = {};

    if (this.height !== null) {
      style["white-space"] = "nowrap";
      style["--max-height"] = `${this.height}px`;
    }

    return style;
  }

  get height() {
    const raw = this.getRowAttr("row_height");
    if (typeof raw === "number") {
      return raw;
    } else {
      return null;
    }
  }
}
</script>

<style lang="scss" scoped>
  /* Current Z layout:
   * FormControl           (200)
   * Selected fixed cell   (20)
   * Selected cell         (15)
   */

  .fixed-place-tr {
    display: none;
  }

  .disabled-cell {
    background-color: var(--ControlDisableColor);
  }

  .icon-link {
    display: block;
    width: 20px;
    height: 20px;
    margin: 0 auto;
    overflow-y: visible;
  }

  .checkbox-cells {
    position: relative;
    cursor: pointer;
    color: var(--table-backgroundDarker1Color);

    &:hover {
      color: var(--cell-foregroundColor, var(--table-foregroundColor));
    }
  }

  .checkbox-cells > .table-td_span {
    display: flex;
    width: 100%;
    justify-content: center;
  }

  .table-tr {
    background-color: var(--table-backgroundColor);
    height: 100%;
  }

  td {
    border-right: 1px solid var(--table-backgroundDarker1Color);
    color: var(--cell-foregroundColor, var(--table-foregroundColor));
    background-color: var(--cell-backgroundColor, var(--table-backgroundColor));
    vertical-align: top;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .selected td {
    background-color: var(--table-backgroundDarker1Color);
    color: var(--table-foregroundColor);
  }

  .table-tr > td:last-child {
    border-right: none;
  }

  td ::v-deep p,
  td ::v-deep a {
    max-height: var(--max-height, 10rem);
    overflow-y: auto;
  }

  td ::v-deep p {
    overflow: hidden;
    width: 100%;
    text-overflow: ellipsis;
    line-height: normal;
    margin: 0;
    white-space: initial;
  }

  td ::v-deep p:hover {
    overflow-x: hidden;
    overflow-y: auto;
  }

  /* !importants was used because styles for fixed columns have priority otherwise. */
  td.required-cell {
    background-image: url("data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 fill=%27none%27 stroke=%27%23dc3545%27 viewBox=%270 0 12 12%27%3e%3ccircle cx=%276%27 cy=%276%27 r=%274.5%27/%3e%3cpath stroke-linejoin=%27round%27 d=%27M5.8 3.6h.4L6 6.5z%27/%3e%3ccircle cx=%276%27 cy=%278.2%27 r=%27.6%27 fill=%27%23dc3545%27 stroke=%27none%27/%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 1rem center;
    background-size: 1.25rem;
  }

  td.selected {
    z-index: 15; /* обычные ячейки ниже фиксированных */
  }

  .openform-cells {
    text-align: center;
    width: 100%;
    border-right: 1px solid var(--table-backgroundDarker1Color);

    &.has-link:hover {
      color: var(--cell-foregroundColor, var(--table-foregroundColor));
      background-color: var(--cell-backgroundDarker1Color, var(--table-backgroundDarker1Color));
      transition: background 0s;

      .edit-in-modal-icon {
        color: var(--cell-foregroundColor, var(--table-foregroundColor));
      }
    }
  }

  @media screen and (min-device-width: 813px) and (orientation: landscape) {
    .checkbox-cells {
      left: 0;
    }

    .openform-cells {
      left: 35px;

      .without-selection-cell {
        left: 0;
      }
    }

    td.select_fixed {
      position: sticky;
      z-index: 20; /* поверх обычных ячеек */
    }

    .table-tr .fixed-column {
      position: sticky;
      z-index: 20;
      background-color: var(--cell-backgroundColor, inherit);
      box-shadow: 1px 0 0 var(--table-backgroundDarker1Color);
    }

    .table-tr.selected .fixed-column {
      background-color: var(--table-backgroundDarker1Color);
    }
  }
</style>

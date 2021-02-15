<template>
  <tr
    :style="row.extra.style"
    :class="['table-tr',
             row.extra.selected ? 'selected' : 'none_selected']"
  >
    <td
      v-if="uv.extra.isSelectionColumnEnabled"
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
          'without-selection-cell': !uv.extra.isSelectionColumnEnabled,
        }
      ]"
    >
      <FunLink
        v-if="row.extra.link !== undefined"
        :link="row.extra.link"
        class="icon-link"
        @goto="$emit('goto', $event)"
      >
        <i class="material-icons edit-in-modal-icon">open_in_new</i>
      </FunLink>
    </td>
    <TableCell
      v-for="(i, index) in columnIndexes"
      :key="i"
      :value="row.values[i]"
      :children="row.extra.children"
      :arrow-down="row.extra.arrowDown === null ? false : row.extra.arrowDown"
      :column-position="i"
      :index="index"
      :column="uv.extra.columns[i]"
      :not-existing="notExisting"
      :last-fixed-column-index="lastFixedColumnIndex"
      :level="row.extra.level"
      :is-tree="isTree"
      @cell-click="$emit('cell-click', arguments[0], arguments[1])"
      @cell-mousedown="$emit('cell-mousedown', arguments[0], arguments[1])"
      @cell-mouseover="$emit('cell-mouseover', arguments[0], arguments[1])"
      @cell-mouseup="$emit('cell-mouseup', arguments[0], arguments[1])"
      @update:visibleChildren="$emit('update:visibleChildren', arguments[0], arguments[1])"
      @goto="$emit('goto', $event)"
    />
  </tr>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

import TableCell from "@/components/views/table/TableCell.vue";
import Checkbox from "@/components/checkbox/Checkbox.vue";
import type { ITableCombinedUserView, ITableExtendedRowCommon } from "@/components/views/Table.vue";

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
  @Prop({ type: Object, required: true }) uv!: ITableCombinedUserView;
  @Prop({ type: Boolean, default: false }) notExisting!: boolean;
  @Prop({ type: Boolean, default: false }) isTree!: boolean;
  @Prop({ type: Boolean, default: false }) showLinkColumn!: boolean;

  get lastFixedColumnIndex(): number {
    return this.uv.extra.columns.filter(item => item.fixed).length;
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

  .disable_cell {
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
    color: var(--MainTextColorLight);

    &:hover {
      color: var(--MainTextColor);
    }
  }

  .checkbox-cells > .table-td_span {
    display: flex;
    width: 100%;
    justify-content: center;
  }

  .table-tr {
    background-color: white; /* probably should be moved to settings */
    height: 100%;
  }

  .editing_style {
    z-index: 200 !important; /* чтобы FormControl(расположен в ячейке) отображался поверх таблицы */
    overflow: visible !important;
  }

  td {
    border-right: 1px solid var(--MainBorderColor);
    overflow: hidden;
    color: var(--TableTextColor);
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: top;
  }

  .selected td {
    background: #efefef;
  }

  .table-tr > td:last-child {
    border-right: none;
  }

  td ::v-deep p,
  td ::v-deep a {
    max-height: 154px;
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
  td.required_cell_style {
    background-color: var(--WarningColor) !important;
  }

  td.error_style {
    background-color: var(--FailColor) !important;
  }

  td.select {
    z-index: 15; /* обычные ячейки ниже фиксированных */
  }

  .openform-cells {
    text-align: center;
    width: 100%;
    border-right: 1px solid var(--MainBorderColor);
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

    .table-head .fixed-column {
      position: sticky;
      z-index: 20;
      background-color: inherit;
      box-shadow: 2px 2px 0 var(--MainBorderColor);
      border-left: 0;
      padding: 0;
    }

    .table-tr .fixed-column {
      position: sticky;
      z-index: 20;
      background-color: inherit;
      box-shadow: 1px 0 0 var(--MainBorderColor);
    }

    .table-tr.selected .fixed-column {
      background-color: #efefef;
    }
  }
</style>

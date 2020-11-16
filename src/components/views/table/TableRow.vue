<template>
  <!-- When you change anything here, also make corresponding changes in TableFixedRow! -->
  <tr
    :style="localRow.extra.style"
    :class="['table-tr',
             baseLocalRow.extra.selected ? 'selected' : 'none_selected',
             {'table-tr-new': from==='new' },
    ]"
  >
    <td
      v-if="from !== 'new'"
      :class="[{ 'hide_content': showFixedRow }, 'fixed-column', 'checkbox-cells']"
      @click="$emit('select', $event)"
    >
      <!-- Key is needed to force checkbox re-render when `selected` changes. Not sure why. -->
      <span class="table-th_span">
        <checkbox :checked="baseLocalRow.extra.selected" />
      </span>
    </td>
    <td
      v-else
      class="fixed-column checkbox-cells"
    />
    <td
      v-if="localUv.hasRowLinks"
      :class="[{ 'hide_content': showFixedRow },'fixed-column', 'opemform-cells']"
    >
      <FunLink
        v-if="localRow.extra.link !== undefined"
        :link="localRow.extra.link"
        class="icon-link"
        @goto="$emit('goto', $event)"
      >
        <i class="material-icons opemform-cells__icon">open_in_new</i>
      </FunLink>
    </td>
    <TableCell
      v-for="(i, index) in columnIndexes"
      :key="i"
      :value="row.values[i]"
      :local-value="localRow.values[i]"
      :children="localRow.extra.children"
      :arrow-down="localRow.extra.arrowDown === undefined ? false : localRow.extra.arrowDown"
      :column-position="i"
      :index="index"
      :column="localUv.columns[i]"
      :from="from"
      :last-fixed-column-index="lastFixedColumnIndex"
      :level="localRow.extra.level"
      :is-tree="isTree"
      @cell-click="$emit('cell-click', arguments[0], arguments[1])"
      @update:visibleChids="$emit('update:visibleChids', arguments[0], arguments[1])"
      @goto="$emit('goto', $event)"
    />
  </tr>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";

import TableCell from "@/components/views/table/TableCell.vue";
import Checkbox from "@/components/checkbox/Checkbox.vue";

@Component({
  components: {
    TableCell, Checkbox,
  },
})
export default class TableRow extends Vue {
  // We don't bother to set types here properly, they matter no more than for TableRow.
  // The reason this is not a functional component is because of performance.
  // See https://forum.vuejs.org/t/performance-for-large-numbers-of-components/13545/10
  @Prop({ type: Object, required: true }) row!: any;
  @Prop({ type: Object, required: true }) localRow!: any;
  @Prop({ type: Object, required: true }) baseLocalRow!: any;
  @Prop({ type: Array, required: true }) columnIndexes!: any[];
  @Prop({ type: Object, required: true }) localUv!: any;
  @Prop({ type: String, default: "existing" }) from!: string;
  @Prop({ type: Boolean, default: false }) showFixedRow!: boolean;
  @Prop({ type: Boolean, default: false }) isTree!: boolean;

  get lastFixedColumnIndex(): number {
    return this.localUv.columns.filter((item: any) => item.fixed).length;
  }
}
</script>

<style scoped>
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
    cursor: pointer;
  }

  .checkbox-cells > .table-th_span {
    display: flex;
    width: 100%;
    justify-content: center;
  }

  .table-tr-new .checkbox-cells {
    cursor: default;
  }

  .table-tr {
    background-color: white; /* цвет таблицы возможно надо сменить на настраевоемый */
    height: 100% @-moz-document url-prefix();
  }

  .editing_style {
    z-index: 200 !important; /* чтобы FormControl(расположен в ячейке) отображался поверх таблицы */
    overflow: visible !important;
  }

  .opemform-cells__icon {
    font-size: 20px;
  }

  td {
    border-right: 1px solid var(--MainBorderColor);
    padding: 4px 0 0 3px;
    overflow: hidden;
    color: var(--TableTextColor) !important;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: top;
  }

  .table-tr-new > td {
    height: 35px;
  }

  .selected td {
    background: #efefef;
  }

  .table-tr > td:last-child {
    border-right: none;
  }

  td >>> p,
  td >>> a {
    color: var(--TableTextColor) !important;
    max-height: 154px;
    overflow-y: auto;
  }

  td >>> p {
    overflow: hidden;
    width: 100%;
    text-overflow: ellipsis;
    line-height: normal;
    margin: 0;
    white-space: initial;
  }

  td >>> p:hover {
    overflow-x: hidden;
    overflow-y: auto;
  }

  td.required_cell_style {
    background-color: var(--WarningColor);
  }

  td.error_style {
    background-color: var(--FailColor) !important;
  }

  td.select {
    z-index: 15; /* обычные ячейки ниже фиксированных */
  }

  .opemform-cells {
    text-align: center;
    width: 100%;
    border-right: 1px solid var(--MainBorderColor);
  }

  @media screen and (min-device-width: 813px) and (orientation: landscape) {
    .checkbox-cells {
      left: 0;
    }

    .opemform-cells {
      left: 35px;
    }

    td.select_fixed {
      position: sticky;
      z-index: 20; /* поверх обычных ячеек */
    }

    /* .opemform-cells > span {
           justify-content: center !important;
           align-items: center;
           display: inline-flex;
           width: 100%;
           } */

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
      box-shadow: 2px 0 0 var(--MainBorderColor);
    }

    .table-tr.selected .fixed-column {
      background-color: #efefef;
    }
  }
</style>

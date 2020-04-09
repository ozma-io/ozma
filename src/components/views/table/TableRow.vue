<template>
  <!-- When you change anything here, also make corresponding changes in TableFixedRow! -->
  <tr
    :style="localRow.extra.style"
    :class="['table-tr',
             localRow.extra.selected ? 'selected' : 'none_selected',
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
        <checkbox :checked="localRow.extra.selected" />
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
      <UserViewLink
        v-if="localRow.extra.link !== undefined"
        :uv="localRow.extra.link"
        class="icon-link"
        @[indirectLinks?`click`:null]="$emit('goto', $event)"
      >
        <i class="material-icons opemform-cells__icon">open_in_new</i>
      </UserViewLink>
    </td>
    <TableCell
      v-for="(i, index) in columnIndexes"
      :key="i"
      :value="row.values[i]"
      :local-value="localRow.values[i]"
      :column-position="i"
      :index="index"
      :column="localUv.columns[i]"
      :from="from"
      :last-fixed-column-index="lastFixedColumnIndex"
      :indirect-links="indirectLinks"
      @cellClick="$emit('cellClick', arguments[0], arguments[1])"
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
  @Prop({ type: Array, required: true }) columnIndexes!: any[];
  @Prop({ type: Object, required: true }) localUv!: any;
  @Prop({ type: String, default: "existing" }) from!: string;
  @Prop({ type: Boolean, default: false }) showFixedRow!: boolean;
  @Prop({ type: Boolean, default: false }) indirectLinks!: boolean;

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
    height: 100%;
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
    border-top: 1px solid var(--MainBorderColor);
    border-right: 1px solid var(--MainBorderColor);
    padding: 5px !important;
    vertical-align: middle;
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
    max-height: 100px;
    overflow-y: auto;
  }

  td >>> p {
    display: block;
    overflow: hidden;
    width: 100%;
    text-overflow: ellipsis;
    line-height: normal;
    padding-right: 4px;
    padding-left: 1px;
    margin-bottom: 0;
    white-space: initial;
  }

  td >>> p:hover {
    overflow-x: hidden;
    overflow-y: auto;
  }

  td.required_cell_style {
    background-color: var(--RequiredBackColor);
  }

  td.error_style {
    background-color: var(--ErrorBackColor);
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
      left: 50px;
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
    }

    .table-tr .fixed-column {
      position: sticky;
      z-index: 20;
      background-color: inherit;
      box-shadow: 2px 0 0 var(--MainBorderColor);
      border-left: 0;
    }

    .table-tr.selected .fixed-column {
      background-color: #efefef;
    }
  }
</style>

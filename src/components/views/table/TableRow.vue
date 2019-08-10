<template functional>
    <!-- When you change anything here, also make corresponding changes in TableFixedRow! -->
    <tr :style="props.localRow.extra.style" :class="props.localRow.extra.selected ? 'selected table-tr' : 'none_selected table-tr'">
        <td v-if="props.from !== 'new'" @click="'select' in listeners && listeners.select($event)"
                :class="[{ 'hide_content': props.showFixedRow }, 'fixed-column', 'checkbox-cells']">
            <input type="checkbox" :checked="props.localRow.extra.selected">
        </td>
        <td v-else class="fixed-column checkbox-cells"></td>
        <td v-if="props.localUv.hasRowLinks" :class="[{'hide_content' : props.showFixedRow},'fixed-column', 'opemform-cells']">
            <UserViewLink v-if="props.localRow.extra.link !== undefined" :uv="props.localRow.extra.link">
                ⤢
            </UserViewLink>
        </td>
        <TableCell v-for="i in props.columnIndexes"
                :key="i"
                @cellClick="listeners.cellClick"
                :value="props.row.values[i]"
                :localValue="props.localRow.values[i]"
                :columnPosition="i"
                :column="props.localUv.columns[i]"
                :from="from" />
    </tr>
</template>

<script lang="ts">
    import Vue from "vue"

    import TableCell from "@/components/views/table/TableCell.vue"

    // FIXME: workaround for https://github.com/vuejs/vue/issues/7492
    Vue.component("TableCell", TableCell)

    export default {
        name: "TableRow",
        props: {
            row: { type: Object, required: true },
            localRow: { type: Object, required: true },
            columnIndexes: { type: Array, required: true },
            localUv: { type: Object, required: true },
            from: { type: String, default: "existing" },
        },
    }
</script>

<style scoped>
/* Current Z layout:

* FormControl           (200)
* Selected fixed cell   (20) 
* Selected cell         (15)

*/

    .fixed-place-tr {
        display: none
    }
    .disable_cell {
        background-color: var(--ControlDisableColor)
    }
    .selected {
        background-color: var(--TableSelectColor) !important;
    }
    .none_selected {
        background-color: var(--TableBackColor) !important;
    }
    .table-tr {
        background-color: white; /*цвет таблицы возможно надо сменить на настраевоемый*/
        border-right: solid 1px var(--NavigationBackColor);
        height: 100% @-moz-document url-prefix();
    }
    td {
        height: 100%;
        border: solid 1px var(--NavigationBackColor);
        padding: 0px;
        padding-left: 3px;
        overflow-wrap: break-word; /* перенос по словам */
        overflow: hidden;
    }
    .editing_style {
        z-index: 200 !important; /* чтобы FormControl(расположен в ячейке) отображался поверх таблицы */
        overflow: visible !important;
    }
    td >>> p, td >>> a {
        color: var(--TableTextColor) !important;
    }
    td >>> p {
        display: inline-block;
        overflow: hidden;
        width: 100%;
        text-overflow: ellipsis;
        line-height: normal;
        padding-right: 4px;
        padding-left: 1px;
        margin-bottom: 0;
        margin-top: 2px;
        white-space: initial;
        word-wrap: break-word;
        word-break: break-all;
    }
    td.required_cell_style {
        background-color: var(--RequiredBackColor);
    }
    td.error_style {
        background-color: var(--ErrorBackColor);
    }
    td.select_fixed {
        box-shadow: inset 0 0 0 2px var(--SelectBorderColor);
        position: sticky;
        z-index: 20; /* поверх обычных ячеек */
    }
    td.select {
        box-shadow: inset 0 0 0 2px var(--SelectBorderColor);
        z-index: 15; /* обычные ячейки ниже фиксированных */
    }

    @media screen and (max-device-width: 768px), screen and (orientation: portrait) {
        .checkbox-cells {
            left: auto !important;
            width: 0px !important;
        }

        .opemform-cells {
            left: auto !important;
            width: 0px !important;
        }

        .fixed-column {
            left: auto !important;
        }
    }
    
    @media screen and (max-device-width: 813px), screen and (orientation: portrait) {
        .hide_content > a, .hide_content > input {
            display: none;
        }
    }

    @media screen and (min-device-width: 813px) and (orientation: landscape) {
        .checkbox-cells {
            left: 0px;
        }

        .opemform-cells {
            left: 20px;
        }

        .fixed-column:first-child {
            box-shadow: 3px 0 0px var(--NavigationBackColor), inset 1px 0px 0px 0px var(--NavigationBackColor)
        }

        .fixed-column {
            position: sticky;
            z-index: 20;
            background-color: inherit;
            box-shadow: 3px 0 0px var(--NavigationBackColor);
            border-left: 0;
        }

        td.fixed-column + td.table-td {
            padding-left: 5.5px;
        }

        td.fixed-column {
            padding-left: 3px !important
        }
    }
    @-moz-document url-prefix() {
        .fixed-column {
            outline: solid 1px var(--NavigationBackColor)
        }
    }
</style>

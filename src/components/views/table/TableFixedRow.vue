<template functional>
    <!-- When you change anything here, also make corresponding changes in TableRow! -->
    <tr :style="props.localRow.extra.style" class="fixed-place-tr none_selected table-tr">
        <td class="fixed-place-td table-tr_td">
            <div class="fix"  :class="{ 'selected': props.localRow.extra.selected }">
                <div v-if="props.from !== 'new'"
                        @click="'select' in listeners && listeners.select($event)"
                        class="fixed-column">
                    <input type="checkbox" :checked="props.localRow.extra.selected">
                </div>
                <div v-else class="fixed-column"></div>
                <div v-if="props.localUv.hasRowLinks" class="fixed-column">
                    <UserViewLink v-if="props.localRow.extra.link !== undefined" :uv="props.localRow.extra.link">
                        ⤢
                    </UserViewLink>
                </div>
                <TableFixedCell v-for="i in props.columnIndexes"
                        :key="i"
                        @cellClick="listeners.cellClick"
                        :value="props.row.values[i]"
                        :localValue="props.localRow.values[i]"
                        :columnPosition="i"
                        :column="props.localUv.columns[i]" />
            </div>
        </td>
    </tr>
</template>

<script lang="ts">
    import Vue from "vue"

    import TableFixedCell from "@/components/views/table/TableFixedCell.vue"

    // FIXME: workaround for https://github.com/vuejs/vue/issues/7492
    Vue.component("TableFixedCell", TableFixedCell)

    export default {
        name: "TableFixedRow",
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

* FormControl (200)

*/
    .fixed-place-tr {
        display: none
    }
    .selected {
        background-color: var(--TableSelectColor);
    }
    .none_selected {
        background-color: var(--TableBackColor) !important;
    }
    .table-tr {
        background-color: white; /*цвет таблицы возможно надо сменить на настраевоемый*/
        border-right: solid 1px var(--NavigationBackColor);
        height: 100% @-moz-document url-prefix();
    }
    .table-tr_td {
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
        margin-bottom: 0;
        margin-top: 2px;
        line-height: calc(1rem - 1px);
        white-space: initial;
        word-wrap: break-word;
        word-break: break-all;
    }
    @media screen and (max-device-width: 813px), screen and (orientation: portrait) {
        .fixed-place-tr {
            display: table-row;
        }
        .fixed-place-tr + tr {
            border-bottom: solid 3px var(--NavigationBackColor);
        }
        .fixed-place-td {
            white-space: nowrap;
            position: sticky;
            left: 0;
            padding: 0;
            border-top: 0;
            border-bottom: 0;
            border-left: 0;
            border-right: 0;
            max-width: inherit !important;
            width: 100vw !important;
            overflow: visible;
        }
        .fix:last-child {
            border-right: solid 1px var(--NavigationBackColor);
        }
        .fix:first-child {
            border-left: solid 1px var(--NavigationBackColor);
        }
        div.fix {
            margin-left: -1px;
            max-width: inherit !important;
            width: 100vw !important;
            overflow: auto;
            border-right: solid 1px var(--NavigationBackColor);
        }
        div.fix > div{
            display: inline-block;
            border-right: 0;
            border-left: solid 1px var(--NavigationBackColor);
            padding-left: 3px;
            padding-right: 3px;
            max-width: 100vw !important;
        }
    }
</style>

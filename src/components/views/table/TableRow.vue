<template>
    <!-- When you change anything here, also make corresponding changes in TableFixedRow! -->
    <tr :style="localRow.extra.style" :class="['table-tr',
                localRow.extra.selected ? 'selected' : 'none_selected',
                {'table-tr-new': from==='new' },
                ]">
        <td v-if="from !== 'new'" @click="$emit('select', $event)"
                :class="[{ 'hide_content': showFixedRow }, 'fixed-column', 'checkbox-cells']">
            <!-- Key is needed to force checkbox re-render when `selected` changes. Not sure why. -->
            <input type="checkbox" :key="localRow.extra.selected" :checked="localRow.extra.selected" @click="$event.preventDefault()">
        </td>
        <td v-else class="fixed-column checkbox-cells"></td>
        <td v-if="localUv.hasRowLinks" :class="[{ 'hide_content': showFixedRow },'fixed-column', 'opemform-cells']">
            <UserViewLink v-if="localRow.extra.link !== undefined" :uv="localRow.extra.link">
                ⤢
            </UserViewLink>
        </td>
        <TableCell v-for="i in columnIndexes"
                :key="i"
                @cellClick="$emit('cellClick', arguments[0], arguments[1])"
                @follow="$emit('follow', $event)"
                :value="row.values[i]"
                :localValue="localRow.values[i]"
                :columnPosition="i"
                :column="localUv.columns[i]"
                :from="from"
                :indirectLinks="indirectLinks" />
    </tr>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";

import TableCell from "@/components/views/table/TableCell.vue";

@Component({
    components: {
        TableCell,
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
    .table-tr-new > td {
        height: 26px;
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
        display: block;
        overflow: hidden;
        width: 100%;
        text-overflow: ellipsis;
        line-height: normal;
        padding-right: 4px;
        padding-left: 1px;
        margin-bottom: 0;
        white-space: initial;
        word-wrap: break-word;
        word-break: break-all;
        height: inherit;
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

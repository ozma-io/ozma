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
            <UserViewLink v-if="localRow.extra.link !== undefined"
                    :uv="localRow.extra.link"
                    @[indirectLinks?`click`:null]="$emit('goto', $event)">
                ⤢
            </UserViewLink>
        </td>
        <TableCell v-for="i in columnIndexes"
                :key="i"
                @cellClick="$emit('cellClick', arguments[0], arguments[1])"
                @goto="$emit('goto', $event)"
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
        box-shadow: 10px 10px 52px 0px var(--MainBorderColor);
    }
    .table-tr {
        background-color: white; /*цвет таблицы возможно надо сменить на настраевоемый*/
        height: 100% @-moz-document url-prefix();
    }
    .table-tr-new > td {
        height: 26px;
    }
    .editing_style {
        z-index: 200 !important; /* чтобы FormControl(расположен в ячейке) отображался поверх таблицы */
        overflow: visible !important;
    }
    td {
        border-top: 1px solid var(--MainBorderColor);
    }
    td >>> p, td >>> a {
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
        position: sticky;
        z-index: 20; /* поверх обычных ячеек */
    }
    td.select {
        z-index: 15; /* обычные ячейки ниже фиксированных */
    }

    .opemform-cells {
        text-align: center;
        width: 100%;
    }

    @media screen and (min-device-width: 813px) and (orientation: landscape) {
        .checkbox-cells {
            left: 0px;
        }

        .opemform-cells {
            left: 50px;
        }
        /* .opemform-cells > span {
           justify-content: center !important;
           align-items: center;
           display: inline-flex;
           width: 100%;
           } */

        .fixed-column {
            position: sticky;
            z-index: 20;
            background-color: inherit;
            box-shadow: 2px 0 0px var(--MainBorderColor);
            border-left: 0;
        }

    }
</style>

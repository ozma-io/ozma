<template>
    <!-- When you change anything here, also make corresponding changes in TableRow! -->
    <tr :style="localRow.extra.style" class="fixed-place-tr none_selected table-tr">
        <td class="fixed-place-td table-tr_td">
            <div class="fix" :class="{ 'selected': localRow.extra.selected }">
                <div v-if="from !== 'new'"
                        @click="$emit('select', $event)"
                        class="fixed-column">
                    <!-- Key is needed to force checkbox re-render when `selected` changes. Not sure why. -->
                    <input type="checkbox" :key="localRow.extra.selected" :checked="localRow.extra.selected" @click="$event.preventDefault()">
                </div>
                <div v-else class="fixed-column"></div>
                <div v-if="localUv.hasRowLinks" class="fixed-column">
                    <UserViewLink v-if="localRow.extra.link !== undefined"
                            :uv="localRow.extra.link"
                            :indirectLinks="indirectLinks"
                            @[indirectLinks?`click`:null]="$emit('goto', $event)">
                        ⤢
                    </UserViewLink>
                </div>
                <TableFixedCell v-for="i in columnIndexes"
                        :key="i"
                        @cellClick="$emit('cellClick', ...arguments)"
                        @goto="$emit('goto', $event)"
                        :value="row.values[i]"
                        :localValue="localRow.values[i]"
                        :columnPosition="i"
                        :column="localUv.columns[i]"
                        :indirectLinks="indirectLinks" />
            </div>
        </td>
    </tr>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";

import TableFixedCell from "@/components/views/table/TableFixedCell.vue";

@Component({
    components: {
        TableFixedCell,
    },
})
export default class TableFixedRow extends Vue {
    // We don't bother to set types here properly, they matter no more than for TableRow.
    // The reason this is not a functional component is because of performance.
    // See https://forum.vuejs.org/t/performance-for-large-numbers-of-components/13545/10
    @Prop({ type: Object, required: true }) localRow!: any;
    @Prop({ type: Array, required: true }) columnIndexes!: any[];
    @Prop({ type: Object, required: true }) localUv!: any;
    @Prop({ type: String, default: "existing" }) from!: string;
    @Prop({ type: Boolean, default: false }) indirectLinks!: boolean;
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

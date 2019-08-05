<template functional>
    <!-- When you change anything here, also make corresponding changes in TableRow! -->
    <tr :style="props.entry.style" class="fixed-place-tr none_selected table-tr">
        <td class="fixed-place-td table-tr_td">
            <div class="fix" :class="{ 'selected' : props.selected}">
                <div @click="'select' in listeners && listeners.select($event)" class="fixed-column">
                    <input type="checkbox" :checked="props.selected">
                </div>
                <div v-if="props.hasRowLinks" class="fixed-column">
                    <UserViewLink v-if="props.entry.linkForRow !== null" :uv="props.entry.linkForRow">
                        ⤢
                    </UserViewLink>
                </div>
                <div v-for="i in props.columnIndexes"
                        :key="i"
                        @click="'cellClick' in listeners && listeners.cellClick(props.entry.cells[i], props.entry, $event)"
                        :style="Object.assign({}, props.entry.cells[i].style, props.columns[i].style)">
                    <!-- We don't have FormControl here because it already exists in TableRow for the same cell -->
                    <template>
                        <p>
                            <UserViewLink v-if="props.entry.cells[i].link !== null" :uv="props.entry.cells[i].link">
                                <b-checkbox v-if="typeof props.entry.cells[i].value === 'boolean'"
                                        :checked="props.entry.cells[i].value"
                                        class="div_checkbox"
                                        disabled />
                                <template v-else>
                                    {{ props.entry.cells[i].valueText }}
                                </template>
                            </UserViewLink>
                            <template v-else>
                                <b-checkbox v-if="typeof props.entry.cells[i].value === 'boolean'"
                                        :checked="props.entry.cells[i].value"
                                        class="div_checkbox"
                                        disabled />
                                <template v-else>
                                    {{ props.entry.cells[i].valueText }}
                                </template>
                            </template>
                        </p>
                    </template>
                </div>
            </div>
        </td>
    </tr>
</template>

<script lang="ts">
    export default {
        name: "TableFixedRow",
        props: {
            entry: { type: Object, required: true },
            columnIndexes: { type: Array, required: true },
            columns: { type: Array, required: true },
            uv: { type: Object, required: true },
            added: { type: Boolean, default: false },
            hasRowLinks: { type: Boolean, required: true },
            selected: { type: Boolean, default: false },
        },
    }
</script>

<style scoped>
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
        z-index: 200 !important;
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
        }
    }
</style>

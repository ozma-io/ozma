<template functional>
    <!-- When you change anything here, also make corresponding changes in TableFixedRow! -->
    <tr :style="props.entry.style" :class="props.selected ? 'selected table-tr' : 'none_selected table-tr'">
        <template>
            <td v-if="props.entry.id !== -1" @click="'select' in listeners && listeners.select($event)"
                :class="[{'hide_content' : props.showFixedRow}, 'fixed-column', 'checkbox-cells']">
                <input type="checkbox" :checked="props.selected">
            </td>
            <td v-else class="fixed-column checkbox-cells">
            </td>
        </template>
        <td v-if="props.hasRowLinks" :class="[{'hide_content' : props.showFixedRow},'fixed-column', 'opemform-cells']">
            <UserViewLink v-if="props.entry.linkForRow !== null" :uv="props.entry.linkForRow">
                ⤢
            </UserViewLink>
        </td>
        <td v-for="i in props.columnIndexes"
                :key="i"
                @click="'cellClick' in listeners && listeners.cellClick(props.entry.cells[i], props.entry, $event)"
                :style="props.entry.cells[i].style"
                :class="['table-td', {'fixed-column' : props.columns[i].fixed,
                        'select_fixed' : props.entry.cells[i].selected && props.columns[i].fixed,
                        'select' : props.entry.cells[i].selected && !props.columns[i].fixed,
                        'error_style' : props.entry.cells[i].isInvalid,
                        'required_cell_style' : props.entry.cells[i].isAwaited,
                        'editing_style' : props.entry.cells[i].isEditing !== null,
                        'disable_cell' : (props.entry.cells[i].update === null || props.entry.cells[i].update.field === null) && props.added}]">
            <FormControl v-if="props.entry.cells[i].isEditing !== null"
                    :value="props.entry.cells[i].value"
                    :valueText="props.entry.cells[i].valueText"
                    :attributes="Object.assign({}, props.entry.cells[i].attrs, props.entry.attrs, props.columns[i].attrs, props.uv.attributes)"
                    :added="props.added"
                    :update="props.entry.cells[i].update"
                    :type="props.columns[i].columnInfo.valueType"
                    :uv="props.uv"
                    @update="'update' in listeners && listeners.update(props.entry.cells[i], $event)"
                    autofocus />
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
        </td>
    </tr>
</template>

<script lang="ts">
    import { Location } from "vue-router"

    import { UserViewResult, IUpdatableField } from "@/state/user_view"
    import { AutoSaveLock } from "@/state/staging_changes"
    import { IResultColumnInfo } from "@/api"
    import { IQuery } from "@/state/query"

    export interface ICell {
        value: any
        valueText: string
        valueLowerText: string
        link: IQuery | null
        style: Record<string, any>
        update: IUpdatableField | null
        attrs: Record<string, any>
        isEditing: AutoSaveLock | null
        selected: boolean /* one click on the cell */
        isInvalid: boolean /* for error style in the table */
        isAwaited: boolean
    }

    export interface IRow {
        id: number
        cells: ICell[]
        deleted: boolean
        style: Record<string, any>
        linkForRow: IQuery | null
        attrs: Record<string, any>
        added: boolean
    }

    export interface IColumn {
        caption: string
        style: Record<string, any>
        visible: boolean
        fixed: boolean
        mobileFixed: boolean
        columnInfo: IResultColumnInfo
        attrs: Record<string, any>
        width: number // in px
    }

    export default {
        name: "TableRow",
        props: {
            entry: { type: Object, required: true },
            columnIndexes: { type: Array, required: true },
            columns: { type: Array, required: true },
            uv: { type: Object, required: true },
            added: { type: Boolean, default: false },
            hasRowLinks: { type: Boolean, required: true },
            selected: { type: Boolean, default: false },
            showFixedRow: { type: Boolean, default: false },
        },
    }
</script>
<style scoped>
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
        .hide_content > a,input {
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

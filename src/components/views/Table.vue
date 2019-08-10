<i18n>
    {
        "en": {
            "clear": "Clear",
            "yes": "Yes",
            "no": "No",
            "export_to_csv": "Export to .csv",
            "remove_selected_rows": "Remove selected rows",
            "show_new_row": "Add/remove new row"
        },
        "ru": {
            "clear": "Очистить",
            "yes": "Да",
            "no": "Нет",
            "export_to_csv": "Экспорт в .csv",
            "remove_selected_rows": "Удалить выбранные записи",
            "show_new_row": "Добавить/убрать новую строку"
        }
    }
</i18n>


<template>
    <div fluid
         :class="['table-block',
                  {'nested-table-block': !isRoot,
                  'active_editing': editingValue !== null}]">
        <div id="disable_edit"
             :class="{'edit_active': editingValue !== null}"
             @click="removeCellEditing()">
        </div>

        <FormControl v-if="editingValue !== null"
                :value="editingValue.value"
                :attributes="editingValue.attributes"
                :type="editingValue.valueType"
                :locked="editingLocked"
                :uv="uv"
                autofocus
                @update="updateCurrentValue" />

        <div ref="tableContainer" class="tabl" @scroll="updateShowLength()" @resize="updateShowLength()">
            <table :class="['custom-table', 'table', 'b-table',
                            {'edit_active': editingValue !== null}]">
                <colgroup>
                    <col :class="['checkbox-col', {'checkbox-cells': showFixedRow}]"> <!-- Checkbox column -->
                    <col v-if="local.extra.hasRowLinks" :class="['open-form-col', {'openform-cells': showFixedRow}]"> <!-- Row link column -->
                    <col v-for="i in columnIndexes" :key="i" class="data-col" :style="local.extra.columns[i].style">
                </colgroup>
                <thead class="table-head">
                    <tr>
                        <th class="fixed-column checkbox-cells table-th" @click="selectAllRows">
                            <input type="checkbox" :checked="local.extra.selectedAll">
                        </th>
                        <th v-if="local.extra.hasRowLinks" class="fixed-column openform-cells links-style table-th">
                            <span class="table-th_span" @click="setShowEmptyRow(!showEmptyRow)" :title="this.$tc('show_new_row')">
                                {{ showEmptyRow ? "-" : "+" }}
                            </span>
                        </th>
                        <th v-for="i in columnIndexes"
                                :key="i"
                                :class="['sorting', 'table-th', { 'fixed-column' : local.extra.columns[i].fixed }]"
                                :style="local.extra.columns[i].style"
                                :title="local.extra.columns[i].caption"
                                @click="updateSort(i)">
                            {{ local.extra.columns[i].caption }}
                            <span v-if="sortColumn === i">{{ sortAsc ? "▲" : "▼" }}</span>
                        </th>
                    </tr>
                </thead>
                <tbody class="table-body">
                    <template v-if="showEmptyRow">
                        <TableFixedRow v-if="showFixedRow"
                                :row="local.emptyRow.row"
                                :localRow="local.emptyRow.local"
                                :columnIndexes="fixedRowColumnIndexes"
                                :localUv="local.extra"
                                from="new"
                                @cellClick="clickCell({ type: 'new', column: arguments[0] }, arguments[1])" />
                        <TableRow
                                :row="local.emptyRow.row"
                                :localRow="local.emptyRow.local"
                                :columnIndexes="columnIndexes"
                                :localUv="local.extra"
                                from="new"
                                @cellClick="clickCell({ type: 'new', column: arguments[0] }, arguments[1])" />                        
                    </template>
                    <template v-for="(rowId, rowIndex) in uv.newRowsPositions">
                        <TableFixedRow v-if="showFixedRow"
                                :key="`fixed-new-${rowId}`"
                                :row="uv.newRows[rowId]"
                                :localRow="local.newRows[rowId]"
                                :columnIndexes="fixedRowColumnIndexes"
                                :localUv="local.extra"
                                from="added"
                                @select="selectRow({ added: true, position: rowIndex }, $event)"
                                @cellClick="clickCell({ type: 'added', id: rowId, column: arguments[0] }, arguments[1])" />
                        <TableRow :key="`new-${rowId}`"
                                :row="uv.newRows[rowId]"
                                :localRow="local.newRows[rowId]"
                                :columnIndexes="columnIndexes"
                                :localUv="local.extra"
                                from="added"
                                @select="selectRow({ added: true, position: rowIndex }, $event)"
                                @cellClick="clickCell({ type: 'added', id: rowId, column: arguments[0] }, arguments[1])" />
                    </template>
                    <template v-for="(rowI, rowIndex) in shownRowPositions">
                        <TableFixedRow v-if="showFixedRow"
                                :key="`fixed-${rowI}`"
                                :row="uv.rows[rowI]"
                                :localRow="local.rows[rowI]"
                                :columnIndexes="fixedRowColumnIndexes"
                                :localUv="local.extra"
                                @select="selectRow({ added: false, position: rowIndex }, $event)"
                                @cellClick="clickCell({ type: 'existing', position: rowI, column: arguments[0] }, arguments[1])" />
                        <TableRow :key="rowI"
                                :row="uv.rows[rowI]"
                                :localRow="local.rows[rowI]"
                                :columnIndexes="columnIndexes"
                                :localUv="local.extra"
                                @select="selectRow({ added: false, position: rowIndex }, $event)"
                                @cellClick="clickCell({ type: 'existing', position: rowI, column: arguments[0] }, arguments[1])" />
                    </template>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script lang="ts">
    import { Component, Prop, Watch, Vue } from "vue-property-decorator"
    import { mixins } from "vue-class-component"
    import { Location } from "vue-router"
    import { namespace } from "vuex-class"
    import { Store } from "vuex"

    import { RecordSet, tryDicts, mapMaybe } from "@/utils"
    import { IResultColumnInfo } from "@/api"
    import {
        ICombinedValue, IRowCommon, ICombinedRow, IAddedRow, CombinedUserView, homeSchema, valueToText,
    } from "@/state/user_view"
    import { AutoSaveLock, AddedRowId } from "@/state/staging_changes"
    import { IQuery, attrToQuerySelf, attrToQueryRef } from "@/state/query"
    import { LocalUserView, ILocalRowInfo, ILocalRow, ValueRef } from "@/local_user_view"
    import { UserView } from "@/components"
    import BaseUserView from "@/components/BaseUserView"
    import TableRow from "@/components/views/table/TableRow.vue"
    import TableFixedRow from "@/components/views/table/TableFixedRow.vue"

    interface ITableEditing {
        lock: AutoSaveLock
        ref: ValueRef
    }

    interface IColumn {
        caption: string
        style: Record<string, any>
        visible: boolean
        fixed: boolean
        mobileFixed: boolean
        columnInfo: IResultColumnInfo
        width: number // in px
    }

    interface IRowPositionRef {
        added: boolean
        position: number
    }

    interface ITableValueExtra {
        valueText: string
        link?: IQuery
        style?: Record<string, any>
        selected: boolean
    }

    interface ITableRowExtra {
        searchText: string
        selected: boolean
        style?: Record<string, any>
        height?: number
        link?: IQuery
    }

    interface ITableUserViewExtra {
        hasRowLinks: boolean
        rowCount: number
        selectedCount: number
        selectedRows: RecordSet<number>
        selectedAddedRows: RecordSet<AddedRowId>
        columns: IColumn[]
        fixedColumnPositions: Record<number, string>
        homeSchema: string | null
    }

    type ITableLocalRowInfo = ILocalRowInfo<ITableRowExtra>
    type ITableLocalRow = ILocalRow<ITableValueExtra, ITableRowExtra>

    const showStep = 20
    const doubleClickTime = 700
    // FIXME: Use CSS variables to avoid this constant
    const technicalFieldsWidth = 20 // checkbox's and openform's td width

    const createColumns = (uv: CombinedUserView): IColumn[] => {
        const viewAttrs = uv.attributes

        return uv.info.columns.map((columnInfo, i) => {
            const columnAttrs = uv.columnAttributes[i]
            const getColumnAttr = (name: string) => tryDicts(name, columnAttrs, viewAttrs)

            const captionAttr = getColumnAttr("Caption")
            const caption = captionAttr !== undefined ? String(captionAttr) : columnInfo.name

            const style: Record<string, any> = {}

            const columnWidthAttr = Number(getColumnAttr("ColumnWidth"))
            const columnWidth = Number.isNaN(columnWidthAttr) ? 200 : columnWidthAttr
            style["width"] = `${columnWidth}px`

            const fixedColumnAttr = getColumnAttr("Fixed")
            const fixedColumn = fixedColumnAttr === undefined ? false : Boolean(fixedColumnAttr)

            const fixedFieldAttr = getColumnAttr("MobileFixed")
            const fixedField = fixedFieldAttr === undefined ? false : Boolean(fixedFieldAttr)

            const visibleColumnAttr = getColumnAttr("Visible")
            const visibleColumn = visibleColumnAttr === undefined ? true : Boolean(visibleColumnAttr)

            return {
                caption, style,
                visible: visibleColumn,
                fixed: fixedColumn,
                mobileFixed: fixedField,
                columnInfo,
                attrs: columnAttrs,
                width: columnWidth,
            }
        })
    }

    export class LocalTableUserView extends LocalUserView<ITableValueExtra, ITableRowExtra, ITableUserViewExtra> {
        constructor(store: Store<any>, uv: CombinedUserView, defaultRawValues: Record<string, any>) {
            super(store, uv, defaultRawValues)
        }

        createCommonLocalValue(row: IRowCommon, localRow: ITableLocalRowInfo, columnIndex: number, value: ICombinedValue): ITableValueExtra {
            const columnInfo = this.uv.info.columns[columnIndex]
            const columnAttrs = this.uv.columnAttributes[columnIndex]
            const getCellAttr = (name: string) => tryDicts(name, value.attributes, row.attributes, columnAttrs, this.uv.attributes)

            const valueText = valueToText(columnInfo.valueType, value)

            let link: IQuery | null = null
            if (value.info !== undefined) {
                link = attrToQueryRef(value.info, value, this.extra.homeSchema, getCellAttr("LinkedView"))
                const currLinkForRow = attrToQuerySelf(value.info, this.extra.homeSchema, getCellAttr("RowLinkedView"))
                if (currLinkForRow !== null) {
                    localRow.extra.link = currLinkForRow
                    this.extra.hasRowLinks = true
                }
            }

            const style: Record<string, any> = {}
            let touchedStyle = false

            const cellColor = getCellAttr("CellColor")
            if (cellColor !== undefined) {
                style["background-color"] = String(cellColor)
                touchedStyle = true
            }

            if (localRow.extra.height !== undefined) {
                style["height"] = `${localRow.extra.height}px`
                touchedStyle = true
            }

            const fixedPosition = this.extra.fixedColumnPositions[columnIndex]
            if (fixedPosition !== undefined) {
                style["left"] = fixedPosition
                touchedStyle = true
            }

            const extra: ITableValueExtra = {
                selected: false,
                valueText,
            }
            if (link !== null) {
                extra.link = link
            }
            if (touchedStyle) {
                extra.style = style
            }
            return extra
        }

        createLocalValue(row: ICombinedRow, localRow: ITableLocalRowInfo, columnIndex: number, value: ICombinedValue) {
            return this.createCommonLocalValue(row, localRow, columnIndex, value)
        }

        createAddedLocalValue(row: IAddedRow, localRow: ITableLocalRowInfo, columnIndex: number, value: ICombinedValue) {
            return this.createCommonLocalValue(row, localRow, columnIndex, value)
        }

        createEmptyLocalValue(row: IRowCommon, localRow: ITableLocalRowInfo, columnIndex: number, value: ICombinedValue) {
            return this.createCommonLocalValue(row, localRow, columnIndex, value)
        }

        updateCommonValue(row: IRowCommon, localRow: ITableLocalRowInfo, columnIndex: number, value: ICombinedValue, extra: ITableValueExtra) {
            const columnInfo = this.uv.info.columns[columnIndex]

            extra.valueText = valueToText(columnInfo.valueType, value)
        }

        updateValue(rowIndex: number, row: ICombinedRow, localRow: ITableLocalRowInfo, columnIndex: number, value: ICombinedValue, localValue: ITableValueExtra) {
            this.updateCommonValue(row, localRow, columnIndex, value, localValue)
        }

        updateAddedValue(rowId: number, row: IAddedRow, localRow: ITableLocalRowInfo, columnIndex: number, value: ICombinedValue, localValue: ITableValueExtra) {
            this.updateCommonValue(row, localRow, columnIndex, value, localValue)
        }

        createCommonLocalRow(row: IRowCommon): ITableRowExtra {
            const getRowAttr = (name: string) => tryDicts(name, row.attributes, this.uv.attributes)

            const extra: ITableRowExtra = {
                selected: false,
                searchText: "",
            }

            const style: Record<string, any> = {}
            let touchedStyle = false

            const height = Number(getRowAttr("RowHeight"))
            if (!Number.isNaN(height)) {
                style["white-space"] = "nowrap"
                extra.height = height
                touchedStyle = true
            }

            if (touchedStyle) {
                extra.style = style
            }

            this.extra.rowCount++

            return extra
        }

        createLocalRow(row: ICombinedRow) {
            return this.createCommonLocalRow(row)
        }

        createAddedLocalRow(row: IAddedRow) {
            return this.createCommonLocalRow(row)
        }

        createEmptyLocalRow(row: IRowCommon) {
            return this.createCommonLocalRow(row)
        }

        postInitCommonRow(row: IRowCommon, localRow: ITableLocalRow) {
            const searchStrings = localRow.values.map(extra => {
                return extra.valueText.toLocaleLowerCase()
            })
            localRow.extra.searchText = "\0".concat(...searchStrings)
        }

        postInitRow(row: ICombinedRow, localRow: ITableLocalRow) {
            this.postInitCommonRow(row, localRow)
            if (row.deleted) {
                this.extra.rowCount--
            }
        }

        postInitAddedRow(row: IAddedRow, localRow: ITableLocalRow) {
            this.postInitCommonRow(row, localRow)
        }

        deleteCommonRow(row: ICombinedRow, localRow: ITableLocalRowInfo) {
            this.extra.rowCount--
            if (localRow.extra.selected) {
                this.extra.selectedCount--
            }
        }

        deleteRow(rowIndex: number, row: ICombinedRow, localRow: ITableLocalRowInfo) {
            this.deleteCommonRow(row, localRow)
            if (localRow.extra.selected) {
                localRow.extra.selected = false
                Vue.delete(this.extra.selectedRows, rowIndex)
            }
        }

        deleteAddedRow(rowId: AddedRowId, row: ICombinedRow, localRow: ITableLocalRowInfo) {
            this.deleteCommonRow(row, localRow)
            if (localRow.extra.selected) {
                Vue.delete(this.extra.selectedAddedRows, rowId)
            }
        }

        undeleteRow(rowIndex: number, row: ICombinedRow, localRow: ITableLocalRowInfo) {
            this.extra.rowCount++
        }

        createLocalUserView(): ITableUserViewExtra {
            const columns = createColumns(this.uv)
            const extra = {
                hasRowLinks: false,
                selectedCount: 0,
                rowCount: 0,
                selectedRows: {},
                selectedAddedRows: {},
                columns,
                fixedColumnPositions: {},
                homeSchema: homeSchema(this.uv.args),
            }
            return extra
        }

        postInitUserView() {
            this.extra.fixedColumnPositions = this.fixedColumnPositions(this.extra.columns)
            Object.entries(this.extra.fixedColumnPositions).forEach(([colIRaw, position]) => {
                const colI = Number(colIRaw)
                this.extra.columns[colI].style["left"] = position

                const applyPosition = (row: ITableLocalRow) => {
                    const value = row.values[colI]
                    let style = value.style
                    if (style === undefined) {
                        style = {}
                        value.style = style
                    }
                    style["left"] = position
                }
                this.rows.forEach(applyPosition)
                Object.values(this.newRows).forEach(applyPosition)
            })
        }

        selectRow(ref: IRowPositionRef, selectedStatus: boolean) {
            let row: ITableLocalRow
            let set: RecordSet<number>
            let setId: number
            if (ref.added) {
                set = this.extra.selectedAddedRows
                setId = this.uv.newRowsPositions[ref.position]
                row = this.newRows[setId]
            } else {
                set = this.extra.selectedRows
                setId = ref.position
                row = this.rows[setId]
            }
            const extra = row.extra
            if (extra.selected !== selectedStatus) {
                extra.selected = selectedStatus
                if (selectedStatus) {
                    this.extra.selectedCount++
                    Vue.set(set, setId, null)
                } else {
                    this.extra.selectedCount--
                    Vue.delete(set, setId)
                }
            }
        }

        selectAll(selectedStatus: boolean) {
            Object.entries(this.newRows).forEach(([rowIdRaw, row]) => {
                const rowId = Number(rowIdRaw)
                row.extra.selected = selectedStatus
                if (selectedStatus) {
                    Vue.set(this.extra.selectedAddedRows, rowId, null)
                }
            })
            if (this.uv.rows !== null) {
                this.rows.forEach((localRow, rowI) => {
                    const row = (this.uv.rows as ICombinedRow[])[rowI]
                    if (!row.deleted) {
                        localRow.extra.selected = selectedStatus
                        if (selectedStatus) {
                            Vue.set(this.extra.selectedRows, rowI, null)
                        }
                    }
                })
            }

            if (selectedStatus) {
                this.extra.selectedCount = this.extra.rowCount
            } else {
                this.extra.selectedCount = 0
                this.extra.selectedRows = {}
                this.extra.selectedAddedRows = {}
            }
        }

        get selectedAll() {
            return this.extra.selectedCount === this.extra.rowCount
        }

        get technicalWidth() {
            let left = technicalFieldsWidth
            if (this.extra.hasRowLinks) {
                left += technicalFieldsWidth
            }
            return left
        }

        private fixedColumnPositions(columns: IColumn[]): Record<number, string> {
            let left = this.technicalWidth
            const fixedColumnIndexes = mapMaybe((col, colI) => col.fixed ? colI : undefined, columns)
            const positions: Record<number, string> = {}
            for (const fixedColumnIndex of fixedColumnIndexes) {
                positions[fixedColumnIndex] = `${left}px`
                left += columns[fixedColumnIndex].width
            }
            return positions
        }
    }

    const equalColumnValueRef = (a: ValueRef, b: ValueRef) => {
        return (a.type === "added" && a.type === b.type && a.id === b.id) ||
               (a.type === "existing" && a.type === b.type && a.position === b.position) ||
               (a.type === "new" && a.type === b.type)
    }

    const equalValueRef = (a: ValueRef, b: ValueRef) => {
        return equalColumnValueRef(a, b) && a.column === b.column
    }

    const ordRowPositionRef = (a: IRowPositionRef, b: IRowPositionRef) => {
        if (a.added && !b.added) {
            return -1
        } else if (!a.added && b.added) {
            return 1
        } else {
            return Math.sign(b.position - a.position)
        }
    }

    const rowContains = (row: ITableLocalRow, searchWords: string[]) => {
        for (const word of searchWords) {
            if (!row.extra.searchText.includes(word)) {
                return false
            }
        }
        return true
    }

    const rowIndicesCompare = (aIndex: number, bIndex: number, entries: IRowCommon[], sortColumn: number, collator: Intl.Collator) => {
        const a = entries[aIndex]
        const b = entries[bIndex]
        return collator.compare(a.values[sortColumn].value,
                                b.values[sortColumn].value)
    }

    const getCsvString = (str: string): string => {
        let csvstr = str.replace(/"/g, '""')
        if (csvstr.search(/("|;|\n)/g) > 0) {
            csvstr = "\"" + csvstr + "\""
        }
        csvstr += ";"
        return csvstr
    }

    const isEmptyRow = (row: IRowCommon) => {
        return row.values.every(cell => cell.value === null || cell.value === undefined || cell.info === null)
    }

    const staging = namespace("staging")
    const userView = namespace("userView")

    @UserView({
        localConstructor: LocalTableUserView,
    })
    @Component({
        components: {
            TableRow, TableFixedRow,
        },
    })
    export default class UserViewTable extends mixins<BaseUserView<LocalTableUserView, ITableValueExtra, ITableRowExtra, ITableUserViewExtra>>(BaseUserView) {
        @staging.Action("addAutoSaveLock") addAutoSaveLock!: () => Promise<AutoSaveLock>
        @staging.Action("removeAutoSaveLock") removeAutoSaveLock!: (id: AutoSaveLock) => Promise<void>
        @staging.State("currentSubmit") currentSubmit!: Promise<void> | null

        private currentFilter: string[] = []
        private sortColumn: number | null = null
        private sortAsc: boolean = true
        private sortOptions: Intl.CollatorOptions = {}
        private rowPositions: number[] = []
        private showLength: number = 0
        private lastSelectedRow: IRowPositionRef | null = null
        private lastSelectedValue: ValueRef | null = null
        private editing: ITableEditing | null = null
        private printListener: { query: MediaQueryList, queryCallback: (mql: MediaQueryListEvent) => void, printCallback: () => void } | null = null
        private clickTimeoutId: NodeJS.Timeout | null = null
        private showEmptyRow: boolean = false
        private emptyLocalRow: ITableLocalRow | null = null

        get columnIndexes() {
            const columns = this.local.extra.columns.map((column, index) => ({ index, fixed: column.fixed, visible: column.visible })).filter(c => c.visible)
            const fixed = columns.filter(c => c.fixed)
            const nonFixed = columns.filter(c => !c.fixed)
            return fixed.concat(nonFixed).map(c => c.index)
        }

        get fixedColumnIndexes() {
            return mapMaybe((col, colI) => col.fixed ? colI : undefined, this.local.extra.columns)
        }

        get fixedRowColumnIndexes() {
            return mapMaybe((col, colI) => col.mobileFixed ? colI : undefined, this.local.extra.columns)
        }

        get editingLocked() {
            if (this.editing === null) {
                return false
            } else {
                return this.editing.ref.type !== "existing" && this.currentSubmit !== null
            }
        }

        get editingValue() {
            if (this.editing === null) {
                return null
            } else {
                const value = this.getValueByRef(this.editing.ref)
                if (value === null) {
                    return null
                } else {
                    const columnInfo = this.uv.info.columns[this.editing.ref.column]
                    const columnAttrs = this.uv.columnAttributes[this.editing.ref.column]
                    const type = columnInfo.valueType
                    const attributes = Object.assign({}, this.uv.attributes, columnAttrs, value.row.row.attributes, value.value.attributes)
                    return {
                        value: value.value,
                        attributes,
                        type,
                    }
                }
            }
        }

        @Watch("filter")
        private updateFilter() {
            if (this.uv.rows === null) {
                throw Error("Impossible")
            }

            const oldFilter = this.currentFilter
            const currentFilter = this.filter
            this.currentFilter = currentFilter

            // Check if current filter contained this one
            let contained = true
            const newWords = []
            if (currentFilter.length !== 0) {
                for (const newWord of currentFilter) {
                    let hasThis = false
                    for (const oldWord of oldFilter) {
                        if (newWord.startsWith(oldWord)) {
                            hasThis = true
                            newWords.push(newWord)
                            break
                        }
                    }
                    if (!hasThis) {
                        contained = false
                        break
                    }
                }
            } else {
                contained = false
            }

            if (!contained) {
                this.buildRowPositions()
            } else {
                // Filter existing rows when we filter a subset of already filtered ones.
                const newFilterWords = Array.from(new Set(newWords))
                this.rowPositions = this.rowPositions.filter(rowI => rowContains((this.local as LocalTableUserView).rows[rowI], newFilterWords))
            }

            this.lastSelectedRow = null
        }

        private setShowEmptyRow(newValue: boolean) {
            const emptyRow = this.local.emptyRow
            if (emptyRow !== null) {
                this.showEmptyRow = newValue
                if (!newValue) {
                    emptyRow.local.extra.selected = false
                    emptyRow.local.values.forEach(value => {
                        value.selected = false
                    })
                }
            }
        }

        // Update this.rows from this.entries
        private buildRowPositions() {
            const rows = this.uv.rows

            if (rows === null) {
                this.rowPositions = []
            } else {
                this.rowPositions = rows.map((row, rowI) => rowI)
                if (this.filter.length !== 0) {
                    this.rowPositions = this.rowPositions.filter(rowI => rowContains((this.local as LocalTableUserView).rows[rowI], this.filter))
                }

                this.sortRows()
                this.updateShowLength()
            }
        }

        private export2csv() {
            let data: string = ""
            for (const col of this.local.extra.columns) {
                data += getCsvString(col.caption)
            }
            data += "\n"
            for (const rowId of this.uv.newRowsPositions) {
                const row = this.local.newRows[rowId]
                for (const extra of row.values) {
                    data += getCsvString(extra.valueText)
                }
                data += "\n"
            }
            for (const row of this.local.rows) {
                for (const extra of row.values) {
                    data += getCsvString(extra.valueText)
                }
                data += "\n"
            }

            const element = document.createElement("a")
            element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent("\uFEFF" + data))
            element.setAttribute("download", `${this.uv.name}.csv`)
            element.style.display = "none"

            document.body.appendChild(element)
            element.click()
            document.body.removeChild(element)
        }

        private removeCellEditing() {
            if (this.editing === null) {
                return
            }

            this.removeAutoSaveLock(this.editing.lock)
            this.editing = null
        }

        @Watch("editingValue")
        private removeEditingIfInvalid() {
            if (this.editingValue === null) {
                this.removeCellEditing()
            }
        }

        private setCellEditing(ref: ValueRef) {
            this.removeCellEditing()

            this.addAutoSaveLock().then(lock => {
                if (this.editing !== null) {
                    // Lock already taken (somehow)
                    this.removeAutoSaveLock(lock)
                } else {
                    const value = this.getValueByRef(ref)
                    if (value !== null && value.value.info !== undefined) {
                        this.editing = { ref, lock }
                    }
                }
            })
        }

        private clickCell(ref: ValueRef, event: MouseEvent) {
            if (this.lastSelectedValue !== null &&
                    !equalColumnValueRef(this.lastSelectedValue, ref) &&
                    this.lastSelectedValue.type === "added" && isEmptyRow(this.uv.newRows[this.lastSelectedValue.id])) {
                const entity = this.uv.info.mainEntity
                if (entity === null) {
                    throw new Error("View doesn't have a main entity")
                }

                this.resetAddedEntry({
                    schema: entity.schema,
                    entity: entity.name,
                    id: this.lastSelectedValue.id,
                })
            }

            if (this.clickTimeoutId === null) {
                this.clickTimeoutId = setTimeout(() => {
                    this.clickTimeoutId = null
                }, doubleClickTime)

                if (this.lastSelectedValue !== null && !equalValueRef(this.lastSelectedValue, ref)) {
                    this.removeCellEditing()
                }
            } else {
                clearTimeout(this.clickTimeoutId)
                this.clickTimeoutId = null

                if (this.lastSelectedValue !== null && equalValueRef(this.lastSelectedValue, ref)) {
                    this.setCellEditing(ref)
                }
            }

            this.selectCell(ref)
        }

        private selectCell(ref: ValueRef) {
            if (this.lastSelectedValue !== null) {
                const lastValue = this.getValueByRef(this.lastSelectedValue)
                if (lastValue !== null) {
                    lastValue.local.selected = false
                }
            }
            const value = this.getValueByRef(ref)
            if (value === null) {
                throw Error("Impossible")
            }
            value.local.selected = true
            this.lastSelectedValue = ref
        }

        private getRowPosition(rowRef: IRowPositionRef): ITableRowExtra | null {
            const row = rowRef.added ? this.local.newRows[this.uv.newRowsPositions[rowRef.position]] : this.local.rows[rowRef.position]
            if (row === undefined) {
                return null
            } else {
                return row.extra
            }
        }

        private nextRowPosition(rowRef: IRowPositionRef): IRowPositionRef | null {
            let newPosition: number
            if (rowRef.added) {
                if (rowRef.position + 1 < this.uv.newRowsPositions.length) {
                    return { added: true, position: rowRef.position + 1 }
                } else {
                    newPosition = 0
                }
            } else {
                newPosition = rowRef.position + 1
            }

            if (this.uv.rows !== null && newPosition < this.uv.rows.length) {
                return { added: false, position: newPosition }
            } else {
                return null
            }
        }

        private selectRow(rowRef: IRowPositionRef, event: MouseEvent) {
            const row = this.getRowPosition(rowRef)
            if (row === null) {
                throw Error("Impossible")
            }
            if (this.lastSelectedRow !== null && event.shiftKey) {
                // Select all rows between current one and the previous selected one.
                const [from, to] = ordRowPositionRef(this.lastSelectedRow, rowRef) <= 0 ? [this.lastSelectedRow, rowRef] : [rowRef, this.lastSelectedRow]
                let i = this.getRowPosition(from) !== null ? from : this.nextRowPosition(from)
                while (i !== null) {
                    this.local.selectRow(i, row.selected)
                    i = this.nextRowPosition(i)
                }
            } else {
                this.local.selectRow(rowRef, !row.selected)
            }
            return false
        }

        private selectAllRows() {
            this.local.selectAll(!this.local.selectedAll)
        }

        private removeSelectedRows() {
            const entity = this.uv.info.mainEntity
            if (entity === null || this.uv.rows === null) {
                throw new Error("View doesn't have a main entity")
            }

            Object.keys(this.local.extra.selectedRows).forEach(rowIRaw => {
                const rowI = Number(rowIRaw)
                const row = (this.uv.rows as ICombinedRow[])[rowI]
                if (row.entityIds === undefined) {
                    throw new Error("View doesn't have a main entity")
                }
                this.deleteEntry({
                    schema: entity.schema,
                    entity: entity.name,
                    // Guaranteed to exist if mainEntity exists
                    id: row.mainId as number,
                })
            })

            Object.keys(this.local.extra.selectedAddedRows).forEach(rowIdRaw => {
                const rowId = Number(rowIdRaw)

                this.resetAddedEntry({
                    schema: entity.schema,
                    entity: entity.name,
                    id: rowId,
                })
            })
        }

        private init() {
            if (this.isRoot) {
                this.$emit("update:bodyStyle", `
                    @media print {
                        @page {
                            size: landscape;
                        }
                    }
                `)
            }

            const actions = [
                { name: this.$tc("export_to_csv"), callback: () => this.export2csv() },
            ]
            if (this.uv.info.mainEntity !== null) {
                actions.push(
                    { name: this.$tc("remove_selected_rows"), callback: () => this.removeSelectedRows() },
                    { name: this.$tc("show_new_row"), callback: () => this.setShowEmptyRow(true) },
                )
            }

            this.$emit("update:actions", actions)
            this.$emit("update:enableFilter", this.uv.rows !== null)

            this.buildRowPositions()
        }

        private created() {
            this.init()

            if (this.isRoot) {
                const queryCallback = (mql: MediaQueryListEvent) => {
                    if (mql.matches) {
                        this.showLength = (this.local as LocalTableUserView).rows.length
                    }
                }
                const query = window.matchMedia("print")
                query.addListener(queryCallback)
                const printCallback = () => {
                    this.showLength = (this.local as LocalTableUserView).rows.length
                }
                window.addEventListener("beforeprint", printCallback)
                this.printListener = { query, queryCallback, printCallback }
            }
        }

        @Watch("uv")
        private uvChanged() {
            this.init()
            this.updateShowLength()
        }

        private mounted() {
            this.updateShowLength()
        }

        private destroyed() {
            if (this.printListener !== null) {
                window.removeEventListener("beforeprint", this.printListener.printCallback)
                this.printListener.query.removeListener(this.printListener.queryCallback)
            }
            if (this.clickTimeoutId !== null) {
                clearTimeout(this.clickTimeoutId)
            }
        }

        /*
            first sort
            bool:   descending
            number: descending
            string: ascending
        */
        private updateSort(sortColumn: number) {
            if (this.sortColumn !== sortColumn) {
                const type = this.local.extra.columns[sortColumn].columnInfo.valueType.type
                this.sortColumn = sortColumn

                switch (type) {
                    case "int":
                        this.sortOptions = { numeric: true }
                        this.sortAsc = false
                        break
                    case "bool":
                        this.sortAsc = false
                        this.sortOptions = {}
                        break
                    case "string":
                        this.sortAsc = true
                        this.sortOptions = { sensitivity: "accent" }
                        break
                    default:
                        this.sortAsc = true
                        this.sortOptions = {}
                }
            } else {
                this.sortAsc = !this.sortAsc
            }

            this.sortRows(this.sortOptions)
            this.lastSelectedRow = null
        }

        private sortRows(options?: Intl.CollatorOptions) {
            if (this.uv.rows === null) {
                throw Error("Impossible")
            }
            const rows = this.uv.rows

            if (this.sortColumn !== null) {
                const sortColumn = this.sortColumn
                const collator = new Intl.Collator(["en", "ru"], options)
                const sortFunction: (a: number, b: number) => number =
                    this.sortAsc ?
                        (a, b) => rowIndicesCompare(a, b, rows, sortColumn, collator) :
                        (a, b) => rowIndicesCompare(b, a, rows, sortColumn, collator)
                this.rowPositions.sort(sortFunction)
            }
        }

        private updateShowLength() {
            const tableContainer = this.$refs.tableContainer as Element | undefined
            // Component may still be unmounted
            if (tableContainer === undefined) {
                return
            }
            // + 1 is needed because of rare cases like that:
            // top 974.4000244140625, client height 690, scroll height 1665
            if (tableContainer.scrollTop + tableContainer.clientHeight + 1 >= tableContainer.scrollHeight && this.showLength < this.rowPositions.length) {
                this.showLength = Math.min(this.showLength + showStep, this.local.rows.length)
                Vue.nextTick(() => this.updateShowLength())
            }
        }

        get nonDeletedRowPositions() {
            const rows = this.uv.rows
            if (rows === null) {
                return []
            } else {
                return this.rowPositions.filter(rowI => !rows[rowI].deleted)
            }
        }

        get statusLine() {
            const selected = (this.local.extra.selectedCount > 0) ? `${this.local.extra.selectedCount}/` : ""
            return `${selected}${this.nonDeletedRowPositions.length}`
        }

        @Watch("statusLine")
        private updateStatusLine() {
            this.$emit("update:statusLine", this.statusLine)
        }

        get shownRowPositions() {
            return this.nonDeletedRowPositions.slice(0, this.showLength)
        }

        get technicalWidth() {
            let left = technicalFieldsWidth
            if (this.local.extra.hasRowLinks) {
                left += technicalFieldsWidth
            }
            return left
        }

        get showFixedRow() {
            let tableWidth = this.technicalWidth
            for (const column of this.local.extra.columns) {
                tableWidth += column.width
            }
            return tableWidth > screen.width && this.fixedRowColumnIndexes.length > 0
        }

        private async updateCurrentValue(rawValue: any) {
            if (this.editing === null) {
                throw Error("Impossible")
            }

            const ref = this.editing.ref
            await this.updateValue(ref, rawValue)
            if (ref.type === "new") {
                const newRef: ValueRef = { type: "added", id: this.uv.newRowsPositions[0], column: ref.column }
                this.editing.ref = newRef
                this.selectCell(newRef)
            }
        }
    }
</script>

<style scoped>
/* Current Z layout:

* Form control          (2000)
* Disable-edit block    (500) 
* Table head            (20)
* FixedColumn           (25)

*/
    .table-block {
        width: 100%;
        margin: 0px;
        position: relative;
        height: 100%;
    }
    .checkbox-col, .open-form-col{
        width: 20px;
    }
    .data-col {
        max-width: 100vw !important;
    }
    /* блок для отключения редактирования в таблице */
    #disable_edit {
        position: fixed;
        top: calc(1.5em + 6px);
        left: 0;
    }
    #disable_edit.edit_active {
        width: 100vw;
        height: 100vh;
        z-index: 500; /* чтоб таблица была поверх этого блока */
    }
    /* таблица поверх блока отключения редактирования */
    table.edit_active {
        position: relative;
        z-index: 1000
    }
    .tabl {
        float: left;
        margin-bottom: 10px;
        height: 100%;
        width: 100%; /*на весь экран*/
        padding: 0;
        overflow: auto; /*чтобы скролить таблицу в том числе на мобилке*/
    }
    .custom-table {
        table-layout: fixed;
        width: 0px;
        border: 0;
        background-color: var(--TableBackColor);
        margin-bottom: 0px !important;
    }
    .table-head {
        height: 25px;
        border-right: solid 1px var(--NavigationBackColor) !important;

    }
    .table-th {
        background: var(--NavigationBackColor) !important;
        color: var(--ButtonTextColor) !important;
        padding: 0;
        border: 0;
        font-weight: normal;
        max-width: 50px !important;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        position: sticky; /*фиксация шапки при скроле*/
        z-index: 20; /*при скроле таблицы чтобы шапка была видна*/
        top: 0;
        padding-left: 3px;
        cursor: pointer;
    }
    th.fixed-column {
        z-index: 25; /* поверх обычных столбцов */
    }
    th.tabl_heading {
        text-overflow: ellipsis;
        vertical-align: top;
    }
    th.links-style {
        text-align: center;
        cursor: pointer;
        padding: 0;
    }
    .table-th_span {
        background: rgba(255, 255, 255, 0.3);
        padding: 0;
        height: 100%;
        width: 100%;
        white-space: nowrap;
        display: inline-block;
    }
    .table-body {
        border-right: solid 1px  var(--NavigationBackColor) !important
    }


    @media screen and (max-aspect-ratio: 13/9) {
        @media screen and (max-device-width: 480px) {
            .nested-table-block {
                width: max-content !important;
                position: sticky;
                float: right;
                right: 0;
            }

            .nested-table-block > .tabl {
                width: max-content !important;
            }
        }
    }

    @media screen and (max-device-width: 650px) {
        .tabl{
            flex: 1;
            height: none;
            margin-bottom:0;
        }
        .table-block {
            display: flex;
            flex-direction: column;
            height: 100%;
        }
        .active_editing {
            position: sticky !important;
            z-index: 100000; /* чтобы FormControl был поверх других таблиц, когда их несколько на странице*/
        }
    }

    @media screen and (max-device-width: 768px), screen and (orientation: portrait) {
        .fixed-column {
            left: auto !important;
        }
    }
	
    @media screen and (min-device-width: 813px) and (orientation: landscape) {
        .checkbox-cells {
            left: 0px;
        }
        .openform-cells {
            left: 20px;
        }
        .fixed-column {
            position: sticky;
            z-index: 20;
            background-color: inherit;
            box-shadow: 3px 0 0px var(--NavigationBackColor);
            border-left: 0;
        }
    }

    @-moz-document url-prefix() {
        .fixed-column {
            outline: solid 1px var(--NavigationBackColor)
        }
    }

    @media print {
        .tabl {
            height: 100%;
            float: none !important; /*при печати для правильной масштабируемости*/
            overflow: visible !important; /*чтобы при печати была возможность видеть таблицу*/
        }

        @-moz-document url-prefix() { /*стили в лисе исправляем баги с отображением границ таблицы*/
            .custom-table {
                border-collapse: separate !important;
                border-right: solid 1px var(--NavigationBackColor);
            }
        }

        .custom-table {
            max-width: 100% !important;
            page-break-inside: auto;
            border-spacing: 0;
        }

        th {
            border: solid 1px var(--NavigationBackColor);
        }

        td {
            border: solid 1px var(--NavigationBackColor);
        }
        td >>> a {
            text-decoration: none !important;
        }
    }

    /* FormControl */
    div.form-control-panel {
        left: calc(50% - 175px);
        top: calc(50% - 50px);
        position: fixed;
        z-index: 2000; /* FormControl поверх таблицы */
        background-color: var(--MenuColor);
        display: block;
        align-items: center;
        padding: 20px;
    }
    @media screen and (max-device-width: 480px){
        div.form-control-panel {
            left: 2px;
            width: calc(100% - 4px);
        }
        div.form-control-panel > div.select-container {
            width: calc(100vw - 44px) !important;
            /*padding 20px and left 2px*/
        }

        div.form-control-panel > div.select-container > select.form-control-panel_select {
            width: 100%;
        }
        div.form-control-panel > div.select-container:after {
            position: relative;
            left: 0px;
        }
    }
    div.form-control-panel > div.select-container {
        width: 300px
    }
    div.form-control-panel > pre {
        min-width: 600px;
        height: 200px !important;
        margin-bottom: 0px;
    }
    div.form-control-panel > textarea.singleline {
       white-space:nowrap;
    }
</style>

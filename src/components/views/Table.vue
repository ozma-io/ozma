<i18n>
    {
        "en": {
            "clear": "Clear",
            "yes": "Yes",
            "no": "No",
            "export_to_csv": "Export to .csv"
        },
        "ru": {
            "clear": "Очистить",
            "yes": "Да",
            "no": "Нет",
            "export_to_csv": "Экспорт в .csv"
        }
    }
</i18n>


<template>
    <b-container fluid class="cont_table without_padding">
        <div ref="tableContainer" class="tabl" @scroll="updateShowLength()" @resize="updateShowLength()">
            <table class="tabl table b-table">
                <colgroup>
                    <col :class="showFixedRow ? 'checkbox-col checkbox-cells' : 'checkbox-col'"> <!-- Checkbox column -->
                    <col v-if="hasRowLinks" :class="showFixedRow ? 'open-form-col opemform-cells' : 'open-form-col'"> <!-- Row link column -->
                    <col v-for="i in columnIndexes" :key="i" :style="columns[i].style">
                </colgroup>
                <thead>
                    <tr>
                        <th class="fixed-column checkbox-cells"></th>
                        <th v-if="hasRowLinks" class="fixed-column opemform-cells"></th>
                        <th v-for="i in columnIndexes" :key="i" :title="columns[i].caption" @click="updateSort(i)" :class="columns[i].fixed ? 'fixed-column sorting' : 'sorting'" :style="columns[i].style">
                            {{ columns[i].caption }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for="(entryI, rowI) in shownRows">
                        <TableFixedRow v-if="showFixedRow"
                                :key="`fixed-${entryI}`"
                                :entry="entries[entryI]"
                                :columnIndexes="fixedRowColumnIndexes"
                                :columns="columns"
                                :uv="uv"
                                @selectRow="cellClicked(rowI, $event)"
                                @valueClicked="changeValue" />
                        <TableRow :key="entryI"
                                :entry="entries[entryI]"
                                :columnIndexes="columnIndexes"
                                :columns="columns"
                                :uv="uv"
                                @selectRow="cellClicked(rowI, $event)"
                                @valueClicked="changeValue" />
                    </template>
                </tbody>
            </table>
        </div>
    </b-container>
</template>
<script lang="ts">
    import { Component, Prop, Watch, Vue } from "vue-property-decorator"
    import { Location } from "vue-router"
    import { namespace } from "vuex-class"
    import { UserViewResult, printValue, IUpdatableField } from "@/state/user_view"
    import { CurrentChanges, IEntityChanges, IUpdatedCell } from "@/state/staging_changes"
    import { IExecutedRow, IExecutedValue, ValueType, IResultColumnInfo } from "@/api"
    import { CurrentTranslations } from "@/state/translations"
    import TableRow, { IRow, ICell, IColumn } from "@/components/views/table/TableRow.vue"
    import TableFixedRow from "@/components/views/table/TableFixedRow.vue"

    const showStep = 20
    const doubleClickTime = 700
    // FIXME: Use CSS variables to avoid this constant
    const technicalFieldsWidth = 20 // checkbox's and openform's td width

    const rowContains = (row: IRow, searchWords: string[]) => {
        for (const word of searchWords) {
            if (!row.cells.some(cell => cell.valueLowerText.includes(word))) {
                return false
            }
        }
        return true
    }

    const rowIndicesCompare = (aIndex: number, bIndex: number, entries: IRow[], sortColumn: number) => {
        const a = entries[aIndex]
        const b = entries[bIndex]
        if (a.cells[sortColumn].value < b.cells[sortColumn].value) {
            return -1
        } else if (a.cells[sortColumn].value > b.cells[sortColumn].value) {
            return 1
        } else {
            return 0
        }
    }

    const getCsvString = (str: string): string => {
        let csvstr = str.replace(/"/g, '""')
        if (csvstr.search(/("|;|\n)/g) > 0) {
            csvstr = "\"" + csvstr + "\""
        }
        csvstr += ";"
        return csvstr
    }

    const getValueText = (valType: ValueType, val: IExecutedValue) => {
        if (val.value === null) {
            return ""
        } else {
            return val.pun === undefined ? printValue(valType, val.value) : printValue(valType, val.pun)
        }
    }

    const staging = namespace("staging")
    const translations = namespace("translations")

    @Component({
        components: {
            TableRow, TableFixedRow,
        },
    })
    export default class UserViewTable extends Vue {
        @staging.State("current") changes!: CurrentChanges
        @translations.Getter("field") fieldTranslation!: (schema: string, entity: string, field: string, defValue: string) => string

        @Prop({ type: UserViewResult }) uv!: UserViewResult
        @Prop({ type: Boolean, default: false }) isRoot!: boolean
        @Prop({ type: Array, default: [] }) filter!: string[]

        private currentFilter: string[] = []
        private sortColumn: number | null = null
        private sortAsc: boolean = true
        private entries: IRow[] = []
        private rows: number[] = []
        private showLength: number = 0
        private selectedRows: number = 0
        private lastSelected: number | null = null
        private printListener: { query: MediaQueryList, queryCallback: (mql: MediaQueryListEvent) => void, printCallback: () => void } | null = null
        private oldCell: ICell | null = null
        private clickTimeoutId: NodeJS.Timeout | null = null

        get hasRowLinks() {
            return this.entries.some(e => e.linkForRow !== null)
        }

        get columns(): IColumn[] {
            const viewAttrs = this.uv.attributes

            return this.uv.info.columns.map((columnInfo, i) => {
                const columnAttrs = this.uv.columnAttributes[i]
                const getColumnAttr = (name: string) => columnAttrs[name] || viewAttrs[name]

                let caption: string
                const captionAttr = getColumnAttr("Caption")
                if (captionAttr !== undefined) {
                    caption = String(captionAttr)
                } else if (this.uv.info.mainEntity !== null && columnInfo.mainField !== null) {
                    // FIXME: get rid of this; use default field attributes instead
                    const entity = this.uv.info.mainEntity.entity
                    caption = this.fieldTranslation(entity.schema, entity.name, columnInfo.mainField.name, columnInfo.name)
                } else {
                    caption = columnInfo.name
                }

                const style: Record<string, any> = {}

                const columnWidthAttr = Number(getColumnAttr("ColumnWidth"))
                const columnWidth = Number.isNaN(columnWidthAttr) ? 200 : columnWidthAttr
                style["width"] = `${columnWidth}px`

                const fixedColumnAttr = getColumnAttr("Fixed")
                const fixedColumn = fixedColumnAttr === undefined ? false : Boolean(fixedColumnAttr)

                const fixedFieldAttr = getColumnAttr("MobileFixed")
                const fixedField = fixedFieldAttr === undefined ? false : Boolean(fixedFieldAttr)

                return {
                    caption, style,
                    fixed: fixedColumn,
                    mobileFixed: fixedField,
                    columnInfo,
                    attrs: captionAttr,
                    width: columnWidth,
                }
            })
        }

        get columnIndexes() {
            const columns = this.columns.map((column, index) => ({ index, fixed: column.fixed }))
            const fixed = columns.filter(c => c.fixed)
            const nonFixed = columns.filter(c => !c.fixed)
            return fixed.concat(nonFixed).map(c => c.index)
        }

        get fixedColumnIndexes() {
            return this.columns.map((c, index) => ({ index, fixed: c.fixed })).filter(c => c.fixed).map(c => c.index)
        }

        get fixedRowColumnIndexes() {
            return this.columns.map((c, index) => ({ index, fixed: c.mobileFixed })).filter(c => c.fixed).map(c => c.index)
        }

        @Watch("filter")
        private updateFilter() {
            const oldFilter = this.currentFilter
            const currentFilter = this.filter
            this.currentFilter = currentFilter

            // Check if current filter contained this one
            let contained = true
            const newWords = []
            if (currentFilter.length !== 0) {
                for (const oldWord of oldFilter) {
                    let hasThis = false
                    for (const newWord of currentFilter) {
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
                this.buildRows()
            } else {
                // Filter existing rows when we filter a subset of already filtered ones.
                const newFilterWords = Array.from(new Set(newWords))
                this.rows = this.rows.filter(rowI => rowContains(this.entries[rowI], newFilterWords))
            }

            this.lastSelected = null
        }

        private export2csv() {
            let data: string = ""
            for (const col of this.columns) {
                data += getCsvString(col.caption)
            }
            data += "\n"
            for (const row of this.entries) {
                for (const cell of row.cells) {
                    data += getCsvString(cell.valueText)
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

        private updateSort(sortColumn: number) {
            if (this.sortColumn !== sortColumn) {
                this.sortColumn = sortColumn
                this.sortAsc = true
            } else {
                this.sortAsc = !this.sortAsc
            }

            this.sortRows()
            this.lastSelected = null
        }

        private changeValue(cell: ICell) {
            if (this.clickTimeoutId === null) {
                this.clickTimeoutId = setTimeout(() => {
                    cell.selected = false
                    this.clickTimeoutId = null
                }, doubleClickTime)

                if (this.oldCell !== null && this.oldCell !== cell) {
                    this.oldCell.selected = false
                    this.oldCell.isEditing = false
                }
                this.oldCell = cell
                this.oldCell.selected = true
            } else {
                clearTimeout(this.clickTimeoutId)
                this.clickTimeoutId = null

                if (cell === this.oldCell) {
                    if (cell.update !== null) {
                        cell.isEditing = !cell.isEditing
                    }
                } else {
                    if (this.oldCell !== null) {
                        this.oldCell.selected = false
                    }
                    this.oldCell = cell
                    this.oldCell.selected = true
                    this.clickTimeoutId = null
                }
            }
        }

        private selectRow(rowI: number, event: MouseEvent) {
            if (this.lastSelected !== null && event.shiftKey) {
                // Select all rows between current one and the previous selected one.
                let changedRows = 0
                const oldEntry = this.entries[this.lastSelected]
                if (this.lastSelected < rowI) {
                    for (let i = this.lastSelected + 1; i <= rowI; i++) {
                        const entry = this.entries[this.shownRows[i]]
                        if (entry.selected !== oldEntry.selected) {
                            changedRows++
                        }
                        entry.selected = oldEntry.selected
                    }
                } else if (this.lastSelected > rowI) {
                    for (let i = rowI; i <= this.lastSelected - 1; i++) {
                        const entry = this.entries[this.shownRows[i]]
                        if (entry.selected !== oldEntry.selected) {
                            changedRows++
                        }
                        entry.selected = oldEntry.selected
                    }
                } else {
                    oldEntry.selected = !oldEntry.selected
                    this.selectedRows += (oldEntry.selected) ? 1 : -1
                }
                this.selectedRows += (oldEntry.selected) ? changedRows : -changedRows
            } else {
                const entry = this.entries[this.shownRows[rowI]]
                entry.selected = !entry.selected
                this.selectedRows += (entry.selected) ? 1 : -1
                this.lastSelected = rowI
            }
            window.getSelection().removeAllRanges()
            this.updateStatusLine()
        }

        /* To optimize performance when staging entries change, we first pre-build entries and then update them selectively watching staging entries.
           This is to avoid rebuilding complete rows array each time user changes a field.
        */
        @Watch("uv", { deep: true })
        private updateEntries() {
            this.buildEntries()
        }

        @Watch("changes", { deep: true })
        private updateChanges() {
            if (this.changes.isEmpty) {
                // Changes got reset -- rebuild entries.
                // This could be done more efficiently but it would require tracking of what fields were changed.
                this.buildEntries()
            } else {
                this.applyChanges()
            }
        }

        // Apply changes on top of built entries.
        // TODO: make this even more granular, ideally: dynamically bind a watcher to every changed and added entry.
        private applyChanges() {
            if (this.uv.rows !== null) {
                const rows = this.uv.rows

                Object.entries(this.changes.changes).forEach(([schemaName, entityChanges]) => {
                    Object.entries(entityChanges).forEach(([entityName, changedFields]) => {
                        const mapping = this.uv.mappingForEntity(schemaName, entityName)
                        if (mapping === null) {
                            return
                        }

                        Object.entries(changedFields.deleted).forEach(([rowId, deleted]) => {
                            const rowIs = mapping.idsToRows[rowId]
                            if (rowIs === undefined) {
                                return
                            }
                            rowIs.forEach(rowI => {
                                const entry = this.entries[rowI]
                                entry.deleted = deleted
                            })
                        })

                        Object.entries(changedFields.updated).forEach(([rowId, fields]) => {
                            const rowIs = mapping.idsToRows[rowId]
                            if (rowIs === undefined) {
                                return
                            }
                            rowIs.forEach(rowI => {
                                const entry = this.entries[rowI]
                                if (fields === null) {
                                    // Reset to original values
                                    rows[rowI].values.forEach((value, valueI) => {
                                        const columnInfo = this.uv.info.columns[valueI]
                                        const cell = entry.cells[valueI]
                                        cell.value = value.value
                                        cell.valueText = printValue(columnInfo.valueType, value)
                                        cell.valueLowerText = cell.valueText.toLowerCase()
                                    })
                                } else {
                                    Object.entries(fields).forEach(([fieldName, value]) => {
                                        const colIs = mapping.fieldsToColumns[fieldName]
                                        if (colIs === undefined) {
                                            return
                                        }
                                        colIs.forEach(colI => {
                                            const cell = entry.cells[colI]
                                            cell.value = value.value
                                            cell.valueText = value.rawValue
                                            cell.valueLowerText = cell.valueText.toLowerCase()
                                        })
                                    })
                                }
                            })
                        })
                    })
                })
            }
        }

        private created() {
            if (this.isRoot) {
                this.$emit("update:bodyStyle", `
                    @media print {
                        @page {
                            size: landscape;
                        }
                    }
                `)

                const queryCallback = (mql: MediaQueryListEvent) => {
                    if (mql.matches) {
                        this.showLength = this.rows.length
                    }
                }
                const query = window.matchMedia("print")
                query.addListener(queryCallback)
                const printCallback = () => {
                    this.showLength = this.rows.length
                }
                window.addEventListener("beforeprint", printCallback)
                this.printListener = { query, queryCallback, printCallback }
            }

            this.$emit("update:actions", [
                { name: this.$tc("export_to_csv"), callback: () => this.export2csv() },
            ])
            this.$emit("update:enableFilter", true)

            this.buildEntries()
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

        private sortRows() {
            if (this.sortColumn !== null) {
                const sortColumn = this.sortColumn
                const entries = this.entries
                const sortFunction: (a: number, b: number) => number =
                    this.sortAsc ?
                        (a, b) => rowIndicesCompare(a, b, entries, sortColumn) :
                        (a, b) => rowIndicesCompare(b, a, entries, sortColumn)
                this.rows.sort(sortFunction)
            }
        }

        // Update this.rows from this.entries
        private buildRows() {
            this.rows = Array.from({ length: this.entries.length }, (v, i) => i)
            if (this.filter.length !== 0) {
                this.rows = this.rows.filter(rowI => rowContains(this.entries[rowI], this.filter))
            }

            this.sortRows()
            this.updateShowLength()
        }

        // Update this.entries
        private buildEntries() {
            // .rows === null means that we are in "create new" mode -- there are no selected existing values.
            if (this.uv.rows === null) {
                // Not supported in table yet.
                this.entries = []
            } else {
                const viewAttrs = this.uv.attributes

                this.entries = this.uv.rows.map((row, rowI) => {
                    const rowAttrs = row.attributes === undefined ? {} : row.attributes
                    const getRowAttr = (name: string) => rowAttrs[name] || viewAttrs[name]

                    let linkForRow: Location | null = null

                    const rowStyle: Record<string, any> = {}
                    const rowHeight = Number(getRowAttr("RowHeight"))
                    if (!Number.isNaN(rowHeight)) {
                        rowStyle["height"] = `${rowHeight}px`
                    }

                    const cells = row.values.map((cellValue, colI): ICell => {
                        const columnInfo = this.uv.info.columns[colI]
                        const columnAttrs = this.uv.columnAttributes[colI]
                        const cellAttrs = cellValue.attributes === undefined ? {} : cellValue.attributes

                        const getCellAttr = (name: string) => cellAttrs[name] || rowAttrs[name] || columnAttrs[name] || viewAttrs[name]

                        const value = cellValue.value
                        const valueText = getValueText(columnInfo.valueType, cellValue)

                        const linkedViewAttr = cellValue.update === undefined ? undefined : getCellAttr("LinkedView")
                        const link =
                            linkedViewAttr === undefined ? null : {
                                name: "view",
                                params: { "name": String(linkedViewAttr) },
                                query: { "id": String((cellValue.update as IUpdatableField).id) },
                            }
                        const linkedViewForRowAttr = cellValue.update === undefined ? undefined : getCellAttr("RowLinkedView")
                        if (linkedViewForRowAttr !== undefined) {
                            linkForRow = {
                                name: "view",
                                params: { "name": String(linkedViewForRowAttr) },
                                query: { "id": String((cellValue.update as IUpdatableField).id) },
                            }
                        }

                        const style: Record<string, any> = {}

                        const cellColor = getCellAttr("CellColor")
                        if (cellColor !== undefined) {
                            style["background-color"] = String(cellColor)
                        }

                        const fixedColumnAttr = getCellAttr("Fixed")
                        const fixedColumn = fixedColumnAttr === undefined ? false : Boolean(fixedColumnAttr)

                        return {
                            value, valueText, link, style,
                            valueLowerText: valueText.toLowerCase(),
                            fixed: fixedColumn,
                            isEditing: false,
                            attrs: cellAttrs,
                            update: cellValue.update === undefined ? null : cellValue.update,
                            selected: false,
                        }
                    })

                    return {
                        index: rowI,
                        cells,
                        deleted: false,
                        style: rowStyle,
                        selected: false,
                        linkForRow,
                        attrs: rowAttrs,
                    }
                })
            }

            this.buildRows()
            this.fixColumns()
            this.applyChanges()
        }

        private updateShowLength() {
            const tableContainer = this.$refs.tableContainer as Element | undefined
            // Component may still be unmounted
            if (tableContainer === undefined) {
                return
            }
            // + 1 is needed because of rare cases like that:
            // top 974.4000244140625, client height 690, scroll height 1665
            if (tableContainer.scrollTop + tableContainer.clientHeight + 1 >= tableContainer.scrollHeight && this.showLength < this.rows.length) {
                this.showLength = Math.min(this.showLength + showStep, this.rows.length)
                Vue.nextTick(() => this.updateShowLength())
            }
        }

        get filteredRows() {
            return this.rows.filter(rowI => !this.entries[rowI].deleted)
        }

        @Watch("filteredRows")
        private updateStatusLine() {
            const selected = (this.selectedRows > 0) ? `${this.selectedRows}/` : ""
            const line = `${selected}${this.filteredRows.length}`
            this.$emit("update:statusLine", line)
        }

        get shownRows() {
            return this.filteredRows.slice(0, this.showLength)
        }

        get technicalWidth() {
            let left = technicalFieldsWidth
            if (this.hasRowLinks) {
                left += technicalFieldsWidth
            }
            return left
        }

        private fixColumns() {
            let left = this.technicalWidth
            for (const fixedColumnIndex of this.fixedColumnIndexes) {
                const leftStr = `${left}px`
                this.columns[fixedColumnIndex].style["left"] = leftStr
                for (const row of this.entries) {
                    row.cells[fixedColumnIndex].style["left"] = leftStr
                }
                left += this.columns[fixedColumnIndex].width
            }
        }

        get showFixedRow() {
            let tableWidth = this.technicalWidth
            for (const column of this.columns) {
                tableWidth += column.width
            }
            if (tableWidth > screen.width && this.fixedRowColumnIndexes.length > 0) {
                return true
            } else {
                return false
            }
        }
    }
</script>

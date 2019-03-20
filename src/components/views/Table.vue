<i18n>
    {
        "en": {
            "filtered_count": "{status}",
            "clear": "Clear",
            "yes": "Yes",
            "no": "No",
            "export_to_csv": "Export to .csv"
        },
        "ru": {
            "filtered_count":  "{status}",
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
                    <col :class="flagOfFixedPlace ? 'checkbox-col checkbox-cells' : 'checkbox-col'"> <!-- Checkbox column -->
                    <col v-if="hasRowLinks" :class="flagOfFixedPlace ? 'open-form-col opemform-cells' : 'open-form-col'"> <!-- Open form column -->
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
                        <tr v-if="flagOfFixedPlace" class="fixed-place-tr">
                            <td class="fixed-place-td">
                                <div class="fix">
                                    <div @click="selectRow(rowI, $event)" class="fixed-column">
                                        <input type="checkbox" :checked="entries[entryI].selected" v-on:click.self.prevent>
                                    </div>
                                    <div v-if="entries[entryI].linkForRow !== null" class="fixed-column">
                                        <router-link :to="entries[entryI].linkForRow">
                                            ⤢
                                        </router-link>
                                    </div>
                                    <div v-for="i in mobileColumnIndexes">{{ entries[entryI].cells[i].valueText }}</div>
                                </div>
                            </td>
                        </tr>
                        <tr :key="entryI" :style="entries[entryI].style" :class="entries[entryI].selected ? 'selected' : 'none_selected'">
                            <td @click="selectRow(rowI, $event)" class="fixed-column checkbox-cells">
                                <input type="checkbox" :checked="entries[entryI].selected" v-on:click.self.prevent>
                            </td>
                            <td v-if="entries[entryI].linkForRow !== null" class="fixed-column opemform-cells">
                                <router-link :to="entries[entryI].linkForRow">
                                    ⤢
                                </router-link>
                            </td>
                            <td v-for="i in columnIndexes" :key="i" :style="entries[entryI].cells[i].style" :class="entries[entryI].cells[i].fixed ? 'fixed-column' : 'none'">
                                <router-link v-if="entries[entryI].cells[i].link !== null" :to="entries[entryI].cells[i].link">
                                    <b-checkbox v-if="typeof entries[entryI].cells[i].value === 'boolean'" :checked="entries[entryI].cells[i].value" class="div_checkbox" disabled></b-checkbox>
                                    <template v-else>
                                        {{ entries[entryI].cells[i].valueText }}
                                    </template>
                                </router-link>
                                <template v-else>
                                    <b-checkbox v-if="typeof entries[entryI].cells[i].value === 'boolean'" :checked="entries[entryI].cells[i].value" disabled class="div_checkbox"></b-checkbox>
                                    <template v-else>
                                        {{ entries[entryI].cells[i].valueText }}
                                    </template>
                                </template>
                            </td>
                        </tr>
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
    import { setBodyStyle } from "@/style"
    import { IExecutedRow, IExecutedValue, ValueType } from "@/api"
    import { CurrentTranslations } from "@/state/translations"

    interface ICell {
        value: any
        valueText: string
        link: Location | null
        style: Record<string, any>
        fixed: boolean
    }

    interface IRow {
        index: number
        cells: ICell[]
        deleted: boolean
        selected: boolean
        style: Record<string, any>
        linkForRow: Location | null
    }

    interface IColumn {
        columnIndex: number
        caption: string
        style: Record<string, any>
        fixed: boolean
        mobileFixed: boolean
    }

    const SHOW_STEP = 20

    const convertToWords = (str: string) => {
        let words: string[] = []
        let start = 0
        let i = 0
        let deleted = 0
        const spec: string[] = ["\"\'«„”", "\"\'»“”"]
        let indend: number
        while (i < str.length) {
            while (str[i] === " ") {
                i++
                start++
            }
            indend = spec[0].indexOf(str[i])
            if (indend !== -1) {
                // tslint:disable-next-line:no-empty
                while (str[++i] !== spec[1][indend] && str[i] !== undefined) {
                }
                i++
                deleted = 1
            } else {
                while (str[i] !== " " && str[i] !== undefined) {
                    i++
                }
                deleted = 0
            }
            if (start !== i || start + 1 !== i) {
                words = words.concat(str.substring(start + deleted, i - deleted))
            }
            start = i
        }
        return words
    }

    const rowContains = (row: IRow, searchString: string) => {
        const allfilters = convertToWords(searchString)
        for (const filter of allfilters) {
            if (row.cells.some(cell => cell.valueText.toLowerCase().includes(filter.toLowerCase()))) {
                continue
            }
            return false
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
    const technicalFieldsWidth = 20 // checkbox's and openform's td width

    @Component
    export default class UserViewTable extends Vue {
        @staging.State("current") changes!: CurrentChanges
        @translations.Getter("field") fieldTranslation!: (schema: string, entity: string, field: string, defValue: string) => string

        @Prop({ type: UserViewResult }) uv!: UserViewResult
        @Prop({ type: Boolean, default: false }) isRoot!: boolean
        @Prop({ type: String, default: "" }) filter!: string

        private currentFilter: string = ""
        private sortColumn: number | null = null
        private sortAsc: boolean = true
        private entries: IRow[] = []
        private rows: number[] = []
        private showLength: number = 0
        private selectedRows: number = 0
        private lastSelected: number | null = null
        private printListener: { query: MediaQueryList, queryCallback: (mql: MediaQueryListEvent) => void, printCallback: () => void } | null = null

        get hasRowLinks() {
            return this.entries.some(e => e.linkForRow !== null)
        }

        get columns() {
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

                const columnWidthAttr = getColumnAttr("ColumnWidth")
                const columnWidth = columnWidthAttr === undefined ? "200px" : columnWidthAttr
                style["width"] = columnWidth

                const fixedColumnAttr = getColumnAttr("Fixed")
                const fixedColumn = fixedColumnAttr === undefined ? false : fixedColumnAttr

                const fixedFieldAttr = getColumnAttr("MobileFixed")
                const fixedField = fixedFieldAttr === undefined ? false : fixedFieldAttr

                return {
                    columnIndex: i,
                    caption, style,
                    fixed: fixedColumn,
                    mobileFixed: fixedField,
                }
            })
        }

        get columnIndexes() {
            const array = []
            for (const column of this.columns) {
                if (column.fixed) {
                    array.push(column.columnIndex)
                }
            }
            for (const column of this.columns) {
                if (!column.fixed) {
                    array.push(column.columnIndex)
                }
            }
            return array
        }

        get mobileColumnIndexes() {
            const array = []
            for (const column of this.columns) {
                if (column.mobileFixed) {
                    array.push(column.columnIndex)
                }
            }
            return array
        }

        @Watch("filter")
        private updateFilter() {
            if (this.filter !== this.currentFilter) {
                const oldFilter = this.currentFilter
                this.currentFilter = this.filter
                if (this.filter === "" || !this.filter.includes(oldFilter)) {
                    this.buildRows()
                } else {
                    // Filter existing rows when we filter a subset of already filtered ones.
                    this.rows = this.rows.filter(rowI => rowContains(this.entries[rowI], this.currentFilter))
                }
                this.lastSelected = null
            }
        }

        private export2csv() {
            let data: string = ""
            for (const col of this.columns) {
                data += getCsvString(col.caption.toString())
            }
            data += "\n"
            for (const row of this.entries) {
                for (const cell of row.cells) {
                    data += getCsvString(cell.valueText.toString())
                }
                data += "\n"
            }

            const element = document.createElement("a")
            element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent("\uFEFF" + data))
            element.setAttribute("download", this.$route.params["name"] + ".csv")

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

        private selectRow(rowI: number, event: MouseEvent) {
            if (this.lastSelected !== null && event.shiftKey) {
                // Select all rows between current one and the previous selected one.
                let changeRows = 0
                const oldEntry = this.entries[this.lastSelected]
                if (this.lastSelected < rowI) {
                    for (let i = this.lastSelected + 1; i <= rowI; i++) {
                        const entry = this.entries[this.shownRows[i]]
                        if (entry.selected !== oldEntry.selected) {
                            changeRows++
                        }
                        entry.selected = oldEntry.selected
                    }
                } else if (this.lastSelected > rowI) {
                    for (let i = rowI; i <= this.lastSelected - 1; i++) {
                        const entry = this.entries[this.shownRows[i]]
                        if (entry.selected !== oldEntry.selected) {
                            changeRows++
                        }
                        entry.selected = oldEntry.selected
                    }
                } else {
                    oldEntry.selected = !oldEntry.selected
                    this.selectedRows += (oldEntry.selected) ? 1 : -1
                }
                this.selectedRows += (oldEntry.selected) ? changeRows : -changeRows
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
                setBodyStyle(`
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

        private destroyed() {
            if (this.printListener !== null) {
                window.removeEventListener("beforeprint", this.printListener.printCallback)
                this.printListener.query.removeListener(this.printListener.queryCallback)
            }
        }

        private mounted() {
            this.updateShowLength()
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
            if (this.currentFilter !== "") {
                this.rows = this.rows.filter(rowI => rowContains(this.entries[rowI], this.currentFilter))
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

                    let linkForRow = null

                    const rowStyle: Record<string, any> = {}
                    const rowHeight = getRowAttr("RowHeight")
                    if (rowHeight !== undefined) {
                        rowStyle["height"] = rowHeight
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
                                params: { "name": String(linkedViewAttr) },
                                query: { "id": String((cellValue.update as IUpdatableField).id) },
                            }
                        }

                        const style: Record<string, any> = {}

                        const cellColor = getCellAttr("CellColor")
                        if (cellColor !== undefined) {
                            style["background-color"] = cellColor
                        }

                        const fixedColumnAttr = getCellAttr("Fixed")
                        const fixedColumn = fixedColumnAttr === undefined ? false : fixedColumnAttr

                        return {
                            value, valueText, link, style,
                            fixed: fixedColumn,
                        }
                    })

                    return {
                        index: rowI,
                        cells,
                        deleted: false,
                        style: rowStyle,
                        selected: false,
                        linkForRow,
                    }
                })
            }

            this.buildRows()
            this.fixedColumn()
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
                this.showLength = Math.min(this.showLength + SHOW_STEP, this.rows.length)
                Vue.nextTick(() => this.updateShowLength())
            }
        }

        get filteredRows() {
            return this.rows.filter(rowI => !this.entries[rowI].deleted)
        }

        @Watch("filteredRows")
        private updateStatusLine() {
            const selected = (this.selectedRows > 0) ? this.selectedRows.toString() + "/" : ""
            this.$emit("update:statusLine", this.$tc("filtered_count", this.filteredRows.length, { status: selected + this.filteredRows.length.toString() }))
        }

        get shownRows() {
            return this.filteredRows.slice(0, this.showLength)
        }

        private fixedColumn() {
            const allFixedColumn = []
            for (const column of this.columns) {
                if (column.fixed) {
                    allFixedColumn.push(column.columnIndex)
                }
            }
            let left = technicalFieldsWidth
            if (this.hasRowLinks) {
                left = technicalFieldsWidth * 2
            }
            for (const fixedColumnIndex of allFixedColumn) {
                this.columns[fixedColumnIndex].style["left"] = left + "px"
                for (const row of this.entries) {
                    row.cells[fixedColumnIndex].style["left"] = left + "px"
                }
                left += parseInt(this.columns[fixedColumnIndex].style["width"], 10)
            }
        }

        get flagOfFixedPlace() {
            let tableWidth = technicalFieldsWidth
            if (this.hasRowLinks) {
                tableWidth = technicalFieldsWidth * 2
            }
            for (const column of this.columns) {
                tableWidth += parseInt(column.style["width"], 10)
            }
            if (tableWidth > screen.width && this.mobileColumnIndexes.length) {
                return true
            } else {
                return false
            }
        }
    }
</script>

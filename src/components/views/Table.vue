<i18n>
    {
        "en": {
            "search_placeholder": "Type to search",
            "filtered_count": "{status}",
            "clear": "Clear",
            "yes": "Yes",
            "no": "No",
            "export_to_csv": "Export to .csv"
        },
        "ru": {
            "search_placeholder": "Поиск",
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
        <b-form inline class="find">
            <b-input-group>
                <b-form-input class="find_in form-control" :value="filter" @input="updateFilter($event)" :placeholder="$t('search_placeholder')" />
                <b-input-group-append>
                    <span v-if="filter" id="searchclear" class="glyphicon glyphicon-remove-circle" @click="updateFilter('')">×</span>
                </b-input-group-append>
            </b-input-group>
        </b-form>
        <div ref="tableContainer" class="tabl" @scroll="updateShowLength()" @resize="updateShowLength()">
            <table class="tabl table b-table" :mounted="this.$nextTick(() => fixedColumn() )">
                <colgroup>
                    <col class="checkbox-col"> <!-- Checkbox column -->
                    <col v-if="hasRowLinks" class="open-form-col"> <!-- Open form column -->
                    <col v-for="i in columnIndexes" :key="i" :style="columns[i].style">
                </colgroup>
                <thead>
                    <tr>
                        <th class="fixed-column"></th>
                        <th v-if="hasRowLinks" class="fixed-column"></th>
                        <th v-for="i in columnIndexes" :key="i" :title="columns[i].caption" @click="updateSort(i)" :class="columns[i].fixed ? 'fixed-column sorting' : 'sorting'">
                            {{ columns[i].caption }}
                        </th>
                    </tr>
                </thead>
                <tbody v-for="(entryI, rowI) in showedRows">
                    <tr v-if="mobileColumnIndexes.length" class="fixed-place-tr"><td class="fixed-place-td"><div class="fix"><div v-for="i in mobileColumnIndexes">{{ entries[entryI].cells[i].valueText }}</div></div></td></tr>
                    <tr :key="entryI" :style="entries[entryI].style" :class="entries[entryI].selected ? 'selected' : 'none_selected'">
                        <td @click="selectRow(rowI, $event)" class="fixed-column">
                            <input type="checkbox" :checked="entries[entryI].selected" v-on:click.self.prevent>
                        </td>
                        <td v-if="entries[entryI].linkToForm !== null" class="fixed-column">
                            <router-link :to="entries[entryI].linkToForm">
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
                </tbody>
            </table>
        </div>
    </b-container>
</template>
<script lang="ts">
    import { Component, Prop, Watch, Vue } from "vue-property-decorator"
    import { Location } from "vue-router"
    import { namespace } from "vuex-class"
    import { UserViewResult } from "@/state/user_view"
    import { ChangesMap, IEntityChanges } from "@/state/staging_changes"
    import { setBodyStyle } from "@/style"
    import { IExecutedRow, IExecutedValue, IUpdateFieldInfo } from "@/api"
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
        linkToForm: Location | null
    }

    interface IColumn {
        columnIndex: number
        caption: string
        style: Record<string, any>
        fixed: boolean
        mobileFixed: boolean
    }

    const SHOW_STEP = 20

    const rowContains = (row: IRow, searchString: string) => {
        const reg = new RegExp(searchString, "i")
        return row.cells.some(cell => reg.test(cell.valueText))
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

    const staging = namespace("staging")
    const translations = namespace("translations")

    @Component
    export default class UserViewTable extends Vue {
        @staging.State("changes") changes!: ChangesMap
        @staging.Getter("forUserView") changesForUserView!: (uv: UserViewResult) => IEntityChanges
        @staging.Getter("isEmpty") changesAreEmpty!: boolean
        @translations.Getter("field") fieldTranslation!: (schema: string, entity: string, field: string, defValue: string) => string

        filter: string = ""
        sortColumn: number | null = null
        sortAsc: boolean = true
        entries: IRow[] = []
        rows: number[] = []
        showLength: number = 0
        selectedRows: number = 0
        lastSelected: number | null = null
        printListener: { query: MediaQueryList, queryCallback: (mql: MediaQueryListEvent) => void, printCallback: () => void } | null = null

        @Prop({ type: UserViewResult }) private uv!: UserViewResult
        @Prop({ type: Boolean, default: false }) private isRoot!: boolean

        get hasRowLinks() {
            const viewAttrs = this.uv.attributes

            let rowLinks = false
            if (this.uv.rows && this.uv.rows.length > 0) {
                const firstRow = this.uv.rows[0]
                const rowAttrs = firstRow.attributes === undefined ? {} : firstRow.attributes
                const getRowAttr = (name: string) => rowAttrs[name] || viewAttrs[name]
                rowLinks = firstRow.id !== undefined && getRowAttr("LinkedView") !== undefined
            }
            return rowLinks
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
                } else if (this.uv.info.updateEntity !== null && columnInfo.updateField !== null) {
                    caption = this.fieldTranslation(this.uv.info.updateEntity.schema, this.uv.info.updateEntity.name, columnInfo.updateField.name, columnInfo.name)
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

        private updateFilter(filter: string) {
            if (filter !== this.filter) {
                const oldFilter = this.filter
                this.filter = filter
                if (filter === "" || !filter.includes(oldFilter)) {
                    this.buildRows()
                } else {
                    // Filter existing rows when we filter a subset of already filtered ones.
                    this.rows = this.rows.filter(rowI => rowContains(this.entries[rowI], this.filter))
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
                        const entry = this.entries[this.showedRows[i]]
                        if (entry.selected !== oldEntry.selected) {
                            changeRows++
                        }
                        entry.selected = oldEntry.selected
                    }
                } else if (this.lastSelected > rowI) {
                    for (let i = rowI; i <= this.lastSelected - 1; i++) {
                        const entry = this.entries[this.showedRows[i]]
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
                const entry = this.entries[this.showedRows[rowI]]
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
        @Watch("uv")
        private updateEntries() {
            this.buildEntries()
        }

        @Watch("changes")
        private updateChanges() {
            if (this.changesAreEmpty) {
                // Changes got reset -- rebuild entries.
                // This could be done more efficiently but it would require tracking of what fields were changed.
                this.buildEntries()
            } else {
                const changedFields = this.getCurrentChanges()
                if (this.uv.rows !== null) {
                    Object.entries(changedFields.deleted).forEach(([rowId, deleted]) => {
                        const rowI = this.uv.updateRowIds[rowId]
                        const entry = this.entries[rowI]
                        if (deleted !== undefined) {
                            entry.deleted = deleted
                        }
                    })

                    Object.entries(changedFields.updated).forEach(([rowId, fields]) => {
                        const rowI = this.uv.updateRowIds[rowId]
                        const entry = this.entries[rowI]
                        if (fields === null) {
                            // Reset to original values
                            (this.uv.rows as IExecutedRow[])[rowI].values.forEach((value, valueI) => {
                                const cell = entry.cells[valueI]
                                cell.value = value.value
                                cell.valueText = this.getValueText(value)
                            })
                        } else {
                            Object.entries(fields).forEach(([fieldName, value]) => {
                                const cell = entry.cells[this.uv.updateColumnIds[fieldName]]
                                cell.value = value
                                cell.valueText = this.getValueText({ value })
                            })
                        }
                    })
                }
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

                this.$emit("update:actions", [
                    { name: this.$tc("export_to_csv"), action: () => this.export2csv() },
                ])
            }
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
            if (this.filter !== "") {
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
                const changedFields = this.getCurrentChanges()
                const viewAttrs = this.uv.attributes

                this.entries = this.uv.rows.map((row, rowI) => {
                    const rowAttrs = row.attributes === undefined ? {} : row.attributes
                    const getRowAttr = (name: string) => rowAttrs[name] || viewAttrs[name]

                    let updatedValues: Record<string, any> = {}
                    let deleted = false
                    if (row.id !== undefined) {
                        deleted = changedFields.deleted[row.id] || false
                        const updatedEntry = changedFields.updated[row.id]
                        if (updatedEntry !== undefined && updatedEntry !== null) {
                            updatedValues = updatedEntry
                        }
                    }

                    const linkedViewAttrForRow = row.id === undefined ? undefined : getRowAttr("LinkedView")
                    const linkForRow =
                        linkedViewAttrForRow === undefined ? null : {
                            name: "view",
                            params: { "name": String(linkedViewAttrForRow) },
                            query: { "id": String(row.id) },
                        }

                    const rowStyle: Record<string, any> = {}
                    const rowHeight = getRowAttr("RowHeight")
                    if (rowHeight !== undefined) {
                        rowStyle["height"] = rowHeight
                    }

                    const cells = row.values.map((value, colI): ICell => {
                        const columnInfo = this.uv.info.columns[colI]
                        const columnAttrs = this.uv.columnAttributes[colI]
                        const cellAttrs = value.attributes === undefined ? {} : value.attributes

                        const getCellAttr = (name: string) => cellAttrs[name] || rowAttrs[name] || columnAttrs[name] || viewAttrs[name]

                        const updatedValue = columnInfo.updateField === null ? undefined : updatedValues[columnInfo.updateField.name]
                        const currentValue = updatedValue === undefined ? value : { value: updatedValue }
                        const valueText = this.getValueText(currentValue)

                        const linkedViewAttr = row.id === undefined ? undefined : getCellAttr("LinkedView")
                        const link =
                            linkedViewAttr === undefined ? null : {
                                name: "view",
                                params: { "name": String(linkedViewAttr) },
                                query: { "id": String(row.id) },
                            }

                        const style: Record<string, any> = {}

                        const cellColor = getCellAttr("CellColor")
                        if (cellColor !== undefined) {
                            style["background-color"] = cellColor
                        }

                        const fixedColumnAttr = getCellAttr("Fixed")
                        const fixedColumn = fixedColumnAttr === undefined ? false : fixedColumnAttr

                        return {
                            value: currentValue.value,
                            valueText, link, style,
                            fixed: fixedColumn,
                        }
                    })

                    return {
                        index: rowI,
                        cells, deleted,
                        style: rowStyle,
                        selected: false,
                        linkToForm: linkForRow,
                    }
                })
            }

            this.buildRows()
        }

        private getValueText(val: IExecutedValue) {
            if (val.value === null) {
                return ""
            } else {
                return val.pun === undefined ? String(val.value) : `(${val.value}) ${val.pun}`
            }
        }

        private getCurrentChanges() {
            return this.changesForUserView(this.uv)
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

        get showedRows() {
            return this.filteredRows.slice(0, this.showLength)
        }
        private fixedColumn() {
            const allFixedTd = document.getElementsByClassName("fixed-column")
            if (screen.width > 768) {
                for (const el of allFixedTd) {
                    const element = el as HTMLElement
                    element.style.left = element.style.left === "" || "auto" ? String(element.offsetLeft) + "px" : element.style.left
                }
            } else {
                for (const el of allFixedTd) {
                    const element = el as HTMLElement
                    element.style.left = "auto"
                }
            }
        }
    }
    window.addEventListener("orientationchange", () => {
        const allFixedTd = document.getElementsByClassName("fixed-column")
        if (screen.width <= 768) {
            for (const el of allFixedTd) {
                const element = el as HTMLElement
                element.style.left = "auto"
            }
        }
        if (screen.width > 768) {
            for (const el1 of allFixedTd) {
                const element2 = el1 as HTMLElement
                element2.style.left = element2.style.left === "" || "auto" ? String(element2.offsetLeft) + "px" : element2.style.left
            }
        }
    })
</script>

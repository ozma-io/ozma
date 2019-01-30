<i18n>
    {
        "en-US": {
            "language": "en",
            "filter": "Filter",
            "search_placeholder": "Type to search",
            "filtered_count": "Rows count: {count}",
            "clear": "Clear",
            "yes": "Yes",
            "no": "No"
        },
        "ru-RU": {
            "language": "ru",
            "filter": "Поиск",
            "search_placeholder": "Введите фразу",
            "filtered_count": "Кол-во записей: {count}",
            "clear": "Очистить",
            "yes": "Да",
            "no": "Нет"
        }
    }
</i18n>

<template>
    <b-container fluid class="cont_table without_padding">
        <b-form-group horizontal :label="$t('filter')" class="find" :lang="$t('language')">
            <b-input-group>
                <b-form-input class="find_in" :value="filter" @input="updateFilter($event)" :placeholder="$t('search_placeholder')" />
                <b-input-group-append>
                    <b-btn class="btn btn-light" :disabled="!filter" @click="updateFilter('')">{{ $t('clear') }}</b-btn>
                </b-input-group-append>
            </b-input-group>
        </b-form-group>
        <div ref="tableContainer" class="tabl" @scroll="updateShowLength()" @resize="updateShowLength()">
            <table class="tabl table b-table">
                <colgroup>
                    <col class="checkbox-col"> <!-- Checkbox column -->
                    <col v-if="hasRowLinks" class="open-form-col"> <!-- Open form column -->
                    <col v-for="(col, colI) in columns" :key="colI" :style="col.style">
                </colgroup>
                <thead>
                    <tr>
                        <th></th>
                        <th v-if="hasRowLinks"></th>
                        <th v-for="(col, colI) in columns" :key="colI" :title="col.caption" class="sorting" @click="updateSort(colI)">
                            {{ col.caption }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(entryI, rowI) in showedRows" :key="entryI" :style="entries[entryI].style" :class="entries[entryI].selected ? 'selected' : 'none_selected'">
                        <td>
                            <input type="checkbox" :checked="entries[entryI].selected" @click="selectRow(rowI, $event)">
                        </td>
                        <td v-if="entries[entryI].linkToForm !== null">
                            <router-link :to="entries[entryI].linkToForm">
                                ⤢
                            </router-link>
                        </td>
                        <td v-for="(cell, colI) in entries[entryI].cells" :key="colI" :style="cell.style">
                            <router-link v-if="cell.link !== null" :to="cell.link">
                                <b-checkbox v-if="typeof cell.value === 'boolean'" :checked="cell.value" disabled></b-checkbox>
                                <template v-else>
                                    {{ cell.valueText }}
                                </template>
                            </router-link>
                            <template v-else>
                                <b-checkbox v-if="typeof cell.value === 'boolean'" :checked="cell.value" disabled></b-checkbox>
                                <template v-else>
                                    {{ cell.valueText }}
                                </template>
                            </template>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="count_row">
            {{ this.filteredRows.length }}
            <a v-bind:download="this.$route.params['name']+'.csv'" v-bind:href="export2csv()">{{ this.$route.params["name"] + '.csv' }}</a>
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
    import { IExecutedRow, IExecutedValue } from "@/api"

    interface ICell {
        value: any
        valueText: string
        link: Location | null
        style: Record<string, any>
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
        caption: string
        style: Record<string, any>
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

    const staging = namespace("staging")

    @Component
    export default class UserViewTable extends Vue {
        @staging.State("changes") changes!: ChangesMap
        @staging.Getter("forUserView") changesForUserView!: (uv: UserViewResult) => IEntityChanges
        @staging.Getter("isEmpty") changesAreEmpty!: boolean

        filter: string = ""
        sortColumn: number | null = null
        sortAsc: boolean = true
        entries: IRow[] = []
        rows: number[] = []
        showLength: number = 0
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

                const captionAttr = getColumnAttr("Caption")
                const caption = captionAttr !== undefined ? String(captionAttr) : columnInfo.name

                const style: Record<string, any> = {}

                const columnWidthAttr = getColumnAttr("ColumnWidth")
                const columnWidth = columnWidthAttr === undefined ? "200px" : columnWidthAttr
                style["width"] = columnWidth

                return {
                    caption, style,
                }
            })
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

        private getCvsString(str: string): string {
            let csvstr = str.replace(/"/g, '""')
            if (csvstr.search(/("|;|\n)/g) > 0) {
                csvstr = "\"" + csvstr + "\""
            }
            csvstr += ";"
            return csvstr
        }

        private export2csv(): string {
            const type = "data:text/csv;"
            const charset = "charset=utf-8,"
            let data: string = ""
            for (const col of this.columns) {
                data += this.getCvsString(col.caption.toString())
            }
            data += "\n"
            for (const row of this.entries) {
                for (const cell of row.cells) {
                    data += this.getCvsString(cell.valueText.toString())
                }
                data += "\n"
            }
            return type + charset + "%EF%BB%BF" + data
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
                const oldEntry = this.entries[this.lastSelected]
                if (this.lastSelected < rowI) {
                    for (let i = this.lastSelected + 1; i <= rowI; i++) {
                        const entry = this.entries[this.showedRows[i]]
                        entry.selected = oldEntry.selected
                    }
                } else if (this.lastSelected > rowI) {
                    for (let i = rowI; i <= this.lastSelected - 1; i++) {
                        const entry = this.entries[this.showedRows[i]]
                        entry.selected = oldEntry.selected
                    }
                } else {
                    oldEntry.selected = !oldEntry.selected
                }
            } else {
                const entry = this.entries[this.showedRows[rowI]]
                entry.selected = !entry.selected
                this.lastSelected = rowI
            }
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
                    Object.keys(changedFields.deleted).forEach(rowId => {
                        const deleted = changedFields.deleted[rowId]
                        const rowI = this.uv.updateRowIds[rowId]
                        const entry = this.entries[rowI]
                        if (deleted !== undefined) {
                            entry.deleted = deleted
                        }
                    })

                    Object.keys(changedFields.updated).forEach(rowId => {
                        const fields = changedFields.updated[rowId]
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
                            Object.keys(fields).forEach(fieldName => {
                                const cell = entry.cells[this.uv.updateColumnIds[fieldName]]
                                const value = fields[fieldName]
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

                        return {
                            value: currentValue.value,
                            valueText, link, style,
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
            if (tableContainer.scrollTop + tableContainer.clientHeight >= tableContainer.scrollHeight && this.showLength < this.rows.length) {
                this.showLength = Math.min(this.showLength + SHOW_STEP, this.rows.length)
                Vue.nextTick(() => this.updateShowLength())
            }
        }

        get filteredRows() {
            return this.rows.filter(rowI => !this.entries[rowI].deleted)
        }

        get showedRows() {
            return this.filteredRows.slice(0, this.showLength)
        }
    }
</script>

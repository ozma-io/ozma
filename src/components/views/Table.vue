<i18n>
    {
        "en-US": {
            "language": "en",
            "filter": "Filter",
            "search_placeholder": "Type to search",
            "clear": "Clear",
            "yes": "Yes",
            "no": "No"
        },
        "ru-RU": {
            "language": "ru",
            "filter": "Поиск",
            "search_placeholder": "Введите фразу",
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
        <div class="tabl">
            <table class="table b-table">
                <col> <!-- Checkbox column -->
                <col> <!-- Open form column -->
                <col v-for="(col, col_i) in columns" :key="col_i" :style="col.style">
                <thead>
                    <tr>
                        <th class="empty_th"></th>
                        <th class="empty_th"></th>
                        <th v-for="(col, col_i) in columns" :key="col_i" class="sorting" :style="col.style" @click="updateSort(col_i)">
                            {{ col.caption }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row_i in rows" :key="row_i" v-if="!entries[row_i].deleted" :style="entries[row_i].style">
                        <td class="empty_th">
                            <input v-if="entries[row_i].selected" type="checkbox" checked="checked" class="flag" v-on:change="entries[row_i].selected=!entries[row_i].selected">
                            <input v-else type="checkbox" class="flag" v-on:change="entries[row_i].selected=!entries[row_i].selected">
                        </td>
                        <td class="empty_th">
                            ⤢
                        </td>
                        <td v-for="(cell, col_i) in entries[row_i].cells" :key="col_i" :style="cell.style">
                            <div  class="contentTd">
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
                            </div>
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
    import { IExecutedRow, IExecutedValue } from "@/api"

    interface ICell {
        value: any
        valueText: string
        link: Location | null
        style: Record<string, any>
    }

    interface IRow {
        cells: ICell[]
        deleted: boolean
        style: Record<string, any>
    }

    interface IColumn {
        caption: string
        style: Record<string, any>
    }

    const rowContains = (row: IRow, searchString: string) => {
        return row.cells.some(cell => cell.valueText.includes(searchString))
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

        @Prop({ type: UserViewResult }) private uv!: UserViewResult
        @Prop({ type: Boolean, default: false }) private isRoot!: boolean

        get columns() {
            const viewAttrs = this.uv.attributes

            return this.uv.info.columns.map((columnInfo, i) => {
                const columnAttrs = this.uv.columnAttributes[i]
                const getColumnAttr = (name: string) => columnAttrs[name] || viewAttrs[name]

                const captionAttr = getColumnAttr("Caption")
                const caption = captionAttr !== undefined ? String(captionAttr) : columnInfo.name

                const style: Record<string, any> = {}
                const columnWidth = getColumnAttr("ColumnWidth")
                if (columnWidth !== undefined) {
                    style["width"] = columnWidth
                }

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
            }
        }

        private updateSort(sortColumn: number) {
            if (this.sortColumn !== sortColumn) {
                this.sortColumn = sortColumn
                this.sortAsc = true
            } else {
                this.sortAsc = !this.sortAsc
            }

            this.sortRows()
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
            }
            this.buildEntries()
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

                        const updatedValue = updatedValues[columnInfo.name]
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
                        style: rowStyle,
                        cells, deleted,
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
    }

    let shiftDown = false

    const setShiftDown = (event: KeyboardEvent) => {
        if (event.keyCode === 16 || event.charCode === 16) {
            shiftDown = true
        }
    }

    const setShiftUp =  (event: KeyboardEvent) => {
        if (event.keyCode === 16 || event.charCode === 16) {
            shiftDown = false
        }
    }

    document.addEventListener("keydown", setShiftDown)
    document.addEventListener("keyup", setShiftUp)

    const elements = document.getElementsByClassName("flag")
    let lastcheck = 0

    function getoncheck() {
        for (let i = 0; i < elements.length; i++) {
            const chebox = (elements[i] as HTMLInputElement)
            chebox.onchange = oncheck
            chebox.setAttribute("index", String(i))
        }
    }
    function oncheck(ev: Event) {
        const e = ev || window.event
        const target = e.target || e.srcElement
        let i = lastcheck
        lastcheck = Number((target as HTMLInputElement).getAttribute("index"))

        if (shiftDown) {
            while (elements[i] !== target) {
                (elements[i] as HTMLInputElement).checked = (target as HTMLInputElement).checked
                if (lastcheck > i) {
                    i++
                } else {
                    i--
                }
            }
        }

    }

    function checkedd() {
        for (const i of elements) {
            const check = (i as HTMLInputElement)
            if (check.checked) {
                ((((check as HTMLInputElement).parentNode as HTMLInputElement).parentNode as HTMLInputElement).parentNode as HTMLInputElement).style.backgroundColor = "var(--color-table-select)"
            } else {
                ((((check as HTMLInputElement).parentNode as HTMLInputElement).parentNode as HTMLInputElement).parentNode as HTMLInputElement).style.backgroundColor = "var(--color-table-bg)"
            }
        }
        getoncheck()
        document.addEventListener("keydown", setShiftDown)
        document.addEventListener("keyup", setShiftUp)
        setTimeout(checkedd, 5)
    }
    checkedd()
</script>

<style lang="sass">
    body
        overflow: hidden

    @media print
        @page
            size: landscape
</style>

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
                  {'nested-table-block': isRoot,
                  'active_editing': isActiveEdit}]">
        <div id="disable_edit"
             :class="{'edit_active': isActiveEdit}"
             @click="closeFormControl()">
        </div>
        <div ref="tableContainer" class="tabl" @scroll="updateShowLength()" @resize="updateShowLength()">
            <table :class="['custom-table', 'table', 'b-table',
                            {'edit_active': isActiveEdit}]">
                <colgroup>
                    <col :class="['checkbox-col', {'checkbox-cells': showFixedRow}]"> <!-- Checkbox column -->
                    <col v-if="hasRowLinks" :class="['open-form-col', {'openform-cells': showFixedRow}]"> <!-- Row link column -->
                    <col v-for="i in columnIndexes" :key="i" :style="columns[i].style">
                </colgroup>
                <thead class="table-head">
                    <tr>
                        <th class="fixed-column checkbox-cells table-th" @click="selectAllRows">
                            <input type="checkbox" :checked="selectedAll">
                        </th>
                        <th v-if="hasRowLinks" class="fixed-column openform-cells links-style table-th">
                            <span class="table-th_span" @click="changeShowEmptyRow()" :title="this.$tc('show_new_row')">
                                {{ showEmptyRow ? "-" : "+" }}
                            </span>
                        </th>
                        <th v-for="i in columnIndexes"
                            :class="['sorting', 'table-th', { 'fixed-column' : columns[i].fixed }]"
                            :style="columns[i].style"
                            :key="i"
                            :title="columns[i].caption"
                            @click="updateSort(i)">
                                {{ columns[i].caption }}
                                <template v-if="sortColumn === i">
                                    <span v-if="sortAsc">▲</span>
                                    <span v-else>▼</span>
                                </template>
                        </th>
                    </tr>
                </thead>
                <tbody class="table-body">
                    <template v-for="(entry, entryI) in newEntries">
                        <TableFixedRow v-if="showFixedRow"
                                :key="`fixed-new-${entryI}`"
                                :entry="entry"
                                :columnIndexes="fixedRowColumnIndexes"
                                :columns="columns"
                                :uv="uv"
                                added
                                :hasRowLinks="hasRowLinks"
                                :selected="entry.id !== -1 ? rowIsSelected(-1 - entry.id) : false"
                                @select="entry.id !== -1 ? selectRow(-1 - entry.id, $event) : () => {}"
                                @cellClick="cellClick"
                                @update="beforeAddEntry(entry)" />
                        <TableRow :key="`new-${entryI}`"
                                :entry="entry"
                                :columnIndexes="columnIndexes"
                                :columns="columns"
                                :uv="uv"
                                added
                                :hasRowLinks="hasRowLinks"
                                :selected="entry.id !== -1 ? rowIsSelected(-1 - entry.id) : false"
                                @select="entry.id !== -1 ? selectRow(-1 - entry.id, $event) : () => {}"
                                @cellClick="cellClick"
                                @update="beforeAddEntry(entry)" />
                    </template>
                    <template v-for="(entryI, rowI) in shownRows">
                        <TableFixedRow v-if="showFixedRow"
                                :key="`fixed-${entryI}`"
                                :entry="entries[entryI]"
                                :columnIndexes="fixedRowColumnIndexes"
                                :columns="columns"
                                :uv="uv"
                                :hasRowLinks="hasRowLinks"
                                :selected="rowIsSelected(entryI)"
                                @select="selectRow(rowI, $event)"
                                @cellClick="cellClick" />
                        <TableRow :key="entryI"
                                :entry="entries[entryI]"
                                :columnIndexes="columnIndexes"
                                :columns="columns"
                                :uv="uv"
                                :selected="rowIsSelected(entryI)"
                                :hasRowLinks="hasRowLinks"
                                @select="selectRow(rowI, $event)"
                                @cellClick="cellClick" />
                    </template>
                </tbody>
            </table>
        </div>
    </div>
</template>
<script lang="ts">
    import { Component, Prop, Watch, Vue } from "vue-property-decorator"
    import { Location } from "vue-router"
    import { namespace } from "vuex-class"
    import { tryDicts } from "@/utils"
    import seq from "@/sequences"
    import { IUpdatableField, IProcessedValue, UserViewResult, EntriesMap, printValue, homeSchema } from "@/state/user_view"
    import { CurrentChanges, IEntityChanges, IUpdatedCell, convertValue, AutoSaveLock } from "@/state/staging_changes"
    import { IExecutedRow, IExecutedValue, ValueType, IResultColumnInfo, SchemaName, EntityName, FieldName, IEntityRef, IColumnField } from "@/api"
    import { IQuery, attrToQuerySelf, attrToQueryRef } from "@/state/query"
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

    const changeRowId = (row: IRow, newId: number) => {
        row.id = newId
        row.cells.forEach(item => {
            if (item.update !== null) {
                item.update.id = newId
            }
        })
    }

    const rowIndicesCompare = (aIndex: number, bIndex: number, entries: IRow[], sortColumn: number, collator: Intl.Collator) => {
        const a = entries[aIndex]
        const b = entries[bIndex]
        return collator.compare(a.cells[sortColumn].value,
                                b.cells[sortColumn].value)
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
    const userView = namespace("userView")

    @Component({
        components: {
            TableRow, TableFixedRow,
        },
    })
    export default class UserViewTable extends Vue {
        @staging.State("current") changes!: CurrentChanges
        @staging.Action("deleteEntry") deleteEntry!: (args: { schema: SchemaName, entity: EntityName, id: number }) => Promise<void>
        @staging.Action("addAutoSaveLock") addAutoSaveLock!: () => Promise<AutoSaveLock>
        @staging.Action("resetAddedEntry") resetAddedEntry!: (args: { schema: string, entity: string, newId: number }) => Promise<void>
        @staging.Action("removeAutoSaveLock") removeAutoSaveLock!: (id: AutoSaveLock) => Promise<void>
        @staging.Action("addEntry") addEntry!: (args: { schema: SchemaName, entity: EntityName, position?: number }) => Promise<void>
        @staging.Action("setAddedField") setAddedField!: (args: { schema: SchemaName, entity: EntityName, newId: number, field: FieldName, value: any }) => Promise<void>
        @userView.Action("getEntries") getEntries!: (_: { schemaName: SchemaName, entityName: EntityName }) => Promise<void>
        @userView.State("entries") entriesMap!: EntriesMap

        @Prop({ type: UserViewResult }) uv!: UserViewResult
        @Prop({ type: Boolean, default: false }) isRoot!: boolean
        @Prop({ type: Array, default: () => [] }) filter!: string[]
        @Prop({ type: Object, default: () => ({}) }) defaultValues!: Record<string, any>

        private currentFilter: string[] = []
        private sortColumn: number | null = null
        private sortAsc: boolean = true
        private sortOptions: Intl.CollatorOptions = {}
        private entries: IRow[] = []
        private rows: number[] = []
        private showLength: number = 0
        private selectedRows: number[] = []
        private selectedAll: boolean = false
        private lastSelected: number | null = null
        private printListener: { query: MediaQueryList, queryCallback: (mql: MediaQueryListEvent) => void, printCallback: () => void } | null = null
        private oldCell: ICell | null = null
        private oldRow: IRow | null = null
        private clickTimeoutId: NodeJS.Timeout | null = null
        private newEntries: IRow[] = []
        private showEmptyRow: boolean = false

        private changeShowEmptyRow(on?: boolean) {
            if (on !== undefined) {
                if (this.showEmptyRow === on) {
                    return
                } else {
                    this.showEmptyRow = on
                }
            } else {
                this.showEmptyRow = !this.showEmptyRow
            }

            if (this.showEmptyRow) {
                this.newEmptyRow(-1, 0)
            } else {
                this.newEntries.shift()
            }
        }

        get hasRowLinks() {
            return this.entries.some(e => e.linkForRow !== null)
        }

        get columns(): IColumn[] {
            const viewAttrs = this.uv.attributes

            return this.uv.info.columns.map((columnInfo, i) => {
                const columnAttrs = this.uv.columnAttributes[i]
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

        private rowIsSelected(id: number) {
            return this.selectedRows.indexOf(id) !== -1
        }

        get columnIndexes() {
            const columns = this.columns.map((column, index) => ({ index, fixed: column.fixed, visible: column.visible })).filter(c => c.visible)
            const fixed = columns.filter(c => c.fixed)
            const nonFixed = columns.filter(c => !c.fixed)
            return fixed.concat(nonFixed).map(c => c.index)
        }

        get fixedColumnIndexes() {
            return seq(this.columns).map((c, index) => ({ index, fixed: c.fixed })).filter(c => c.fixed).map(c => c.index).toArray()
        }

        get fixedRowColumnIndexes() {
            return seq(this.columns).map((c, index) => ({ index, fixed: c.mobileFixed })).filter(c => c.fixed).map(c => c.index).toArray()
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

        private closeFormControl() {
            if (this.oldCell !== null) {
                this.oldCell.isEditing = null
                this.oldCell.selected = false
            }
        }

        get isActiveEdit() {
            return this.oldCell !== null && this.oldCell.isEditing !== null
        }

        private setCellEditing(cell: ICell, isEditing: boolean) {
            if ((cell.isEditing !== null) !== isEditing) {
                if (cell.isEditing !== null) {
                    this.removeAutoSaveLock(cell.isEditing)
                    cell.isEditing = null
                } else {
                    this.addAutoSaveLock().then(id => {
                        if (cell.isEditing !== null) {
                            // The lock is already taken; release this one
                            this.removeAutoSaveLock(id)
                        } else {
                            cell.isEditing = id
                        }
                    })
                }
            }
        }

        private cellClick(cell: ICell, row: IRow) {
            if (this.oldRow !== null && row !== this.oldRow && this.oldRow.added && this.isEmptyRow(this.oldRow)) {
                if (this.uv.info.mainEntity === null) {
                    throw new Error("View doesn't have a main entity")
                }

                const entity = this.uv.info.mainEntity

                this.resetAddedEntry({
                    schema: entity.schema,
                    entity: entity.name,
                    newId: this.oldRow.id,
                })
            }

            if (this.clickTimeoutId === null) {
                this.clickTimeoutId = setTimeout(() => {
                    this.clickTimeoutId = null
                }, doubleClickTime)

                if (this.oldCell !== null && this.oldCell !== cell) {
                    this.oldCell.selected = false
                    this.setCellEditing(this.oldCell, false)
                }
                this.oldCell = cell
                this.oldRow = row
                cell.selected = true
            } else {
                clearTimeout(this.clickTimeoutId)
                this.clickTimeoutId = null

                if (cell === this.oldCell) {
                    if (cell.update !== null && cell.update.field !== null) {
                        this.setCellEditing(cell, cell.isEditing === null)
                    }
                } else {
                    if (this.oldCell !== null) {
                        this.oldCell.selected = false
                        this.setCellEditing(this.oldCell, false)
                    }
                    this.oldCell = cell
                    this.oldRow = row
                    cell.selected = true
                }
            }
        }

        private isEmptyRow(row: IRow) {
            return row.cells.every(cell => cell.value === undefined || cell.valueText === "" || cell.update === null || cell.update.field === null)
        }

        /*
        Negative ids for added
        Positive ids for entries

        selectedRows has keep a value of (-1 - newRow.id)
        When we delete new records, we use -1 - the value of selectedRows

        This makes it easy to store all entries in the selectedRows and use shift key
        */

        private selectRow(rowI: number, event: MouseEvent) {
            const setsSelected = new Set(this.selectedRows)

            if (this.lastSelected !== null && this.lastSelected !== rowI && event.shiftKey) {
                // Select all rows between current one and the previous selected one.
                const lastEl = this.lastSelected < 0 ? this.lastSelected : this.shownRows[this.lastSelected]
                const func = setsSelected.has(lastEl) ? setsSelected.add.bind(setsSelected) : setsSelected.delete.bind(setsSelected)

                if (this.lastSelected < rowI) {
                    for (let i = this.lastSelected; i <= rowI; i++) {
                        i < 0 ? func(i) : func(this.shownRows[i])
                    }
                } else if (this.lastSelected > rowI) {
                    for (let i = rowI; i <= this.lastSelected; i++) {
                        i < 0 ? func(i) : func(this.shownRows[i])
                    }
                }
            } else {
                const el = rowI < 0 ? rowI : this.shownRows[rowI]

                if (!setsSelected.has(el)) {
                    setsSelected.add(el)
                } else {
                    setsSelected.delete(el)
                }
                this.lastSelected = rowI
            }
            this.selectedRows = Array.from(setsSelected)

            const offset = (this.newEntries[0] !== undefined && this.newEntries[0].id === -1) ? 1 : 0
            this.selectedAll = (this.selectedRows.length === this.entries.length + this.newEntries.length - offset) ? true : false
            this.updateStatusLine()
            return false
        }

        private selectAllRows() {
            if (!this.selectedAll) {
                const tmpSelected = new Set(this.entries.map((row, rowI) => rowI).concat(this.newEntries.map(row => -1 - row.id)))
                this.selectedRows = Array.from(tmpSelected)
            } else {
                this.selectedRows = []
            }
            this.selectedAll = !this.selectedAll
            this.updateStatusLine()
        }

        /* To optimize performance when staging entries change, we first pre-build entries and then update them selectively watching staging entries.
           This is to avoid rebuilding complete rows array each time user changes a field.
        */
        @Watch("uv", { deep: true })
        private updateEntries() {
            this.buildEntries()
        }

        @Watch("entriesMap", { deep: true })
        private setSummaries() {
            this.applyChanges()
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

        private newEmptyRow(rowId: number, position?: number): IRow {
            if (this.uv.info.mainEntity === null) {
                throw new Error("Main entity cannot be null")
            }
            const entity = this.uv.info.mainEntity
            const newCells = this.uv.info.columns.map((info, colI) => {
                const columnAttrs = this.uv.columnAttributes[colI]
                const viewAttrs = this.uv.attributes
                const getColumnAttr = (name: string) => tryDicts(name, columnAttrs, viewAttrs)
                let value: any
                let valueText: string
                let valueLowerText: string
                const style: Record<string, any> = {}
                if (info.mainField !== null) {
                    let rawValue: any
                    if (info.mainField.name in this.defaultValues) {
                        rawValue = this.defaultValues[info.mainField.name]
                    } else {
                        rawValue = getColumnAttr("DefaultValue")
                    }
                    const defaultValue = convertValue(info.mainField.field, rawValue)
                    value = defaultValue !== undefined ? defaultValue : info.mainField.field.defaultValue
                    valueText = printValue(info.valueType, value)
                    valueLowerText = valueText.toLowerCase()
                } else {
                    value = undefined
                    valueText = ""
                    valueLowerText = ""
                }
                return {
                    value, valueText, valueLowerText,
                    link: null,
                    style,
                    update: info.mainField === null ? null : {
                        field: info.mainField.field,
                        fieldRef: {
                            entity,
                            name: info.mainField.name,
                        },
                        id: rowId,
                    },
                    attrs: {},
                    isEditing: null,
                    selected: false,
                    isInvalid: false,
                    isAwaited: info.mainField !== null && !info.mainField.field.isNullable && value === undefined,
                }
            })
            const row = {
                cells: newCells,
                id: rowId,
                deleted: false,
                style: {},
                linkForRow: null,
                attrs: {},
                added: true,
            }
            if (position === undefined) {
                this.newEntries.push(row)
            } else {
                this.newEntries.splice(position, 0, row)
            }
            return row
        }

        private removeSelectedRows() {
            const entity = this.uv.info.mainEntity
            if (entity === null || this.uv.rows === null) {
                throw new Error("View doesn't have a main entity")
            }

            for (const rowI of this.selectedRows) {
                if (rowI < 0) {
                    this.resetAddedEntry({
                        schema: entity.schema,
                        entity: entity.name,
                        newId: -1 - rowI,
                    })
                } else {
                    const row = this.uv.rows[rowI]
                    if (row.entityIds === undefined) {
                        throw new Error("View doesn't have a main entity")
                    }
                    this.deleteEntry({
                        schema: entity.schema,
                        entity: entity.name,
                        // Guaranteed to exist if mainEntity exists
                        id: row.mainId as number,
                    })
                }
            }
        }

        private getUpdatedValueText(field: IColumnField | null, updValue: IUpdatedCell) {
            if (field !== null && updValue.value !== undefined && field.fieldType.type === "reference") {
                const ref = field.fieldType.entity
                const schemaMap = this.entriesMap[ref.schema]
                if (schemaMap !== undefined) {
                    const refEntries = schemaMap[ref.name]
                    if (refEntries !== undefined && !(refEntries instanceof Promise)) {
                        return refEntries[updValue.value]
                    }
                }
            }
            return (updValue.rawValue === undefined) ? "" : String(updValue.rawValue)
        }

        // Apply changes on top of built entries.
        // TODO: make this even more granular, ideally: dynamically bind a watcher to every changed and added entry.
        private applyChanges() {
            if (this.uv.info.mainEntity !== null) {
                const entity = this.uv.info.mainEntity
                const changedRows = this.changes.changesForEntity(entity.schema, entity.name)
                const offset = this.showEmptyRow ? 1 : 0

                changedRows.added.forEach((newRow, newRowI) => {
                    let newItem = this.newEntries[newRowI + offset]
                    let row: IRow

                    while (newItem !== undefined) {
                        if (newItem.id === null) {
                            throw Error("impossible")
                        } else if (newItem.id > newRow.id) {
                            this.newEntries.splice(newRowI + offset, 1)
                            newItem = this.newEntries[newRowI + offset]
                        } else {
                            break
                        }
                    }

                    if (newItem === undefined) {
                        row = this.newEmptyRow(newRow.id)
                    } else if (newItem.id < newRow.id) {
                        row = this.newEmptyRow(newRow.id, newRowI + offset)
                    } else if (newItem.id === newRow.id) {
                        row = newItem
                    } else {
                        this.newEntries.splice(newRowI + offset, 1)
                        return
                    }

                    this.uv.info.columns.forEach((info, colI) => {
                        if (info.mainField !== null) {
                            const cell = row.cells[colI]
                            const value = newRow.cells[info.mainField.name]
                            if (value === undefined) {
                                cell.value = undefined
                                cell.valueText = ""
                                cell.valueLowerText = ""
                            } else {
                                cell.value = value.value
                                cell.valueText = this.getUpdatedValueText(info.mainField.field, value)
                                cell.valueLowerText = cell.valueText.toLowerCase()
                                cell.isInvalid = value.erroredOnce
                                cell.isAwaited = !info.mainField.field.isNullable && cell.value === undefined
                            }
                        }
                    })
                })
                this.newEntries.splice(offset + changedRows.added.length) // remove other elements
            }

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
                                const row = rows[rowI]
                                Object.entries(fields).forEach(([fieldName, updValue]) => {
                                    const colIs = mapping.fieldsToColumns[fieldName]
                                    if (colIs === undefined) {
                                        return
                                    }
                                    colIs.forEach(colI => {
                                        const cell = entry.cells[colI]
                                        const value = row.values[colI]
                                        const getCellAttr = (name: string) => tryDicts(name, cell.attrs, entry.attrs, this.uv.columnAttributes[colI], this.uv.attributes)

                                        if (updValue === null) {
                                            const columnInfo = this.uv.info.columns[colI]
                                            // Restore old values
                                            cell.value = value.value
                                            cell.valueText = printValue(columnInfo.valueType, value)
                                            cell.valueLowerText = cell.valueText.toLowerCase()
                                            cell.isInvalid = false
                                            cell.link = attrToQueryRef(cell.update, cell.value, this.homeSchema, getCellAttr("LinkedView"))
                                        } else {
                                            cell.value = updValue.value
                                            const field = (updValue.value !== undefined && value.update !== undefined) ? value.update.field : null
                                            cell.valueText = this.getUpdatedValueText(field, updValue)
                                            cell.valueLowerText = cell.valueText.toLowerCase()
                                            cell.isInvalid = updValue.erroredOnce
                                            cell.link = attrToQueryRef(cell.update, cell.value, this.homeSchema, getCellAttr("LinkedView"))
                                        }
                                    })
                                })
                            })
                        })
                    })
                })
            }
            this.selectedRows = []
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
                { name: this.$tc("remove_selected_rows"), callback: () => this.removeSelectedRows() },
                { name: this.$tc("show_new_row"), callback: () => this.changeShowEmptyRow() },
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

    /*
        first sort
        bool:   descending
        number: descending
        string: ascending
    */
        private updateSort(sortColumn: number) {
            if (this.sortColumn !== sortColumn) {
                const type = this.columns[sortColumn].columnInfo.valueType.type
                this.sortColumn = sortColumn

                switch (type) {
                    case "int":
                        this.sortOptions = {numeric: true}
                        this.sortAsc = false
                        break
                    case "bool":
                        this.sortAsc = false
                        this.sortOptions = {}
                        break
                    case "string":
                        this.sortAsc = true
                        this.sortOptions = {sensitivity: "accent"}
                        break
                    default:
                        this.sortAsc = true
                        this.sortOptions = {}
                }
            } else {
                this.sortAsc = !this.sortAsc
            }

            this.sortRows(this.sortOptions)
            this.lastSelected = null
        }

        private sortRows(options?: Intl.CollatorOptions) {
            if (this.sortColumn !== null) {
                const sortColumn = this.sortColumn
                const entries = this.entries
                const collator = new Intl.Collator(["en", "ru"], options)
                const sortFunction: (a: number, b: number) => number =
                    this.sortAsc ?
                        (a, b) => rowIndicesCompare(a, b, entries, sortColumn, collator) :
                        (a, b) => rowIndicesCompare(b, a, entries, sortColumn, collator)
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
            this.newEntries = []
            if (this.showEmptyRow) {
                this.newEmptyRow(-1, 0)
            }
            if (this.uv.rows === null) {
                this.entries = []
            } else {
                const viewAttrs = this.uv.attributes

                this.entries = this.uv.rows.map((row, rowI) => {
                    const rowAttrs = row.attributes === undefined ? {} : row.attributes
                    const getRowAttr = (name: string) => tryDicts(name, rowAttrs, viewAttrs)

                    let linkForRow: IQuery | null = null

                    const rowStyle: Record<string, any> = {}
                    const rowHeight = Number(getRowAttr("RowHeight"))
                    if (!Number.isNaN(rowHeight)) {
                        rowStyle["white-space"] = "nowrap"
                    }

                    const cells = row.values.map((cellValue, colI): ICell => {
                        const columnInfo = this.uv.info.columns[colI]
                        const columnAttrs = this.uv.columnAttributes[colI]
                        const cellAttrs = cellValue.attributes === undefined ? {} : cellValue.attributes

                        const getCellAttr = (name: string) => tryDicts(name, cellAttrs, rowAttrs, columnAttrs, viewAttrs)

                        const value = cellValue.value
                        const valueText = getValueText(columnInfo.valueType, cellValue)

                        const link = attrToQueryRef(cellValue.update, value, this.homeSchema, getCellAttr("LinkedView"))
                        // Row links use current cell id by default, hence Self instead of Ref.
                        const currLinkForRow = attrToQuerySelf(cellValue.update, this.homeSchema, getCellAttr("RowLinkedView"))
                        if (currLinkForRow !== null) {
                            linkForRow = currLinkForRow
                        }

                        const style: Record<string, any> = {}

                        const cellColor = getCellAttr("CellColor")
                        if (cellColor !== undefined) {
                            style["background-color"] = String(cellColor)
                        }
                        if (!Number.isNaN(rowHeight)) {
                            style["height"] = `${rowHeight}px`
                        }

                        return {
                            value, valueText, link, style,
                            valueLowerText: valueText.toLowerCase(),
                            isEditing: null,
                            attrs: cellAttrs,
                            update: cellValue.update === undefined ? null : cellValue.update,
                            selected: false,
                            isInvalid: false,
                            isAwaited: false,
                        }
                    })

                    return {
                        id: rowI,
                        cells,
                        deleted: false,
                        style: rowStyle,
                        linkForRow,
                        attrs: rowAttrs,
                        added: false,
                    }
                })
            }

            if (this.entries.length === 0) {
                this.changeShowEmptyRow(true)
            }

            this.requestSummaries()
            this.buildRows()
            this.applyChanges()
            this.fixColumns()
        }

        private requestSummaries() {
            Object.entries(this.uv.info.domains).forEach(([name, domain]) => Object.entries(domain).forEach(([field, info]) => {
                if (info.field !== null && info.field.fieldType.type === "reference") {
                    const ref = info.field.fieldType.entity
                    this.getEntries({
                        schemaName: ref.schema,
                        entityName: ref.name,
                    })
                }
            }))
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
            const selected = (this.selectedRows.length > 0) ? `${this.selectedRows.length}/` : ""
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
                for (const row of this.newEntries) {
                    row.cells[fixedColumnIndex].style["left"] = leftStr
                }
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
            return tableWidth > screen.width && this.fixedRowColumnIndexes.length > 0
        }

        get homeSchema() {
            return homeSchema(this.uv.args)
        }

        get currentIdAdded() {
            const entity = this.uv.info.mainEntity as IEntityRef
            const changedFields = this.changes.changesForEntity(entity.schema, entity.name)
            return changedFields.idAdded
        }

        private beforeAddEntry(row: IRow) {
            // Check if an entry is already added; if it isn't, create it with our default values.
            const entity = this.uv.info.mainEntity as IEntityRef
            const changedFields = this.changes.changesForEntity(entity.schema, entity.name)

            if (row.id === -1) {
                this.addEntry({ schema: entity.schema, entity: entity.name, position: 0 }) // add new entry
                changeRowId(row, this.currentIdAdded) // change old id to current addedId
                row.cells.forEach((cell, i) => {
                    const info = this.columns[i]
                    if (info.columnInfo.mainField !== null && cell.valueText !== "") {
                        this.setAddedField({
                            schema: entity.schema,
                            entity: entity.name,
                            field: info.columnInfo.mainField.name,
                            newId: row.id,
                            value: cell.valueText,
                        })
                    }
                })
                this.newEmptyRow(-1, 0)
            } else {
                if (process.env["NODE_ENV"] !== "production") {
                    const hasId = changedFields.added.some(item => item !== null && item.id === row.id)
                    if (!hasId) {
                        throw Error("impossible")
                    }
                }
            }
        }
    }
</script>

<style scoped>
    .table-block {
        width: 100%;
        margin: 0px;
        position: relative;
        height: 100%;
    }
    .checkbox-col, .open-form-col{
        width: 20px;
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
        z-index: 500;
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
        z-index: 25;
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

    /* FIXME: Этот блок ломал мобильную версию:
       https://trello.com/c/3B1qPM1V/771-%D0%BD%D0%B0-%D1%82%D0%B5%D0%BB%D0%B5%D1%84%D0%BE%D0%BD%D0%B5-%D1%82%D0%B0%D0%B1%D0%BB%D0%B8%D1%86%D0%B0-%D0%B2%D1%8B%D1%80%D0%B0%D0%B2%D0%BD%D0%B8%D0%B2%D0%B0%D0%B5%D1%82%D1%81%D1%8F-%D0%BF%D0%BE-%D0%BA%D1%80%D0%B0%D0%B9%D0%BD%D0%B5%D0%BC%D1%83-%D0%BF%D1%80%D0%B0%D0%B2%D0%BE%D0%BC%D1%83-%D1%81%D1%82%D0%BE%D0%BB%D0%B1%D1%86%D1%83
    */
    /*@media screen and (max-aspect-ratio: 13/9) {
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
    }*/

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
            z-index: 100000;
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
</style>

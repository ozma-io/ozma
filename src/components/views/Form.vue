<i18n>
    {
        "en": {
            "item_not_found": "Record not found",
            "delete": "Delete",
            "delete_confirmation": "Are you sure want to delete this record?",
            "ok": "OK",
            "cancel": "Cancel",
            "no_value": "(No value)",
            "select_value": "(Select value)",
            "yes": "Yes",
            "no": "No"
        },
        "ru": {
            "item_not_found": "Запись не найдена",
            "delete": "Удалить",
            "delete_confirmation": "Вы действительно хотите удалить эту запись?",
            "ok": "ОК",
            "cancel": "Отмена",
            "no_value": "(Пусто)",
            "yes": "Да",
            "no": "Нет"
        }
    }
</i18n>

<template>
    <div fluid class="view-form">
        <div v-if="shownEntries.length === 0">
          {{ $t('item_not_found') }}
        </div>
        <div v-else v-for="(entry, entryI) in shownEntries" :key="entry.index">
            <form class="form-entry">
                <div v-for="(block, blockI) in blocks" :key="blockI" class="form-block" :style="{ width: `${block.width * 100}%` }">
                    <template v-for="fieldInfo in block.fields" class="form_data">
                        <div class="form-data" v-if="fieldInfo.visible" :key="fieldInfo.column.name" :label-for="fieldInfo.column.name">
                            <FormControl
                                :caption="fieldInfo.caption"
                                v-bind="entry.fields[fieldInfo.index]"
                                :update="entry.fields[fieldInfo.index].update"
                                :type="fieldInfo.column.valueType"
                                :locked="locked"
                                :isInvalid="entry.fields[fieldInfo.index].isInvalid"
                                :uv="uv"
                                @update="beforeUpdateEntry(entry)"
                                :added="entry.added" />
                        </div>
                    </template>
                </div>

                <!-- FIXME FIXME FIXME look at permissions! -->
                <div class="delete-block">
                <input  type="button"
                        :value="$t('delete')"
                        class="delete-block_delete-button"
                        v-if="entry.id !== null && entry.id !== undefined && uv.info.mainEntity !== null"
                        v-b-modal="`deleteConfirm_${entryI}`">
                </div>
                <b-modal lazy
                         :id="`deleteConfirm_${entryI}`"
                         ok-variant="danger"
                         :ok-title="$t('ok')"
                         @ok="deleteRecord(entry.added, entry.id)"
                         :cancel-title="$t('cancel')">
                    {{ $t('delete_confirmation') }}
                </b-modal>
            </form>
        </div>
    </div>
</template>

<script lang="ts">
    import { Component, Prop, Watch, Vue } from "vue-property-decorator"
    import { namespace } from "vuex-class"
    import { tryDicts } from "@/utils"
    import { AttributesMap, IMainFieldInfo, IColumnField, IExecutedRow, RowId, FieldType, FieldName, IResultColumnInfo, IExecutedValue, IEntityRef } from "@/api"
    import { SchemaName, EntityName } from "@/api"
    import { IUpdatableField, IUserViewArguments, UserViewResult, EntriesMap, CurrentUserViews, IProcessedRow, printValue, homeSchema } from "@/state/user_view"
    import { CurrentChanges, IEntityChanges, IUpdatedCell, convertValue } from "@/state/staging_changes"
    import { CurrentAuth } from "@/state/auth"
    import { IAction } from "@/components/ActionsMenu.vue"
    import FormControl from "@/components/views/form/FormControl.vue"

    interface IFieldInfo {
        index: number
        column: IResultColumnInfo
        caption: string
        visible: boolean
    }

    interface IBlockInfo {
        width: number
        fields: IFieldInfo[]
    }

    interface IField {
        value: any
        valueText: string
        attributes: AttributesMap
        update: IUpdatableField | null
        isInvalid: boolean
    }

    interface IForm {
        deleted: boolean
        added: boolean
        id: number | null
        fields: IField[]
    }

    const staging = namespace("staging")
    const auth = namespace("auth")

    @Component
    export default class UserViewForm extends Vue {
        @staging.State("current") changes!: CurrentChanges
        @staging.State("currentSubmit") currentSubmit!: Promise<void> | null
        @staging.Action("addEntry") addEntry!: (args: { schema: SchemaName, entity: EntityName, position?: number }) => Promise<void>
        @staging.Action("setAddedField") setAddedField!: (args: { schema: SchemaName, entity: EntityName, newId: number, field: FieldName, value: any }) => Promise<void>
        @staging.Action("resetAddedEntry") resetAddedEntry!: (args: { schema: string, entity: string, newId: number }) => Promise<void>
        @staging.Action("deleteEntry") deleteEntry!: (args: { schema: string, entity: string, id: number }) => Promise<void>
        @staging.Action("submit") submitChanges!: () => Promise<void>

        @Prop({ type: UserViewResult }) uv!: UserViewResult
        @Prop({ type: Boolean, default: false }) isRoot!: boolean
        @Prop({ type: Object, default: () => ({}) }) defaultValues!: Record<string, any>

        // Internal arrays are fields in columns order
        private entries: IForm[] = []
        private newEntries: IForm[] = []
        // Used for returning back if "Delete" is used
        private deletedOne: boolean = false

        get locked() {
            return this.uv.rows === null && this.currentSubmit !== null
        }

        get fields() {
            const viewAttrs = this.uv.attributes
            return this.uv.info.columns.map((columnInfo, i) => {
                const columnAttrs = this.uv.columnAttributes[i]
                const getColumnAttr = (name: string) => tryDicts(name, columnAttrs, viewAttrs)

                const captionAttr = getColumnAttr("Caption")
                const caption = captionAttr !== undefined ? String(captionAttr) : columnInfo.name

                const visibleColumnAttr = getColumnAttr("Visible")
                const visible = visibleColumnAttr === undefined ? true : Boolean(visibleColumnAttr)

                return {
                    index: i,
                    column: columnInfo,
                    caption,
                    visible,
                }
            })
        }

        get blocks() {
            const viewAttrs = this.uv.attributes
            // Relative block widths. [0..1]. Each block contains zero or more inputs.
            const blockWidths: number[] = viewAttrs["FormBlockWidths"] || [1]
            const blocks: IBlockInfo[] = blockWidths.map(width => ({ width: width * 0.95, fields: [] }))

            this.uv.info.columns.forEach((columnInfo, i) => {
                const columnAttrs = this.uv.columnAttributes[i]
                const getColumnAttr = (name: string) => tryDicts(name, columnAttrs, viewAttrs)
                const field = this.fields[i]

                const blockAttr = Number(getColumnAttr("FormBlock"))
                const blockNumber = Number.isNaN(blockAttr) ? 0 : blockAttr
                const block = Math.max(0, Math.min(blockNumber, blocks.length - 1))

                blocks[block].fields.push(field)
            })

            return blocks
        }

        private deleteRecord(added: boolean, id: number) {
            if (this.uv.info.mainEntity === null) {
                throw new Error("View doesn't have a main entity")
            }
            const entity = this.uv.info.mainEntity

            if (added) {
                this.resetAddedEntry({
                    schema: entity.schema,
                    entity: entity.name,
                    newId: id,
                })
            } else {
                this.deleteEntry({
                    schema: entity.schema,
                    entity: entity.name,
                    id,
                })
            }

            this.deletedOne = true
        }

        @Watch("uv", { deep: true })
        private updateEntries() {
            this.buildEntries()
        }

        // See Table for description of why is this meddling with Watch is needed.
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

        private newEmptyRow(rowId: number, position?: number): IForm {
            if (this.uv.info.mainEntity === null) {
                throw new Error("Main entity cannot be null")
            }
            const entity = this.uv.info.mainEntity
            const newFields = this.uv.info.columns.map((info, colI) => {
                const columnAttrs = this.uv.columnAttributes[colI]
                const viewAttrs = this.uv.attributes
                const getColumnAttr = (name: string) => tryDicts(name, columnAttrs, viewAttrs)
                let value: any
                let valueText: string
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
                } else {
                    value = undefined
                    valueText = ""
                }
                return {
                    value, valueText,
                    attributes: Object.assign({}, this.uv.attributes, this.uv.columnAttributes[colI]),
                    update: info.mainField === null ? null : {
                        field: info.mainField.field,
                        fieldRef: {
                            entity,
                            name: info.mainField.name,
                        },
                        id: rowId,
                    },
                    isInvalid: false,
                }
            })
            const form = {
                deleted: false,
                added: true,
                fields: newFields,
                id: rowId,
            }
            if (position === undefined) {
                this.newEntries.push(form)
            } else {
                this.newEntries.splice(position, 0, form)
            }
            return form
        }

        // Apply changes on top of built entries.
        // TODO: make this even more granular, ideally: dynamically bind a watcher to every changed and added entry.
        private applyChanges() {
            if (this.uv.info.mainEntity !== null) {
                const entity = this.uv.info.mainEntity
                const changedFields = this.changes.changesForEntity(entity.schema, entity.name)

                changedFields.added.forEach((fields, newRowI) => {
                    let form: IForm
                    let newItem = this.newEntries[newRowI]

                    while (newItem !== undefined) {
                        if (newItem.id === null) {
                            throw Error("impossible")
                        } else if (newItem.id > fields.id) {
                            this.newEntries.splice(newRowI, 1)
                            newItem = this.newEntries[newRowI]
                        } else {
                            break
                        }
                    }
                    if (newItem === undefined) {
                        form = this.newEmptyRow(fields.id)
                    } else if (newItem.id === null) {
                        throw Error("impossible")
                    } else if (newItem.id < fields.id) {
                        form = this.newEmptyRow(fields.id, newRowI)
                    } else if (newItem.id === fields.id) {
                        form = newItem
                    } else {
                        throw Error("impossible")
                    }

                    this.uv.info.columns.forEach((info, colI) => {
                        if (info.mainField !== null) {
                            const cell = form.fields[colI]
                            const value = fields.cells[info.mainField.name]
                            if (value === undefined) {
                                cell.value = undefined
                                cell.valueText = ""
                                cell.isInvalid = false
                            } else {
                                cell.value = value.value
                                cell.valueText = value.rawValue
                                cell.isInvalid = value.erroredOnce
                            }
                        }
                    })
                })

                this.newEntries.splice(changedFields.added.length)
                if (this.newEntries.length === 0 && this.uv.rows === null) {
                    this.newEmptyRow(0)
                }
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
                                if (fields === null) {
                                    // Reset to original values
                                    rows[rowI].values.forEach((value, colI) => {
                                        const columnInfo = this.uv.info.columns[colI]
                                        const cell = entry.fields[colI]

                                        cell.value = value.value
                                        cell.valueText = printValue(columnInfo.valueType, value)
                                        cell.isInvalid = false
                                    })
                                } else {
                                    Object.entries(fields).forEach(([fieldName, value]) => {
                                        const colIs = mapping.fieldsToColumns[fieldName]
                                        if (colIs === undefined) {
                                            return
                                        }
                                        colIs.forEach(colI => {
                                            const cell = entry.fields[colI]

                                            cell.value = value.value
                                            cell.valueText = value.rawValue
                                            cell.isInvalid = value.erroredOnce
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
                            size: portrait;
                        }
                    }
                `)
            }

            if (this.uv.rows === null) {
                // When entry is created successfully, return back.
                const currRoute = this.$route.fullPath
                this.$emit("update:onSubmitStaging", () => {
                    if (this.$route.fullPath === currRoute) {
                        this.$router.back()
                    }
                })
            }

            this.buildEntries()
        }

        private buildEntries() {
            const viewAttrs = this.uv.attributes

            // Build one form from a result row
            const makeForm = (row: IProcessedRow, rowI: number): IForm => {
                const rowAttrs = row.attributes === undefined ? {} : row.attributes
                const getRowAttr = (name: string) => rowAttrs[name] || viewAttrs[name]
                const fields = this.uv.info.columns.map((columnInfo, i): IField => {
                    const cellValue = row.values[i]
                    const columnAttrs = this.uv.columnAttributes[i]
                    const cellAttrs = cellValue.attributes === undefined ? {} : cellValue.attributes
                    const getCellAttr = (name: string) => tryDicts(name, cellAttrs, rowAttrs, columnAttrs, viewAttrs)

                    const value = cellValue.value
                    const valueText = printValue(columnInfo.valueType, value)

                    const attributes = Object.assign({}, cellAttrs, columnAttrs, rowAttrs, viewAttrs)

                    return {
                        value,
                        valueText,
                        attributes,
                        update: cellValue.update === undefined ? null : cellValue.update,
                        isInvalid: false,
                    }
                })

                const id = this.uv.info.mainEntity !== null ? row.mainId as number : null

                return {
                    deleted: false,
                    added: false,
                    id,
                    fields,
                }
            }

            this.newEntries = []
            if (this.uv.rows !== null) {
                this.entries = this.uv.rows.map((row, rowI) => makeForm(row, rowI))
            }
            this.applyChanges()
        }

        get shownEntries() {
            return this.entries.filter(entry => !entry.deleted).concat(this.newEntries.filter(entry => !entry.deleted))
        }

        @Watch("shownEntries")
        private returnIfEmpty() {
            if (this.isRoot && this.deletedOne && this.shownEntries.length === 0) {
                this.$router.back()
            }
        }

        private beforeUpdateEntry(form: IForm) {
            if (form.added) {
                // Check if an entry is already added; if it isn't, create it with our default values.
                const entity = this.uv.info.mainEntity as IEntityRef
                const changedFields = this.changes.changesForEntity(entity.schema, entity.name)
                const id = form.id as number

                if (id === changedFields.added.length) { // FIXME -- dont use length! use id in added
                    this.addEntry({ schema: entity.schema, entity: entity.name })
                    form.fields.forEach((field, i) => {
                        const info = this.fields[i]
                        if (info.column.mainField !== null && field.valueText !== "") {
                            this.setAddedField({
                                schema: entity.schema,
                                entity: entity.name,
                                field: info.column.mainField.name,
                                newId: id,
                                value: field.valueText,
                            })
                        }
                    })
                } else {
                    if (process.env["NODE_ENV"] !== "production") {
                        const hasId = changedFields.added.some(item => item !== null && item.id === id)
                        if (!hasId) {
                            throw Error("impossible")
                        }
                    }
                }
            }
        }
    }
</script>

<style scoped>
    .view-form {
        padding: 0px !important;
        overflow-y: auto;
        overflow-x: hidden;
        height: 100%;
        width: 100vw;
    }
    .form-entry {
        border-bottom: 0;
        border-top: 0;

    }
    .form-block{
        display:inline-block;
        vertical-align: top;
        margin: 0 1px;
    }
    .form-data {
        margin-top: 7px;
        color: var(--NavigationTextColor);
    }
    .delete-block{
        background: var(--MenuColor);
        width: max-content;
    }
    .delete-block_delete-button {
        background: hsla(0,0%,100%,.3) !important;
        padding: 0px;
        padding-left: 7px;
        padding-right: 7px;
        line-height: normal;
        height: calc(1.5em + 4px);
        border: 0px;
        box-shadow: none;
        outline: none;
        color: var(--ButtonTextColor);
        border-radius: 0;
    }
    @media screen and (max-aspect-ratio: 13/9) {
        @media screen and (max-device-width: 480px) {
            .view-form {
                overflow: auto !important;
            }
            .form-block {
                width: 100% !important;
                display: block;
            }
            .delete-block {
                position: sticky;
                left: 0;
                margin-top: 10px;
            }
            .form-entry{
                display: grid;
            }
        }
    }
    @media screen and (orientation: portrait) {
        @media screen and (max-device-width: 480px) {
            .form-entry {
                width: max-content;
            }
            .form-data {
                margin-top: 0 !important;
            }
            .form-block {
                display: grid;
            }
        }
    }
        @media print {
        .delete-block_delete-button {
            display: none !important;
        }
    }
</style>
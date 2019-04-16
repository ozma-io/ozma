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
    <b-container fluid class="cont_form without_padding">
        <div v-for="entry in shownEntries" :key="entry.index" class="form_entry">
            <b-form class="view_form">
                <div v-for="(block, blockI) in blocks" :key="blockI" class="form_block" :style="{ width: `${block.width * 100}%` }">
                    <template v-for="fieldInfo in block.fields" class="form_data">
                        <b-form-group :key="fieldInfo.column.name" :label-for="fieldInfo.column.name">
                            {{ fieldInfo.caption }}

                            <FormControl
                                v-bind="entry.fields[fieldInfo.index]"
                                :update="entry.fields[fieldInfo.index].update"
                                :type="fieldInfo.column.valueType"
                                :locked="locked"
                                :added="entry.added" />
                        </b-form-group>
                    </template>
                </div>

                <!-- FIXME FIXME FIXME look at permissions! -->
                <b-button class="delete_btn" v-if="entry.id !== undefined && uv.info.mainEntity !== null" variant="danger" v-b-modal="`deleteConfirm_${entry.id}`">{{ $t('delete') }}</b-button>
                <b-modal lazy :id="`deleteConfirm_${entry.id}`" ok-variant="danger" :ok-title="$t('ok')" @ok="deleteRecord(entry.added, entry.id)" :cancel-title="$t('cancel')">
                    {{ $t('delete_confirmation') }}
                </b-modal>
            </b-form>
        </div>
    </b-container>
</template>

<script lang="ts">
    import { Component, Prop, Watch, Vue } from "vue-property-decorator"
    import { namespace } from "vuex-class"
    import { AttributesMap, IMainFieldInfo, IColumnField, IExecutedRow, RowId, FieldType, FieldName, IResultColumnInfo, IExecutedValue } from "@/api"
    import * as Api from "@/api"
    import { IUpdatableField, IUserViewArguments, UserViewResult, EntriesMap, CurrentUserViews, printValue, IProcessedRow } from "@/state/user_view"
    import { CurrentChanges, IEntityChanges, IUpdatedCell, convertValue } from "@/state/staging_changes"
    import { CurrentAuth } from "@/state/auth"
    import { IAction } from "@/components/ActionsMenu.vue"
    import FormControl from "@/components/views/form/FormControl.vue"

    interface IFieldInfo {
        index: number
        column: IResultColumnInfo
        caption: string
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
    }

    interface IForm {
        deleted: boolean
        added: boolean
        id: number | null
        fields: IField[]
    }

    const staging = namespace("staging")
    const translations = namespace("translations")
    const auth = namespace("auth")

    @Component
    export default class UserViewForm extends Vue {
        @staging.State("current") changes!: CurrentChanges
        @staging.State("currentSubmit") currentSubmit!: Promise<void> | null
        @staging.Action("addEntry") addEntry!: (args: { schema: string, entity: string, newId: number }) => void
        @staging.Action("resetAddedEntry") resetAddedEntry!: (args: { schema: string, entity: string, newId: number }) => void
        @staging.Action("deleteEntry") deleteEntry!: (args: { schema: string, entity: string, id: number }) => void
        @staging.Action("submit") submitChanges!: () => Promise<void>
        @translations.Getter("field") fieldTranslation!: (schema: string, entity: string, field: string, defValue: string) => string

        @Prop({ type: UserViewResult }) uv!: UserViewResult
        @Prop({ type: Boolean, default: false }) isRoot!: boolean

        // Internal arrays are fields in columns order
        private entries: IForm[] = []
        private newEntries: IForm[] = []

        get locked() {
            return this.uv.rows === null && this.currentSubmit !== null
        }

        get blocks() {
            const viewAttrs = this.uv.attributes
            // Relative block widths. [0..1]. Each block contains zero or more inputs.
            const blockWidths: number[] = viewAttrs["FormBlockWidths"] || [1]
            const blocks: IBlockInfo[] = blockWidths.map(width => ({ width, fields: [] }))

            this.uv.info.columns.forEach((columnInfo, i) => {
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

                const blockAttr = Number(getColumnAttr("FormBlock"))
                const blockNumber = Number.isNaN(blockAttr) ? 0 : blockAttr
                const block = Math.max(0, Math.min(blockNumber, blocks.length - 1))

                const field = {
                    index: i,
                    column: columnInfo,
                    caption,
                }

                blocks[block].fields.push(field)
            })

            return blocks
        }

        private deleteRecord(added: boolean, id: number) {
            if (this.uv.info.mainEntity === null) {
                throw new Error("View doesn't have a main entity")
            }
            const entity = this.uv.info.mainEntity.entity

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

        private newEmptyRow(rowId: number): IForm {
            if (this.uv.info.mainEntity === null) {
                throw new Error("Main entity cannot be null")
            }
            const entity = this.uv.info.mainEntity.entity
            const newFields = this.uv.info.columns.map((info, colI) => {
                const columnAttrs = this.uv.columnAttributes[colI]
                const viewAttrs = this.uv.attributes
                const getColumnAttr = (name: string) => columnAttrs[name] || viewAttrs[name]
                let value: any
                let valueText: string
                if (info.mainField !== null) {
                    const defaultAttr = getColumnAttr("DefaultValue")
                    const defaultValue = convertValue(info.mainField.field.fieldType, defaultAttr)
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
                }
            })
            const form = {
                deleted: false,
                added: true,
                fields: newFields,
                id: rowId,
            }
            this.newEntries.push(form)
            return form
        }

        // Apply changes on top of built entries.
        // TODO: make this even more granular, ideally: dynamically bind a watcher to every changed and added entry.
        private applyChanges() {
            if (this.uv.info.mainEntity !== null) {
                const entity = this.uv.info.mainEntity.entity
                const changedFields = this.changes.changesForEntity(entity.schema, entity.name)

                changedFields.added.forEach((fields, newRowI) => {
                    let form: IForm
                    if (this.newEntries.length <= newRowI) {
                        form = this.newEmptyRow(newRowI)
                    } else {
                        form = this.newEntries[newRowI]
                    }

                    if (fields === null) {
                        form.deleted = true
                    } else {
                        form.deleted = false
                        this.uv.info.columns.forEach((info, colI) => {
                            if (info.mainField !== null) {
                                const cell = form.fields[colI]
                                const value = fields[info.mainField.name]
                                if (value === undefined) {
                                    cell.value = undefined
                                    cell.valueText = ""
                                } else {
                                    cell.value = value.value
                                    cell.valueText = value.rawValue
                                }
                            }
                        })
                    }
                })
                for (let i = changedFields.added.length; i < this.newEntries.length; i++) {
                    const row = this.newEntries[i]
                    this.uv.info.columns.forEach((info, colI) => {
                        const cell = row.fields[colI]
                        cell.value = undefined
                        cell.valueText = ""
                    })
                }
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
                                    rows[rowI].values.forEach((value, valueI) => {
                                        const columnInfo = this.uv.info.columns[valueI]
                                        const cell = entry.fields[valueI]
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
                                            const cell = entry.fields[colI]
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
                    const getColumnAttr = (name: string) => columnAttrs[name] || viewAttrs[name]
                    const cellAttrs = cellValue.attributes === undefined ? {} : cellValue.attributes
                    const getCellAttr = (name: string) => cellAttrs[name] || rowAttrs[name] || columnAttrs[name] || viewAttrs[name]

                    const value = cellValue.value
                    const valueText = printValue(columnInfo.valueType, value)

                    const attributes = Object.assign({}, cellAttrs, columnAttrs, rowAttrs, viewAttrs)
                    return {
                        value,
                        valueText,
                        attributes,
                        update: cellValue.update === undefined ? null : cellValue.update,
                    }
                })

                let id
                if (this.uv.info.mainEntity !== null) {
                    id = (row.entityIds as Record<string, number>)[this.uv.info.mainEntity.name]
                } else {
                    id = null
                }

                return {
                    deleted: false,
                    added: false,
                    id,
                    fields,
                }
            }

            if (this.uv.rows !== null) {
                this.entries = this.uv.rows.map((row, rowI) => makeForm(row, rowI))
            }
            this.applyChanges()
        }

        private returnBack() {
            if (this.isRoot) {
                this.$router.back()
            }
        }

        get shownEntries() {
            return this.entries.filter(entry => !entry.deleted).concat(this.newEntries.filter(entry => !entry.deleted))
        }

        @Watch("shownEntries")
        private returnIfEmpty() {
            if (this.shownEntries.length === 0) {
                this.returnBack()
            }
        }
    }
</script>

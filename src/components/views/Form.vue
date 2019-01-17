<i18n>
    {
        "en-US": {
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
        "ru-RU": {
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
        <div v-for="entry in showedEntries" :key="entry.index" class="form_entry">
            <b-form class="view_form">
                <div v-for="(block, blockI) in entry.blocks" :key="blockI" class="form_block" :style="{ width: `${block.width * 100}%` }">
                    <template v-for="field in block.fields" class="form_data">
                        <b-form-group :key="field.column.name" :label-for="field.column.name">
                            {{ field.caption }}
            
                            <b-form-checkbox v-if="field.type.name === 'check'"
                                             :id="field.column.name"
                                             :value="field.value"
                                             @input="updateValue(entry.id, field, $event)"
                                             v-model="field.value"
                                             :disabled="field.column.updateField === null || locked" />
                            <b-form-textarea v-else-if="field.type.name === 'textarea'"
                                             :id="field.column.name"
                                             :value="field.value"
                                             @input="updateValue(entry.id, field, $event)"
                                             :disabled="field.column.updateField === null || locked"
                                             :rows="3"
                                             :max-rows="6"
                                             :required="field.type.required" />
                            <CodeEditor v-else-if="field.type.name === 'codeeditor'"
                                        :content="field.value"
                                        @update:content="updateValue(entry.id, field, $event)"
                                        :readOnly="field.column.updateField === null || locked" />
                            <b-form-select v-else-if="field.type.name === 'select'"
                                           :id="field.column.name"
                                           :value="field.value"
                                           @input="updateValue(entry.id, field, $event)"
                                           :disabled="field.column.updateField === null || locked"
                                           :options="field.type.options" />
                            <!-- We don't use bootstrap-vue's b-form-input type=text because of problems with Safari
                                 https://github.com/bootstrap-vue/bootstrap-vue/issues/1951
                            -->
                            <input v-else-if="field.type.type === 'text'"
                                   class="form-control"
                                   :id="field.column.name"
                                   :value="field.value"
                                   @input="updateValue(entry.id, field, $event.target.value)"
                                   type="text"
                                   :disabled="field.column.updateField === null || locked"
                                   :required="field.type.required" />
                            <b-form-input v-else
                                          :id="field.column.name"
                                          :value="field.value"
                                          @input="updateValue(entry.id, field, $event)"
                                          :type="field.type.type"
                                          :disabled="field.column.updateField === null || locked"
                                          :required="field.type.required" />
                        </b-form-group>
                    </template>
                </div>
                    
                <!-- FIXME FIXME FIXME don't look at user! -->
                <b-button class="delete_btn" v-if="entry.id !== undefined && currentAuth.header.sub === 'root'" variant="danger" v-b-modal="`deleteConfirm_${entry.id}`">{{ $t('delete') }}</b-button>
                <b-modal lazy :id="`deleteConfirm_${entry.id}`" ok-variant="danger" :ok-title="$t('ok')" @ok="deleteRecord(entry.id)" :cancel-title="$t('cancel')">
                    {{ $t('delete_confirmation') }}
                </b-modal>
            </b-form>
        </div>
    </b-container>
</template>

<script lang="ts">
    import { Component, Prop, Watch, Vue } from "vue-property-decorator"
    import { namespace } from "vuex-class"
    import { IExecutedRow, RowId, FieldName, IResultColumnInfo, IExecutedValue } from "@/api"
    import * as Api from "@/api"
    import { UserViewResult } from "@/state/user_view"
    import { CurrentAuth } from "@/state/auth"
    import { ChangesMap, IEntityChanges } from "@/state/staging_changes"
    import { setBodyStyle } from "@/style"

    interface ITextType {
        name: "text"
        type: "text" | "number"
        required: boolean
    }

    interface ITextAreaType {
        name: "textarea"
        required: boolean
    }

    interface ICodeEditorType {
        name: "codeeditor"
    }

    interface ISelectOption {
        text: string
        value: string
    }

    interface ISelectType {
        name: "select"
        options: ISelectOption[]
    }

    interface ICheckType {
        name: "check"
    }

    type IType = ITextType | ITextAreaType | ICodeEditorType | ISelectType | ICheckType

    interface IField {
        column: Api.IResultColumnInfo
        value: string
        caption: string
        isNullable: boolean
        type: IType
    }

    interface IBlock {
        width: number
        fields: IField[]
    }

    interface IForm {
        index: number
        id?: RowId
        deleted: boolean
        fields: IField[]
        blocks: IBlock[]
    }

    const auth = namespace("auth")
    const staging = namespace("staging")

    @Component({
        components: {
            CodeEditor: () => import("@/components/CodeEditor.vue"),
        },
    })
    export default class UserViewForm extends Vue {
        // FIXME FIXME FIXME
        @auth.State("current") currentAuth!: CurrentAuth | null
        @staging.State("changes") changes!: ChangesMap
        @staging.State("currentSubmit") currentSubmit!: Promise<void> | null
        @staging.Getter("forUserView") changesForUserView!: (uv: UserViewResult) => IEntityChanges
        @staging.Action("updateField") updateField!: ({ schema, entity, id, field, value }: { schema: string, entity: string, id: number, field: string, value: any }) => void
        @staging.Action("setAddedField") setAddedField!: ({ schema, entity, newId, field, value }: { schema: string, entity: string, newId: number, field: string, value: any }) => void
        @staging.Action("deleteEntry") deleteEntry!: ({ schema, entity, id }: { schema: string, entity: string, id: number }) => void
        @staging.Action("submit") submitChanges!: () => Promise<void>
        @staging.Getter("isEmpty") changesAreEmpty!: boolean

        // Internal arrays are fields in columns order
        entries: IForm[] = []

        @Prop({ type: UserViewResult }) private uv!: UserViewResult
        @Prop({ type: Boolean, default: false }) private isRoot!: boolean

        get locked() {
            return this.uv.rows === null && this.currentSubmit !== null
        }

        private updateValue(id: number, field: IField, value: string) {
            if (this.uv.info.updateEntity === null) {
                console.assert(false)
                return
            }

            if (field.value !== value) {
                const entity = this.uv.info.updateEntity

                if (this.uv.rows === null) {
                    this.setAddedField({
                        schema: entity.schema,
                        entity: entity.name,
                        // XXX: we only support working with first added item now, maybe fix that?
                        newId: 0,
                        field: field.column.name,
                        value,
                    })
                } else {
                    this.updateField({
                        schema: entity.schema,
                        entity: entity.name,
                        id,
                        field: field.column.name,
                        value,
                    })
                }

                // Needed to avoid cursor jumping in WebKit
                field.value = value
            }
        }

        private deleteRecord(id: number) {
            if (this.uv.info.updateEntity === null) {
                console.assert(false)
                return
            }

            const entity = this.uv.info.updateEntity
            this.deleteEntry({
                schema: entity.schema,
                entity: entity.name,
                id,
            })
        }

        @Watch("uv")
        private updateEntries() {
            if (this.uv.rows === null) {
                // This is creation mode and UserView just got reloaded -- it means staging was successfully pushed.
                // We presume a new entry was added and return back to the table view.
                // FIXME: this is a hack and we need to think of a better way.
                this.returnBack()
            } else {
                this.buildEntries()
                if (this.entries.length === 0) {
                    this.returnBack()
                }
            }
        }

        // See Table for description of why is this meddling with Watch is needed.
        @Watch("changes")
        private updateChanges() {
            if (this.changesAreEmpty) {
                // Changes got reset -- rebuild entries.
                // This could be done more efficiently but it would require tracking of what fields were changed.
                this.buildEntries()
            } else {
                const changedFields = this.getCurrentChanges()
                if (this.uv.rows !== null) {
                    let deletedCount = 0
                    Object.keys(changedFields.deleted).forEach(rowId => {
                        const deleted = changedFields.deleted[rowId]
                        const rowI = this.uv.updateRowIds[rowId]
                        const entry = this.entries[rowI]
                        if (deleted !== undefined) {
                            entry.deleted = deleted
                            if (deleted) {
                                deletedCount += 1
                            }
                        }
                    })

                    if (deletedCount === this.uv.rows.length) {
                        this.returnBack()
                        return
                    }

                    Object.keys(changedFields.updated).forEach(rowId => {
                        const fields = changedFields.updated[rowId]
                        const rowI = this.uv.updateRowIds[rowId]
                        const entry = this.entries[rowI]
                        if (fields === null) {
                            // Reset to original values
                            (this.uv.rows as IExecutedRow[])[rowI].values.forEach((value, valueI) => {
                                const cell = entry.fields[valueI]
                                cell.value = this.getValueText(value.value)
                            })
                        } else {
                            Object.keys(fields).forEach(fieldName => {
                                const cell = entry.fields[this.uv.updateColumnIds[fieldName]]
                                cell.value = this.getValueText(fields[fieldName])
                            })
                        }
                    })
                } else {
                    // Creation mode
                    if (changedFields.added.length !== 0) {
                        const entry = this.entries[0]
                        const fields = changedFields.added[0]
                        Object.keys(fields).forEach(fieldName => {
                            const cell = entry.fields[this.uv.updateColumnIds[fieldName]]
                            cell.value = this.getValueText(fields[fieldName])
                        })
                    }
                }
            }
        }

        private created() {
            if (this.isRoot) {
                setBodyStyle(`
                    @media print {
                        @page {
                            size: portrait;
                        }
                    }
                `)
            }
            this.buildEntries()
        }

        private buildEntries() {
            const changedFields = this.getCurrentChanges()
            const viewAttrs = this.uv.attributes

            // Build one form from a result row
            const makeForm = (row: IExecutedRow, rowI: number, isAdded: boolean): IForm => {
                const rowAttrs = row.attributes === undefined ? {} : row.attributes
                const getRowAttr = (name: string) => rowAttrs[name] || viewAttrs[name]

                let updatedValues: Record<string, any> = {}
                let deleted = false
                if (isAdded) {
                    if (changedFields.added.length !== 0) {
                        updatedValues = changedFields.added[0]
                    }
                } else if (row.id !== undefined) {
                    const deletedEntry = changedFields.deleted[row.id]
                    if (deletedEntry !== undefined) {
                        deleted = deletedEntry
                    }

                    const updatedEntry = changedFields.updated[row.id]
                    if (updatedEntry !== undefined && updatedEntry !== null) {
                        updatedValues = updatedEntry
                    }
                }

                // Relative block widths. [0..1]. Each block contains zero or more inputs.
                const blockWidths: number[] = getRowAttr("FormBlockWidths") || [1]
                const blocks: IBlock[] = blockWidths.map(width => ({ width, fields: [] }))

                const fields = this.uv.info.columns.map((columnInfo, i): IField => {
                    const value = row.values[i]
                    const columnAttrs = this.uv.columnAttributes[i]
                    const cellAttrs = value.attributes === undefined ? {} : value.attributes
                    const getCellAttr = (name: string) => cellAttrs[name] || rowAttrs[name] || columnAttrs[name] || viewAttrs[name]

                    const captionAttr = getCellAttr("Caption")
                    const caption = captionAttr !== undefined ? String(captionAttr) : columnInfo.name
                    const required = columnInfo.updateField === null ? false : (columnInfo.updateField.field.defaultValue === null)

                    const updatedValue = columnInfo.updateField === null ? undefined : updatedValues[columnInfo.updateField.name]
                    const currentValue = updatedValue === undefined ? value.value : updatedValue
                    const valueText = this.getValueText(currentValue)

                    const blockAttr = getCellAttr("FormBlock")
                    const blockNumber = blockAttr !== undefined ? Number(blockAttr) : 0
                    const block = Math.max(0, Math.min(blockNumber, blocks.length - 1))

                    const field = {
                        column: columnInfo,
                        value: valueText,
                        caption,
                        required,
                        isNullable: columnInfo.updateField === null ? true : columnInfo.updateField.field.isNullable,
                        type: this.getInputType(columnInfo, columnAttrs),
                    }

                    blocks[block].fields.push(field)
                    return field
                })

                return { id: row.id, index: rowI, deleted, fields, blocks }
            }

            if (this.uv.rows === null) {
                // Creation mode
                const values = this.uv.info.columns.map((columnInfo, i) => {
                    const value = columnInfo.updateField === null ? "" : columnInfo.updateField.field.defaultValue
                    return { value }
                })
                this.entries = [makeForm({ values }, 0, true)]
            } else {
                this.entries = this.uv.rows.map((row, rowI) => makeForm(row, rowI, false))
            }
        }

        private getInputType(columnInfo: IResultColumnInfo, attributes: Record<string, any>): IType {
            const isNullable = columnInfo.updateField === null ? true : columnInfo.updateField.field.isNullable
            if (columnInfo.fieldType !== null) {
                switch (columnInfo.fieldType.type) {
                    case "reference":
                        // FIXME
                        return { name: "text", type: "number", required: !isNullable }
                    case "enum":
                        return {
                            name: "select",
                            options: [...(isNullable ? [{ text: this.$tc("no_value"), value: "" }] : []), ...columnInfo.fieldType.values.map(x => ({ text: x, value: x }))],
                        }
                    case "bool":
                        return {
                            name: "select",
                            options: [...(isNullable ? [{ text: this.$tc("no_value"), value: "" }] : []), { text: this.$tc("yes"), value: "true" }, { text: this.$tc("no"), value: "false" }],
                        }
                    case "int":
                        return { name: "text", type: "number", required: !isNullable }
                }
            } else {
                switch (columnInfo.valueType.type) {
                    case "bool":
                        return {
                            name: "select",
                            options: [...(isNullable ? [{ text: this.$tc("no_value"), value: "" }] : []), { text: this.$tc("yes"), value: "true" }, { text: this.$tc("no"), value: "false" }],
                        }
                    case "int":
                        return { name: "text", type: "number", required: !isNullable }
                }
            }

            // Plain text
            switch (attributes["TextType"]) {
                case "multiline":
                    return { name: "textarea", required: !isNullable }
                case "codeeditor":
                    return { name: "codeeditor" }
                default:
                    return { name: "text", type: "text", required: !isNullable }
            }
        }

        private getCurrentChanges() {
            return this.changesForUserView(this.uv)
        }

        private returnBack() {
            if (this.isRoot) {
                this.$router.back()
            }
        }

        private getValueText(val: any) {
            if (val === null) {
                return ""
            } else {
                return String(val)
            }
        }

        get showedEntries() {
            return this.entries.filter(entry => !entry.deleted)
        }
    }
</script>

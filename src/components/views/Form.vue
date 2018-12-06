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
    <b-container fluid>
        <b-form v-for="entry in entries">
            <template v-for="field in entry.fields">
                <b-form-group :key="field.column.name" :label-for="field.column.name">
                    {{ field.caption }}

                    <b-form-checkbox v-if="field.type.name === 'check'"
                                    :id="field.column.name"
                                    :value="field.value"
                                    @input="updateValue(entry.id, field, $event)"
                                    v-model="field.value"
                                    :disabled="field.column.updateField === null" />
                    <b-form-textarea v-else-if="field.type.name === 'textarea'"
                                    :id="field.column.name"
                                    :value="field.value"
                                    @input="updateValue(entry.id, field, $event)"
                                    :disabled="field.column.updateField === null"
                                    :rows="3"
                                    :max-rows="6"
                                    :required="field.type.required" />
                    <b-form-select v-else-if="field.type.name === 'select'"
                                :id="field.column.name"
                                :value="field.value"
                                @input="updateValue(entry.id, field, $event)"
                                :disabled="field.column.updateField === null"
                                :options="field.type.options" />
                    <b-form-input v-else
                                :id="field.column.name"
                               :value="field.value"
                                @input="updateValue(entry.id, field, $event)"
                                :type="field.type.type"
                                :disabled="field.column.updateField === null"
                                :required="field.type.required" />
                </b-form-group>
            </template>

            <!-- FIXME FIXME FIXME don't look at user! -->
            <b-button v-if="entry.id !== undefined && currentAuth.header.sub === 'root'" variant="danger" v-b-modal.deleteConfirm>{{ $t('delete') }}</b-button>

            <b-modal id="deleteConfirm" ok-variant="danger" :ok-title="$t('ok')" @ok="deleteRecord(entry.id)" :cancel-title="$t('cancel')">
                {{ $t('delete_confirmation') }}
            </b-modal>
        </b-form>
    </b-container>
</template>

<script lang="ts">
    import { Component, Prop, Watch, Vue } from "vue-property-decorator"
    import { namespace } from "vuex-class"
    import { RowId, FieldName, IResultColumnInfo, IExecutedValue } from "@/api"
    import * as Api from "@/api"
    import * as Store from "@/state/store"
    import { UserViewResult } from "@/state/user_view"
    import { CurrentAuth } from "@/state/auth"
    import { ChangesMap, IEntityChanges } from "@/state/staging_changes"

    interface ITextType {
        name: "text"
        type: "text" | "number"
        required: boolean
    }

    interface ITextAreaType {
        name: "textarea"
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

    type IType = ITextType | ITextAreaType | ISelectType | ICheckType

    interface IField {
        column: Api.IResultColumnInfo
        value: string
        caption: string
        isNullable: boolean
        type: IType
    }

    interface IEntry {
        id?: RowId
        fields: IField[]
    }

    const auth = namespace("auth")
    const staging = namespace("staging")

    @Component
    export default class UserViewForm extends Vue {
        // FIXME FIXME FIXME
        @auth.State("current") currentAuth!: CurrentAuth | null
        @staging.State("changes") changes!: ChangesMap
        @staging.Getter("forUserView") changesForUserView!: (uv: UserViewResult) => IEntityChanges
        @staging.Mutation("updateField") updateField!: ({ schema, entity, id, field, value }: { schema: string, entity: string, id: number, field: string, value: any }) => void
        @staging.Mutation("deleteRow") deleteRow!: ({ schema, entity, id }: { schema: string, entity: string, id: number }) => void
        @staging.Getter("isEmpty") changesAreEmpty!: boolean

        // Internal arrays are fields in columns order
        entries: IEntry[] = []

        @Prop() private uv!: UserViewResult

        updateValue(id: number, field: IField, value: string) {
            if (this.uv.info.updateEntity === null) {
                console.assert(false)
                return
            }

            if (field.value !== value) {
                const entity = this.uv.info.updateEntity
                this.updateField({
                    schema: entity.schema,
                    entity: entity.name,
                    field: field.column.name,
                    value, id,
                })
            }
        }

        deleteRecord(id: number) {
            if (this.uv.info.updateEntity === null) {
                console.assert(false)
                return
            }

            return Store.callSecretApi(Api.deleteEntity, this.uv.info.updateEntity, id)
        }

        @Watch("uv")
        updateFields() {
            this.entries = this.buildEntries()
        }

        // See Table for description of why is this meddling with Watch is needed.
        @Watch("changes")
        updateChanges() {
            if (this.changesAreEmpty) {
                // Changes got reset -- rebuild entries.
                // This could be done more efficiently but it would require tracking of what fields were changed.
                this.entries = this.buildEntries()
            } else {
                const changedFields = this.getCurrentChanges()
                if (this.uv.rows !== null) {
                    Object.keys(changedFields.updated).forEach(rowId => {
                        const fields = changedFields.updated[rowId]
                        const rowI = this.uv.updateRowIds[rowId]
                        const entry = this.entries[rowI]
                        Object.keys(fields).forEach(fieldName => {
                            const cell = entry.fields[this.uv.updateColumnIds[fieldName]]
                            cell.value = this.getValueText(fields[fieldName])
                        })
                    })
                } else {
                    // Creation mode
                    if (changedFields.added !== null) {
                        const entry = this.entries[0]
                        const fields = changedFields.added
                        Object.keys(fields).forEach(fieldName => {
                            const cell = entry.fields[this.uv.updateColumnIds[fieldName]]
                            cell.value = this.getValueText(fields[fieldName])
                        })
                    }
                }
            }
        }

        created() {
            this.entries = this.buildEntries()
        }

        private buildEntries(): IEntry[] {
            const changedFields = this.getCurrentChanges()

            // `rowId === null` means that this is added entry. `undefined` means that this is computed field.
            const makeField = (rowId: number | null | undefined, columnInfo: Api.IResultColumnInfo, i: number, value: any) => {
                const columnAttrs = this.uv.columnAttributes[i]
                const captionAttr = columnAttrs["Caption"]
                const caption = captionAttr !== undefined ? captionAttr : columnInfo.name
                const required = columnInfo.updateField === null ? false : (columnInfo.updateField.field.defaultValue === null)

                let updatedValue
                if (rowId === null) {
                    if (changedFields.added !== null) {
                        updatedValue = changedFields.added[columnInfo.name]
                    }
                } else if (rowId !== undefined) {
                    const updatedEntry = changedFields.updated[rowId]
                    if (updatedEntry !== undefined) {
                        updatedValue = updatedEntry[columnInfo.name]
                    }
                }
                const currentValue = updatedValue === undefined ? value : updatedValue
                const valueText = this.getValueText(currentValue)

                return {
                    column: columnInfo,
                    value: valueText,
                    caption,
                    required,
                    isNullable: columnInfo.updateField === null ? true : columnInfo.updateField.field.isNullable,
                    type: this.getInputType(columnInfo, columnAttrs),
                }
            }

            if (this.uv.rows === null) {
                // Creation mode
                const newFields = this.uv.info.columns.map((columnInfo, i) => {
                    if (columnInfo.updateField === null) {
                        throw Error()
                    }
                    const defaultValue = columnInfo.updateField.field.defaultValue
                    return makeField(null, columnInfo, i, defaultValue)
                }, {})
                return [{ fields: newFields }]
            } else {
                return this.uv.rows.map((row, rowI) => {
                    const fields = this.uv.info.columns.map((columnInfo, i) => {
                        const value = row.values[i].value
                        return makeField(row.id, columnInfo, i, value)
                    })
                    return { fields, id: row.id }
                })
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

            return attributes["TextArea"] ? { name: "textarea" } : { name: "text", type: "text", required: !isNullable }
        }

        private getCurrentChanges() {
            return this.changesForUserView(this.uv)
        }

        private getValueText(val: any) {
            if (val === null) {
                return ""
            } else {
                return String(val)
            }
        }
    }
</script>

<style scoped lang="scss">
</style>
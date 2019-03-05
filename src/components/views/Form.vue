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
        <div v-for="entry in showedEntries" :key="entry.index" class="form_entry">
            <b-form class="view_form">
                <div v-for="(block, blockI) in blocks" :key="blockI" class="form_block" :style="{ width: `${block.width * 100}%` }">
                    <template v-for="fieldInfo in block.fields" class="form_data">
                        <b-form-group :key="fieldInfo.column.name" :label-for="fieldInfo.column.name">
                            {{ fieldInfo.caption }}
                            <ActionsMenu v-if="fieldInfo.type.name === 'userview'"
                                         title="*"
                                         :actions="entry.fields[fieldInfo.index].actions || []" />

                            <b-form-checkbox v-if="fieldInfo.type.name === 'check'"
                                             :id="fieldInfo.column.name"
                                             :value="entry.fields[fieldInfo.index].value"
                                             @input="updateValue(entry.id, fieldInfo, entry.fields[fieldInfo.index], $event)"
                                             v-model="fieldInfo.value"
                                             :disabled="fieldInfo.column.updateField === null || locked" />
                            <b-form-textarea v-else-if="fieldInfo.type.name === 'textarea'"
                                             :id="fieldInfo.column.name"
                                             :value="entry.fields[fieldInfo.index].valueText"
                                             @input="updateValue(entry.id, fieldInfo, entry.fields[fieldInfo.index], $event)"
                                             :disabled="fieldInfo.column.updateField === null || locked"
                                             :rows="3"
                                             :max-rows="6"
                                             :required="fieldInfo.type.required" />
                            <CodeEditor v-else-if="fieldInfo.type.name === 'codeeditor'"
                                        :content="entry.fields[fieldInfo.index].valueText"
                                        @update:content="updateValue(entry.id, fieldInfo, entry.fields[fieldInfo.index], $event)"
                                        :readOnly="fieldInfo.column.updateField === null || locked" />
                            <UserView v-else-if="fieldInfo.type.name === 'userview'"
                                      :uv="entry.fields[fieldInfo.index].value"
                                      @update:actions="entry.fields[fieldInfo.index].actions = $event" />
                            <b-form-select v-else-if="fieldInfo.type.name === 'select'"
                                           :id="fieldInfo.column.name"
                                           :value="entry.fields[fieldInfo.index].valueText"
                                           @input="updateValue(entry.id, fieldInfo, entry.fields[fieldInfo.index], $event)"
                                           :disabled="fieldInfo.column.updateField === null || locked"
                                           :options="fieldInfo.type.options" />
                            <!-- We don't use bootstrap-vue's b-form-input type=text because of problems with Safari
                                 https://github.com/bootstrap-vue/bootstrap-vue/issues/1951
                            -->
                            <input v-else-if="fieldInfo.type.type === 'text'"
                                   class="form-control"
                                   :id="fieldInfo.column.name"
                                   :value="entry.fields[fieldInfo.index].valueText"
                                   @input="updateValue(entry.id, fieldInfo, entry.fields[fieldInfo.index], $event.target.value)"
                                   type="text"
                                   :disabled="fieldInfo.column.updateField === null || locked"
                                   :required="fieldInfo.type.required" />
                            <b-form-input v-else
                                          :id="fieldInfo.column.name"
                                          :value="entry.fields[fieldInfo.index].valueText"
                                          @input="updateValue(entry.id, fieldInfo, entry.fields[fieldInfo.index], $event)"
                                          :type="fieldInfo.type.type"
                                          :disabled="fieldInfo.column.updateField === null || locked"
                                          :required="fieldInfo.type.required" />
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
    import { IExecutedRow, RowId, FieldType, FieldName, IResultColumnInfo, IExecutedValue } from "@/api"
    import * as Api from "@/api"
    import { IUserViewArguments, UserViewResult, EntriesMap, CurrentUserViews, printValue } from "@/state/user_view"
    import { CurrentAuth } from "@/state/auth"
    import { CurrentChanges, IEntityChanges, IUpdatedCell } from "@/state/staging_changes"
    import { setBodyStyle } from "@/style"
    import { IAction } from "@/components/ActionsMenu.vue"

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

    interface IUserViewType {
        name: "userview"
    }

    type IType = ITextType | ITextAreaType | ICodeEditorType | ISelectType | ICheckType | IUserViewType

    interface IFieldInfo {
        index: number
        column: Api.IResultColumnInfo
        caption: string
        isNullable: boolean
        type: IType
    }

    interface IBlockInfo {
        width: number
        fields: IFieldInfo[]
    }

    interface IField {
        value: any
        valueText: string
        actions?: IAction[]
    }

    interface IForm {
        index: number
        id?: RowId
        deleted: boolean
        fields: IField[]
    }

    const auth = namespace("auth")
    const userView = namespace("userView")
    const staging = namespace("staging")
    const translations = namespace("translations")

    @Component({
        components: {
            CodeEditor: () => import("@/components/CodeEditor.vue"),
        },
    })
    export default class UserViewForm extends Vue {
        // FIXME FIXME FIXME
        @auth.State("current") currentAuth!: CurrentAuth | null
        @userView.Action("getEntries") getEntries!: (_: { schemaName: string, entityName: string }) => Promise<void>
        @userView.State("entries") entriesMap!: EntriesMap
        @userView.State("current") userViews!: CurrentUserViews
        @userView.Action("getNestedView") getNestedView!: (_: IUserViewArguments) => Promise<void>
        @staging.State("current") changes!: CurrentChanges
        @staging.State("currentSubmit") currentSubmit!: Promise<void> | null
        @staging.Action("updateField") updateField!: ({ schema, entity, id, field, value }: { schema: string, entity: string, id: number, field: string, fieldType: FieldType, value: any }) => void
        @staging.Action("setAddedField") setAddedField!: ({ schema, entity, newId, field, value }: { schema: string, entity: string, newId: number, field: string, fieldType: FieldType, value: any }) => void
        @staging.Action("deleteEntry") deleteEntry!: ({ schema, entity, id }: { schema: string, entity: string, id: number }) => void
        @staging.Action("submit") submitChanges!: () => Promise<void>
        @translations.Getter("field") fieldTranslation!: (schema: string, entity: string, field: string, defValue: string) => string

        @Prop({ type: UserViewResult }) uv!: UserViewResult
        @Prop({ type: Boolean, default: false }) isRoot!: boolean

        // Internal arrays are fields in columns order
        private entries: IForm[] = []

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
                } else if (this.uv.info.updateEntity !== null && columnInfo.updateField !== null) {
                    caption = this.fieldTranslation(this.uv.info.updateEntity.schema, this.uv.info.updateEntity.name, columnInfo.updateField.name, columnInfo.name)
                } else {
                    caption = columnInfo.name
                }
                const required = columnInfo.updateField === null ? false : (columnInfo.updateField.field.defaultValue === null)

                const blockAttr = getColumnAttr("FormBlock")
                const blockNumber = blockAttr !== undefined ? Number(blockAttr) : 0
                const block = Math.max(0, Math.min(blockNumber, blocks.length - 1))

                const field = {
                    index: i,
                    column: columnInfo,
                    caption,
                    required,
                    isNullable: columnInfo.updateField === null ? true : columnInfo.updateField.field.isNullable,
                    type: this.getInputType(columnInfo, viewAttrs, columnAttrs),
                }

                blocks[block].fields.push(field)
            })

            return blocks
        }

        private updateValue(id: number, fieldInfo: IFieldInfo, field: IField, text: string) {
            if (this.uv.info.updateEntity === null) {
                console.assert(false, "No update entity defined in view")
                return
            }

            if (field.valueText !== text) {
                const entity = this.uv.info.updateEntity

                if (this.uv.rows === null) {
                    this.setAddedField({
                        schema: entity.schema,
                        entity: entity.name,
                        // XXX: we only support working with first added item now, maybe fix that?
                        newId: 0,
                        field: fieldInfo.column.name,
                        fieldType: fieldInfo.column.fieldType as FieldType,
                        value: text,
                    })
                } else {
                    this.updateField({
                        schema: entity.schema,
                        entity: entity.name,
                        id,
                        field: fieldInfo.column.name,
                        fieldType: fieldInfo.column.fieldType as FieldType,
                        value: text,
                    })
                }

                // Needed to avoid cursor jumping in WebKit
                field.valueText = text
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

        @Watch("uv", { deep: true })
        private updateEntries() {
            this.buildEntries()
            if (this.entries.length === 0) {
                this.returnBack()
            }
        }

        @Watch("userViews", { deep: true })
        private updateNestedViews() {
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
                const changedFields = this.getCurrentChanges()
                if (this.uv.rows !== null) {
                    let deletedCount = 0
                    Object.entries(changedFields.deleted).forEach(([rowId, deleted]) => {
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

                    Object.entries(changedFields.updated).forEach(([rowId, fields]) => {
                        const rowI = this.uv.updateRowIds[rowId]
                        const entry = this.entries[rowI]
                        if (fields === null) {
                            // Reset to original values
                            (this.uv.rows as IExecutedRow[])[rowI].values.forEach((value, valueI) => {
                                const columnInfo = this.uv.info.columns[valueI]
                                const cell = entry.fields[valueI]
                                cell.value = value.value
                                cell.valueText = printValue(columnInfo.valueType, value)
                            })
                        } else {
                            Object.entries(fields).forEach(([fieldName, value]) => {
                                const cell = entry.fields[this.uv.updateColumnIds[fieldName]]
                                cell.value = value.value
                                cell.valueText = value.rawValue
                            })
                        }
                    })
                } else {
                    // Creation mode
                    if (changedFields.added.length !== 0) {
                        const entry = this.entries[0]
                        const fields = changedFields.added[0]
                        Object.entries(fields).forEach(([fieldName, value]) => {
                            const cell = entry.fields[this.uv.updateColumnIds[fieldName]]
                            cell.value = value.value
                            cell.valueText = value.rawValue
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

                if (this.uv.rows === null) {
                    // When entry is created successfully, return back.
                    const currRoute = this.$route.fullPath
                    this.$emit("update:onSubmitStaging", () => {
                        if (this.$route.fullPath === currRoute) {
                            this.$router.back()
                        }
                    })
                }
            }
            this.buildEntries()
        }

        private buildEntries() {
            const changedFields = this.getCurrentChanges()
            const viewAttrs = this.uv.attributes

            this.uv.info.columns.forEach(columnInfo => {
                if (columnInfo.fieldType !== null && columnInfo.fieldType.type === "reference") {
                    // Request entries for references
                    this.getEntries({ schemaName: columnInfo.fieldType.entity.schema, entityName: columnInfo.fieldType.entity.name })
                }
            })

            // Build one form from a result row
            const makeForm = (row: IExecutedRow, rowI: number, isAdded: boolean): IForm => {
                const rowAttrs = row.attributes === undefined ? {} : row.attributes
                const getRowAttr = (name: string) => rowAttrs[name] || viewAttrs[name]

                let updatedValues: Record<string, IUpdatedCell> = {}
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

                const fields = this.uv.info.columns.map((columnInfo, i): IField => {
                    const rowValue = row.values[i]
                    const columnAttrs = this.uv.columnAttributes[i]
                    const getColumnAttr = (name: string) => columnAttrs[name] || viewAttrs[name]
                    const cellAttrs = rowValue.attributes === undefined ? {} : rowValue.attributes
                    const getCellAttr = (name: string) => cellAttrs[name] || rowAttrs[name] || columnAttrs[name] || viewAttrs[name]
                    const updatedValue = columnInfo.updateField === null ? undefined : updatedValues[columnInfo.updateField.name]

                    let value
                    let valueText
                    if (updatedValue === undefined) {
                        value = rowValue.value
                        valueText = printValue(columnInfo.valueType, value)
                    } else {
                        value = updatedValue.value
                        valueText = updatedValue.rawValue
                    }

                    const controlAttr = getColumnAttr("Control")
                    if (controlAttr === "UserView") {
                        // See also getFieldType to understand expected value format.
                        // FIXME: proper args
                        const viewArgs: IUserViewArguments = { type: "named", source: value[0], args: new URLSearchParams(location.search) }
                        this.getNestedView(viewArgs)
                        value = this.userViews.getUserView(viewArgs)
                    }

                    return {
                        value,
                        valueText,
                    }
                })

                return { id: row.id, index: rowI, deleted, fields }
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

        private getInputType(columnInfo: IResultColumnInfo, viewAttrs: Record<string, any>, columnAttrs: Record<string, any>): IType {
            const getColumnAttr = (name: string) => columnAttrs[name] || viewAttrs[name]
            const isNullable = columnInfo.updateField === null ? true : columnInfo.updateField.field.isNullable

            const controlAttr = getColumnAttr("Control")
            if (controlAttr === "UserView") {
                console.assert(
                    columnInfo.valueType.type === "array" && columnInfo.valueType.subtype === "string",
                    "User view rows should be arrays with user view name and arguments",
                )
                return { name: "userview" }
            }

            if (columnInfo.fieldType !== null) {
                switch (columnInfo.fieldType.type) {
                    case "reference":
                        const { schema, name: entity } = columnInfo.fieldType.entity
                        const currentSchema = this.entriesMap[schema]
                        if (currentSchema === undefined) {
                            return { name: "text", type: "number", required: !isNullable }
                        }
                        const entries = currentSchema[entity]
                        if (entries === undefined || entries instanceof Promise) {
                            return { name: "text", type: "number", required: !isNullable }
                        } else {
                            return {
                                name: "select",
                                options: Object.entries(entries).map(([name, id]) => ({ text: name, value: String(id) })),
                            }
                        }
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
            switch (getColumnAttr("TextType")) {
                case "multiline":
                    return { name: "textarea", required: !isNullable }
                case "codeeditor":
                    return { name: "codeeditor" }
                default:
                    return { name: "text", type: "text", required: !isNullable }
            }
        }

        private getCurrentChanges() {
            return this.changes.getForUserView(this.uv)
        }

        private returnBack() {
            if (this.isRoot) {
                this.$router.back()
            }
        }

        get showedEntries() {
            return this.entries.filter(entry => !entry.deleted)
        }
    }
</script>

import { Component, Prop, Vue } from "vue-property-decorator"
import { namespace } from "vuex-class"

import { SchemaName, EntityName, FieldName } from "@/api"
import { CombinedUserView } from "@/state/user_view"
import { LocalUserView, RowRef, ValueRef } from "@/local_user_view"

const userView = namespace("userView")

@Component
export default class BaseUserView<T extends LocalUserView<ValueT, RowT, ViewT>, ValueT, RowT, ViewT> extends Vue {
    @userView.Action("deleteEntry") deleteEntry!: (args: { schema: SchemaName, entity: EntityName, id: number }) => Promise<void>
    @userView.Action("resetAddedEntry") resetAddedEntry!: (args: { schema: string, entity: string, id: number }) => Promise<void>
    @userView.Action("addEntry") addEntry!: (args: { schema: SchemaName, entity: EntityName, position?: number }) => Promise<void>
    @userView.Action("setAddedField") setAddedField!: (args: { schema: SchemaName, entity: EntityName, id: number, field: FieldName, value: any }) => Promise<void>
    @userView.Action("updateField") updateField!: (args: { schema: SchemaName, entity: EntityName, id: number, field: FieldName, value: any }) => Promise<void>

    @Prop({ type: CombinedUserView, required: true }) uv!: CombinedUserView
    @Prop({ type: Object, required: true }) local!: T
    @Prop({ type: Boolean, default: false }) isRoot!: boolean
    @Prop({ type: Array, required: true }) filter!: string[]

    protected getValueByRef(ref: ValueRef) {
        const row = this.getValueRowByRef(ref)
        if (row === null) {
            return null
        } else {
            return {
                row,
                value: row.row.values[ref.column],
                local: row.local.values[ref.column],
            }
        }
    }

    protected getValueRowByRef(ref: RowRef) {
        if (ref.type === "added") {
            if (!(ref.id in this.uv.newRows)) {
                return null
            } else {
                return {
                    row: this.uv.newRows[ref.id],
                    local: this.local.newRows[ref.id],
                }
            }
        } else if (ref.type === "existing") {
            if (this.uv.rows === null) {
                throw Error("Impossible")
            }

            const row = this.uv.rows[ref.position]
            if (row.deleted) {
                return null
            } else {
                return {
                    row: this.uv.rows[ref.position],
                    local: this.local.rows[ref.position],
                }
            }
        } else if (ref.type === "new") {
            if (this.local.emptyRow === null) {
                throw Error("Impossible")
            }

            return this.local.emptyRow
        } else {
            throw Error("Impossible")
        }
    }

    protected deleteRow(ref: RowRef) {
        if (this.uv.info.mainEntity === null) {
            throw new Error("View doesn't have a main entity")
        }
        const entity = this.uv.info.mainEntity

        if (ref.type === "added") {
            this.resetAddedEntry({
                schema: entity.schema,
                entity: entity.name,
                id: ref.id,
            })
        } else if (ref.type === "existing") {
            if (this.uv.rows === null) {
                throw Error("Impossible")
            }

            this.deleteEntry({
                schema: entity.schema,
                entity: entity.name,
                // Guaranteed to exist if mainEntity exists.
                id: this.uv.rows[ref.position].mainId as number,
            })
        }
    }

    protected async updateValue(ref: ValueRef, rawValue: any) {
        const value = this.getValueByRef(ref)
        if (value === null) {
            throw Error("Impossible")
        }

        if (ref.type === "added") {
            const updateInfo = value.value.info
            if (updateInfo === undefined) {
                throw Error("Impossible")
            }

            await this.setAddedField({
                schema: updateInfo.fieldRef.entity.schema,
                entity: updateInfo.fieldRef.entity.name,
                field: updateInfo.fieldRef.name,
                id: updateInfo.id,
                value: rawValue,
            })
        } else if (ref.type === "existing") {
            const updateInfo = value.value.info
            if (updateInfo === undefined) {
                throw Error("Impossible")
            }

            await this.updateField({
                schema: updateInfo.fieldRef.entity.schema,
                entity: updateInfo.fieldRef.entity.name,
                field: updateInfo.fieldRef.name,
                id: updateInfo.id,
                value: rawValue,
            })
        } else if (ref.type === "new") {
            const entity = this.uv.info.mainEntity
            if (entity === null) {
                throw new Error("View doesn't have a main entity")
            }
            if (this.local.emptyRow === null) {
                throw new Error("Impossible")
            }

            // FIXME: Theoretical race condition with another addEntry because it's async
            await this.addEntry({ schema: entity.schema, entity: entity.name, position: 0 })
            const rowId = this.uv.newRowsPositions[0]
            await Promise.all(this.local.emptyRow.row.values.map((cell, colI) => {
                const columnInfo = this.uv.info.columns[colI]
                if (columnInfo.mainField !== null && cell.value !== undefined) {
                    return this.setAddedField({
                        schema: entity.schema,
                        entity: entity.name,
                        field: columnInfo.mainField.name,
                        id: rowId,
                        // FIXME: hack to ensure rawValue has strings
                        // value: printValue(info.columnInfo.valueType, cell.value),
                        value: colI === ref.column ? rawValue : cell.value,
                    })
                } else {
                    return Promise.resolve()
                }
            }))
        } else {
            throw Error("Impossible")
        }
    }
}

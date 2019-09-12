import { Component, Prop, Vue } from "vue-property-decorator";
import { namespace } from "vuex-class";

import { SchemaName, EntityName, FieldName } from "@/api";
import { valueToRaw } from "@/values";
import { CombinedUserView } from "@/state/user_view";
import { LocalUserView, RowRef, ValueRef } from "@/local_user_view";

const staging = namespace("staging");

@Component
export default class BaseUserView<T extends LocalUserView<ValueT, RowT, ViewT>, ValueT, RowT, ViewT> extends Vue {
    @staging.Action("deleteEntry") deleteEntry!: (args: { schema: SchemaName, entity: EntityName, id: number }) => Promise<void>;
    @staging.Action("resetAddedEntry") resetAddedEntry!: (args: { schema: string, entity: string, id: number }) => Promise<void>;
    @staging.Action("addEntry") addEntry!: (args: { schema: SchemaName, entity: EntityName, position?: number }) => Promise<void>;
    @staging.Action("setAddedField") setAddedField!: (args: { schema: SchemaName, entity: EntityName, id: number, field: FieldName, value: any }) => Promise<void>;
    @staging.Action("updateField") updateField!: (args: { schema: SchemaName, entity: EntityName, id: number, field: FieldName, value: any }) => Promise<void>;

    @Prop({ type: CombinedUserView, required: true }) uv!: CombinedUserView;
    @Prop({ type: Object, required: true }) local!: T;
    @Prop({ type: Boolean, default: false }) isRoot!: boolean;
    @Prop({ type: Array, required: true }) filter!: string[];

    protected deleteRow(ref: RowRef) {
        if (this.uv.info.mainEntity === null) {
            throw new Error("View doesn't have a main entity");
        }
        const entity = this.uv.info.mainEntity;

        if (ref.type === "added") {
            this.resetAddedEntry({
                schema: entity.schema,
                entity: entity.name,
                id: ref.id,
            });
        } else if (ref.type === "existing") {
            const rows = this.uv.rows!;
            this.deleteEntry({
                schema: entity.schema,
                entity: entity.name,
                // Guaranteed to exist if mainEntity exists.
                id: rows[ref.position].mainId as number,
            });
        }
    }

    protected async updateValue(ref: ValueRef, rawValue: any) {
        const value = this.local.getValueByRef(ref)!;
        if (ref.type === "added") {
            const updateInfo = value.value.info!;
            await this.setAddedField({
                schema: updateInfo.fieldRef.entity.schema,
                entity: updateInfo.fieldRef.entity.name,
                field: updateInfo.fieldRef.name,
                id: updateInfo.id,
                value: rawValue,
            });
        } else if (ref.type === "existing") {
            const updateInfo = value.value.info!;
            await this.updateField({
                schema: updateInfo.fieldRef.entity.schema,
                entity: updateInfo.fieldRef.entity.name,
                field: updateInfo.fieldRef.name,
                id: updateInfo.id,
                value: rawValue,
            });
        } else if (ref.type === "new") {
            const entity = this.uv.info.mainEntity;
            if (entity === null) {
                throw new Error("View doesn't have a main entity");
            }

            // FIXME: Theoretical race condition with another addEntry because it's async
            await this.addEntry({ schema: entity.schema, entity: entity.name, position: 0 });
            const rowId = this.uv.newRowsPositions[0];
            await Promise.all(this.local.emptyRow!.row.values.map((cell, colI) => {
                const columnInfo = this.uv.info.columns[colI];
                if (columnInfo.mainField !== null && cell.value !== undefined) {
                    return this.setAddedField({
                        schema: entity.schema,
                        entity: entity.name,
                        field: columnInfo.mainField.name,
                        id: rowId,
                        // valueToRaw ensures that rawValues are strings
                        value: colI === ref.column ? rawValue : valueToRaw(columnInfo.valueType, cell.value),
                    });
                } else {
                    return Promise.resolve();
                }
            }));
        } else {
            throw Error("Impossible");
        }
    }
}

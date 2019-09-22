import { Component, Prop, Vue } from "vue-property-decorator";
import { namespace } from "vuex-class";

import { SchemaName, EntityName, FieldName, RowId } from "@/api";
import { CombinedUserView } from "@/state/user_view";
import { ScopeName, AddedRowId, IAddedResult } from "@/state/staging_changes";
import { LocalUserView, RowRef, ValueRef } from "@/local_user_view";

const staging = namespace("staging");

@Component
export default class BaseUserView<T extends LocalUserView<ValueT, RowT, ViewT>, ValueT, RowT, ViewT> extends Vue {
    @staging.Action("deleteEntry") deleteEntry!: (args: { scope: ScopeName, schema: SchemaName, entity: EntityName, id: RowId }) => Promise<void>;
    @staging.Action("resetAddedEntry") resetAddedEntry!: (args: { schema: SchemaName, entity: EntityName, id: AddedRowId }) => Promise<void>;
    @staging.Action("addEntry") addEntry!: (args: { scope: ScopeName, schema: SchemaName, entity: EntityName, position?: number }) => Promise<IAddedResult>;
    @staging.Action("setAddedField") setAddedField!: (args: { schema: SchemaName, entity: EntityName, id: AddedRowId, field: FieldName, value: any }) => Promise<void>;
    @staging.Action("updateField") updateField!: (args: { scope: ScopeName, schema: SchemaName, entity: EntityName, id: RowId, field: FieldName, value: any }) => Promise<void>;

    @Prop({ type: CombinedUserView, required: true }) uv!: CombinedUserView;
    @Prop({ type: Object, required: true }) local!: T;
    @Prop({ type: Boolean, default: false }) isRoot!: boolean;
    @Prop({ type: Array, required: true }) filter!: string[];
    @Prop({ type: Boolean, default: false }) selectionMode!: boolean;
    @Prop({ type: Boolean, default: false }) indirectLinks!: boolean;
    @Prop({ type: String, required: true }) scope!: ScopeName;

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
                scope: this.scope,
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
                scope: this.scope,
                schema: updateInfo.fieldRef.entity.schema,
                entity: updateInfo.fieldRef.entity.name,
                id: updateInfo.id,
                field: updateInfo.fieldRef.name,
                value: rawValue,
            });
        } else if (ref.type === "new") {
            const entity = this.uv.info.mainEntity;
            if (entity === null) {
                throw new Error("View doesn't have a main entity");
            }

            // FIXME: Theoretical race condition with another addEntry because it's async
            const res = await this.addEntry({
                scope: this.scope,
                schema: entity.schema,
                entity: entity.name,
                position: 0,
            });
            await Promise.all(this.local.emptyRow!.row.values.map((cell, colI) => {
                const columnInfo = this.uv.info.columns[colI];
                if (columnInfo.mainField !== null && cell.value !== undefined) {
                    return this.setAddedField({
                        schema: entity.schema,
                        entity: entity.name,
                        field: columnInfo.mainField.name,
                        id: res.id,
                        value: colI === ref.column ? rawValue : cell.rawValue,
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

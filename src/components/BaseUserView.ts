import { Component, Prop, Vue } from "vue-property-decorator";
import { namespace } from "vuex-class";

import { RowId, IEntityRef, IFieldRef } from "@/api";
import { CombinedUserView, currentValue } from "@/state/user_view";
import { ErrorKey } from "@/state/errors";
import { ScopeName, UserViewKey, AddedRowId, CombinedTransactionResult, IAddedResult } from "@/state/staging_changes";
import { LocalUserView, RowRef, ValueRef } from "@/local_user_view";
import { equalEntityRef } from "@/values";

export interface ISelectionRef {
  entity: IEntityRef;
  id: number;
}

const staging = namespace("staging");
const errors = namespace("errors");

const errorKey = "base_user_view";

@Component
export default class BaseUserView<T extends LocalUserView<ValueT, RowT, ViewT>, ValueT, RowT, ViewT> extends Vue {
  @staging.State("currentSubmit") currentSubmit!: Promise<CombinedTransactionResult[]> | null;
  @staging.Action("deleteEntry") deleteEntry!: (args: { scope: ScopeName; entityRef: IEntityRef; id: RowId }) => Promise<void>;
  @staging.Action("resetAddedEntry") resetAddedEntry!: (args: { entityRef: IEntityRef; userView: UserViewKey; id: AddedRowId }) => Promise<void>;
  @staging.Action("addEntry") addEntry!: (args: { scope: ScopeName; entityRef: IEntityRef; userView: UserViewKey; position?: number }) => Promise<IAddedResult>;
  @staging.Action("setAddedField") setAddedField!: (args: { scope: ScopeName; fieldRef: IFieldRef; userView: UserViewKey; id: AddedRowId; value: any }) => Promise<void>;
  @staging.Action("updateField") updateField!: (args: { scope: ScopeName; fieldRef: IFieldRef; id: RowId; value: any }) => Promise<void>;
  @errors.Mutation("setError") setError!: (args: { key: ErrorKey; error: string }) => void;
  @errors.Mutation("resetErrors") resetErrors!: (key: ErrorKey) => void;

  @Prop({ type: CombinedUserView, required: true }) uv!: CombinedUserView;
  @Prop({ type: Object, required: true }) local!: T;
  @Prop({ type: Boolean, default: false }) isRoot!: boolean;
  @Prop({ type: Array, required: true }) filter!: string[];
  @Prop({ type: Boolean, default: false }) selectionMode!: boolean;
  @Prop({ type: Boolean, default: false }) indirectLinks!: boolean;
  @Prop({ type: String, required: true }) scope!: ScopeName;
  @Prop({ type: Number, required: true }) level!: number;
  @Prop({ type: Object, default: () => ({}) }) defaultValues!: Record<string, any>;

  get addedLocked() {
    return this.currentSubmit !== null;
  }

  protected deleteRow(ref: RowRef) {
    if (!this.uv.info.mainEntity) {
      throw new Error("View doesn't have a main entity");
    }
    const entity = this.uv.info.mainEntity;

    if (ref.type === "added") {
      this.resetAddedEntry({
        entityRef: entity,
        userView: this.uv.userViewKey,
        id: ref.id,
      });
    } else if (ref.type === "existing") {
      const rows = this.uv.rows!;
      const row = rows[ref.position];
      if (row.mainSubEntity !== undefined && !equalEntityRef(row.mainSubEntity, entity)) {
        const message = "Row from a child entity cannot be deleted from user view with parent main entity";
        this.setError({ key: errorKey, error: message });
        throw new Error(message);
      } else {
        this.resetErrors(errorKey);
      }
      this.deleteEntry({
        scope: this.scope,
        entityRef: entity,
        // Guaranteed to exist if mainEntity exists.
        id: row.mainId as number,
      });
    }
  }

  protected destroyed() {
    this.resetErrors(errorKey);
  }

  protected async updateValue(ref: ValueRef, rawValue: any): Promise<ValueRef> {
    const value = this.local.getValueByRef(ref)!;
    if (ref.type === "added") {
      const updateInfo = value.value.info!;
      await this.setAddedField({
        scope: this.scope,
        fieldRef: updateInfo.fieldRef,
        userView: this.uv.userViewKey,
        id: updateInfo.id,
        value: rawValue,
      });
      return ref;
    } else if (ref.type === "existing") {
      const updateInfo = value.value.info!;
      await this.updateField({
        scope: this.scope,
        fieldRef: updateInfo.fieldRef,
        id: updateInfo.id,
        value: rawValue,
      });
      return ref;
    } else if (ref.type === "new") {
      const entity = this.uv.info.mainEntity;
      if (!entity) {
        throw new Error("View doesn't have a main entity");
      }
      if (this.uv.info.columns[ref.column].mainField === null) {
        throw new Error("Invalid column number");
      }
      if (rawValue === undefined) {
        throw new Error("Invalid value");
      }

      // FIXME: Theoretical race condition with another addEntry because it's async
      const res = await this.addEntry({
        scope: this.scope,
        entityRef: entity,
        userView: this.uv.userViewKey,
        position: 0,
      });
      await Promise.all(this.local.emptyRow!.row.values.map((cell, colI) => {
        const columnInfo = this.uv.info.columns[colI];
        const currValue = colI === ref.column ? rawValue : currentValue(cell);
        if (columnInfo.mainField && currValue) {
          return this.setAddedField({
            scope: this.scope,
            fieldRef: {
              entity,
              name: columnInfo.mainField.name,
            },
            userView: this.uv.userViewKey,
            id: res.id,
            value: currValue,
          });
        } else {
          return Promise.resolve();
        }
      }));
      return { type: "added", id: res.id, column: ref.column };
    } else {
      throw new Error("Impossible");
    }
  }
}

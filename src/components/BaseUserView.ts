import { Component, Prop, Vue } from "vue-property-decorator";
import { namespace } from "vuex-class";
import { RowId, IEntityRef, IFieldRef } from "ozma-api";

import { ErrorKey } from "@/state/errors";
import type { ScopeName, AddedRowId, CombinedTransactionResult } from "@/state/staging_changes";
import type {
  IExtendedRowInfo, ICombinedValue, IExtendedRow, ICombinedUserView,
  ICombinedUserViewAny, IUserViewHandler, ICombinedRow, IAddedRow, IExtendedAddedRow,
} from "@/user_views/combined";
import { RowRef, ValueRef, CombinedUserView, currentValue } from "@/user_views/combined";
import { equalEntityRef, valueIsNull } from "@/values";
import { NeverError, ObjectSet, tryDicts } from "@/utils";
import { IAttrToQueryOpts } from "@/state/query";

import { attrToLink } from "@/links";
import { attrToButtons } from "@/components/buttons/buttons";
import { emptyUserViewHandlerFunctions } from "@/user_views/trivial";
import { eventBus } from "@/main";
import { isReadonlyDemoInstance } from "@/api";

export interface ISelectionRef {
  entity: IEntityRef;
  id: RowId;
}

export const userViewTitle = (uv: ICombinedUserViewAny): string | null => {
  if ("title" in uv.attributes) {
    return String(uv.attributes["title"]);
  } else if (uv.args.source.type === "named") {
    return uv.args.source.ref.name;
  } else {
    return null;
  }
};

// Common extra data for every user view, and its handler.

export interface IBaseValueExtra {
  softDisabled: boolean; // UI-only edit disabling.
}

export interface IBaseRowExtra {
  selected: boolean;
  selectionEntry: ISelectionRef | null;
}

export interface IBaseViewExtra {
  rowCount: number;
  selectedRows: ObjectSet<RowRef>;
  softDisabled: boolean;
}

export type IBaseCombinedUserView = ICombinedUserView<IBaseValueExtra, IBaseRowExtra, IBaseViewExtra>;
export type IBaseExtendedRow = IExtendedRow<IBaseValueExtra, IBaseRowExtra>;
export type IBaseExtendedRowInfo = IExtendedRowInfo<IBaseRowExtra>;
export type IBaseExtendedAddedRow = IExtendedAddedRow<IBaseValueExtra, IBaseRowExtra>;

export const baseUserViewHandler: IUserViewHandler<IBaseValueExtra, IBaseRowExtra, IBaseViewExtra> = {
  ...emptyUserViewHandlerFunctions,

  createLocalValue(uv: IBaseCombinedUserView, rowIndex: number, row: ICombinedRow & IBaseExtendedRowInfo, columnIndex: number, value: ICombinedValue): IBaseValueExtra {
    const getValueAttr = (key: string) => tryDicts(key, value.attributes, row.attributes, uv.columnAttributes[columnIndex], uv.attributes);
    if (value.info && getValueAttr("selectable")) {
      row.extra.selectionEntry = {
        entity: value.info.fieldRef.entity,
        id: value.info.id!,
      };
    }
    const softDisabled = Boolean(getValueAttr("soft_disabled"));
    return { softDisabled };
  },

  createAddedLocalValue(uv: IBaseCombinedUserView, rowIndex: number, row: ICombinedRow & IBaseExtendedRowInfo, columnIndex: number, value: ICombinedValue) {
    const getValueAttr = (key: string) => tryDicts(key, value.attributes, row.attributes, uv.columnAttributes[columnIndex], uv.attributes);
    const softDisabled = Boolean(getValueAttr("soft_disabled"));
    return { softDisabled };
  },

  createEmptyLocalValue(uv: IBaseCombinedUserView, row: ICombinedRow & IBaseExtendedRowInfo, columnIndex: number, value: ICombinedValue) {
    const getValueAttr = (key: string) => tryDicts(key, value.attributes, row.attributes, uv.columnAttributes[columnIndex], uv.attributes);
    const softDisabled = Boolean(getValueAttr("soft_disabled"));
    return { softDisabled };
  },

  createLocalRow(uv: IBaseCombinedUserView, rowIndex: number, row: ICombinedRow, oldView: IBaseViewExtra | null, oldRow: IBaseRowExtra | null) {
    const selectionEntry = uv.info.mainEntity ? {
      entity: uv.info.mainEntity,
      id: row.mainId!,
    } : null;
    const selected = (oldRow?.selected ?? false) && !row.deleted;
    if (selected) {
      uv.extra.selectedRows.insert({ type: "existing", position: rowIndex });
    }
    return {
      selected,
      selectionEntry,
    };
  },

  createAddedLocalRow(uv: IBaseCombinedUserView, rowId: AddedRowId, row: IAddedRow, oldView: IBaseViewExtra | null, oldRow: IBaseRowExtra | null) {
    const selected = oldRow?.selected ?? false;
    if (selected) {
      uv.extra.selectedRows.insert({ type: "added", id: rowId });
    }
    return {
      selected,
      selectionEntry: null,
    };
  },

  createEmptyLocalRow() {
    return {
      selected: false,
      selectionEntry: null,
    };
  },

  createLocalUserView(uv: IBaseCombinedUserView) {
    const softDisabled = Boolean(uv.attributes["soft_disabled"]);

    return {
      rowCount: 0,
      selectedRows: new ObjectSet<RowRef>(),
      softDisabled,
    };
  },

  postInitRow(uv: IBaseCombinedUserView, rowIndex: number, row: IBaseExtendedRow) {
    if (!row.deleted) {
      uv.extra.rowCount++;
    }
  },

  postInitAddedRow(uv: IBaseCombinedUserView, rowId: AddedRowId, row: IBaseExtendedAddedRow) {
    if (!row.deleted) {
      uv.extra.rowCount++;
    }
  },

  deleteRow(uv: IBaseCombinedUserView, rowIndex: number, row: IBaseExtendedRow) {
    uv.extra.rowCount--;
    if (row.extra.selected) {
      row.extra.selected = false;
      uv.extra.selectedRows.delete({ type: "existing", position: rowIndex });
    }
  },

  deleteAddedRow(uv: IBaseCombinedUserView, rowId: AddedRowId, row: IBaseExtendedAddedRow) {
    uv.extra.rowCount--;
    if (row.extra.selected) {
      row.extra.selected = false;
      uv.extra.selectedRows.delete({ type: "added", id: rowId });
    }
  },

  undeleteRow(uv: IBaseCombinedUserView) {
    uv.extra.rowCount++;
  },

  undeleteAddedRow(uv: IBaseCombinedUserView) {
    uv.extra.rowCount++;
  },
};

const staging = namespace("staging");
const errors = namespace("errors");

// Base class for all user views.
@Component
export default class BaseUserView<ValueT extends IBaseValueExtra, RowT extends IBaseRowExtra, ViewT extends IBaseViewExtra> extends Vue {
  @staging.State("currentSubmit") currentSubmit!: Promise<CombinedTransactionResult[]> | null;
  @staging.Action("deleteEntry") deleteEntry!: (args: { entityRef: IEntityRef; id: RowId }) => Promise<void>;
  @staging.Action("resetAddedEntry") resetAddedEntry!: (args: { entityRef: IEntityRef; id: AddedRowId }) => Promise<void>;
  @staging.Action("addEntry") addEntry!: (args: { scope: ScopeName; entityRef: IEntityRef; meta?: unknown }) => Promise<AddedRowId>;
  @staging.Action("setAddedField") setAddedField!: (args: { fieldRef: IFieldRef; id: AddedRowId; value: unknown }) => Promise<void>;
  @staging.Action("updateField") updateField!: (args: { fieldRef: IFieldRef; id: RowId; value: unknown }) => Promise<void>;
  @errors.Mutation("setError") setError!: (args: { key: ErrorKey; error: string }) => void;
  @errors.Mutation("resetErrors") resetErrors!: (key: ErrorKey) => void;

  @Prop({ type: CombinedUserView, required: true }) uv!: ICombinedUserView<ValueT, RowT, ViewT>;
  @Prop({ type: Boolean, default: false }) isRoot!: boolean;
  @Prop({ type: Boolean, default: false }) isTopLevel!: boolean;
  @Prop({ type: Array, required: true }) filter!: string[];
  @Prop({ type: Boolean, default: false }) selectionMode!: boolean;
  @Prop({ type: String, required: true }) scope!: ScopeName;
  @Prop({ type: Number, required: true }) level!: number;
  @Prop({ type: Object, default: () => ({}) }) defaultValues!: Record<string, unknown>;

  get addedLocked() {
    return this.currentSubmit !== null;
  }

  selectRow(ref: RowRef, selectedStatus: boolean) {
    if (ref.type === "new") {
      throw new Error("Cannot select empty row");
    }

    const row = this.uv.getRowByRef(ref);
    if (!row) {
      return;
    }
    if (row.extra.selected !== selectedStatus) {
      row.extra.selected = selectedStatus;
      if (selectedStatus) {
        this.uv.extra.selectedRows.insert(ref);
      } else {
        this.uv.extra.selectedRows.delete(ref);
      }
    }
  }

  selectAll(selectedStatus: boolean) {
    if (selectedStatus) {
      Object.entries(this.uv.newRows).forEach(([rowIdRaw, row]) => {
        const rowId = Number(rowIdRaw);
        row.extra.selected = true;
        this.uv.extra.selectedRows.insert({
          type: "added",
          id: rowId,
        });
      });

      if (this.uv.rows !== null) {
        this.uv.rows.forEach((localRow, rowI) => {
          const row = this.uv.rows![rowI];
          if (!row.deleted) {
            localRow.extra.selected = true;
            this.uv.extra.selectedRows.insert({
              type: "existing",
              position: rowI,
            });
          }
        });
      }
    } else {
      this.uv.extra.selectedRows.keys().forEach(ref => {
        if (ref.type === "existing") {
          this.uv.rows![ref.position].extra.selected = false;
        } else if (ref.type === "added") {
          this.uv.newRows[ref.id].extra.selected = false;
        } else {
          throw new Error("Impossible");
        }
      });
      this.uv.extra.selectedRows = new ObjectSet();
    }
  }

  get selectedAll(): boolean {
    return this.uv.extra.selectedRows.length === this.uv.extra.rowCount && this.uv.extra.selectedRows.length > 0;
  }

  get selectedSome(): boolean {
    return this.uv.extra.selectedRows.length > 0;
  }

  get selectedLength(): number {
    return this.uv.extra.selectedRows.length;
  }

  deleteRow(ref: RowRef) {
    if (isReadonlyDemoInstance) {
      eventBus.emit("showReadonlyDemoModal");
      return;
    }

    if (!this.uv.info.mainEntity) {
      throw new Error("View doesn't have a main entity");
    }
    const entity = this.uv.info.mainEntity;

    if (ref.type === "added") {
      const row = this.uv.newRows[ref.id];
      if (row.newId !== undefined) {
        void this.deleteEntry({
          entityRef: entity,
          id: row.newId,
        });
      } else {
        void this.resetAddedEntry({
          entityRef: entity,
          id: ref.id,
        });
      }
    } else if (ref.type === "existing") {
      const rows = this.uv.rows!;
      const row = rows[ref.position];
      if (row.mainSubEntity !== undefined && !equalEntityRef(row.mainSubEntity, entity)) {
        const message = "Row from a child entity cannot be deleted from user view with parent main entity";
        this.setError({ key: this.uid, error: message });
        throw new Error(message);
      } else {
        this.resetErrors(this.uid);
      }
      void this.deleteEntry({
        entityRef: entity,
        id: row.mainId!,
      });
    } else {
      throw new Error("Cannot delete empty row");
    }
  }

  protected destroyed() {
    this.resetErrors(this.uid);
  }

  get creationLink() {
    const opts: IAttrToQueryOpts = {
      infoByDefault: true,
      homeSchema: this.uv.homeSchema ?? undefined,
    };

    return attrToLink(this.uv.attributes["create_link"], opts);
  }

  get creationButtons() {
    const opts: IAttrToQueryOpts = {
      infoByDefault: true,
      homeSchema: this.uv.homeSchema ?? undefined,
    };

    return attrToButtons(this.uv.attributes["create_buttons"], opts);
  }

  async addNewRow(meta?: unknown): Promise<number> {
    if (isReadonlyDemoInstance) {
      eventBus.emit("showReadonlyDemoModal");
      return -1;
    }

    const entity = this.uv.info.mainEntity;
    if (!entity) {
      throw new Error("View doesn't have a main entity");
    }

    // FIXME: Theoretical race condition with another addEntry because it's async
    const id = await this.addEntry({
      scope: this.scope,
      entityRef: entity,
      meta,
    });
    await Promise.all(this.uv.emptyRow!.values.map(async (cell, colI) => {
      const columnInfo = this.uv.info.columns[colI];
      const currValue = currentValue(cell);
      if (columnInfo.mainField && !valueIsNull(currValue)) {
        await this.setAddedField({
          fieldRef: {
            entity,
            name: columnInfo.mainField.name,
          },
          id,
          value: currentValue(cell),
        });
      }
    }));
    this.uv.trackAddedEntry(id, meta);
    return id;
  }

  async updateValue(ref: ValueRef, rawValue: unknown): Promise<ValueRef> {
    if (isReadonlyDemoInstance) {
      eventBus.emit("showReadonlyDemoModal");
      return ref;
    }

    const value = this.uv.getValueByRef(ref)!;
    switch (ref.type) {
      case "added": {
        // FIXME: throws error `updateInfo is undefined` when user tries to edit disabled cell.
        const updateInfo = value.value.info!;
        if (updateInfo.id === undefined) {
          await this.setAddedField({
            fieldRef: updateInfo.fieldRef,
            id: ref.id,
            value: rawValue,
          });
        } else {
          await this.updateField({
            fieldRef: updateInfo.fieldRef,
            id: updateInfo.id,
            value: rawValue,
          });
        }
        return ref;
      }
      case "existing": {
        const updateInfo = value.value.info!;
        await this.updateField({
          fieldRef: updateInfo.fieldRef,
          id: updateInfo.id!,
          value: rawValue,
        });
        return ref;
      }
      case "new": {
        const entity = this.uv.info.mainEntity;
        if (!entity) {
          throw new Error("View doesn't have a main entity");
        }
        if (!this.uv.info.columns[ref.column].mainField) {
          throw new Error("Invalid column number");
        }
        if (rawValue === undefined) {
          throw new Error("Invalid value");
        }

        const id = await this.addNewRow();
        const fieldName = this.uv.info.columns[ref.column].mainField?.name;
        if (fieldName === undefined) {
          throw new Error("Column without mainField");
        }

        await this.setAddedField({
          fieldRef: {
            entity,
            name: fieldName,
          },
          id,
          value: rawValue,
        });
        return { type: "added", id, column: ref.column };
      }
      default:
        throw new NeverError(ref);
    }
  }
}

export type EmptyBaseUserView = BaseUserView<IBaseValueExtra, IBaseRowExtra, IBaseViewExtra>;

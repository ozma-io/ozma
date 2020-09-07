import Vue from "vue";
import { Store } from "vuex";

import { CombinedUserView, IUserViewEventHandler, IRowCommon, ICombinedValue, ICombinedRow, IAddedRow, Entries, newEmptyRow, setUpdatedPun } from "@/state/user_view";
import { AddedRowId } from "@/state/staging_changes";

export interface ILocalRowInfo<RowT> {
  extra: RowT;
}

export interface ILocalRow<ValueT, RowT> extends ILocalRowInfo<RowT> {
  values: ValueT[];
}

export interface IEmptyRow<ValueT, RowT> {
  row: IRowCommon;
  local: ILocalRow<ValueT, RowT>;
}

export interface IHandlerProvider {
  handler: IUserViewEventHandler;
}

export interface IAddedRowRef {
  type: "added";
  id: number;
}

export interface IExistingRowRef {
  type: "existing";
  position: number;
}

export interface INewRowRef {
  type: "new";
}

export interface IAddedValueRef extends IAddedRowRef {
  column: number;
}

export interface IExistingValueRef extends IExistingRowRef {
  column: number;
}

export interface INewValueRef extends INewRowRef {
  column: number;
}

export interface IAddedRowPositionRef {
  type: "added";
  position: number;
}

export interface IExistingRowPositionRef {
  type: "existing";
  position: number;
}

export interface INewRowPositionRef {
  type: "new";
}

export type RowRef = IAddedRowRef | IExistingRowRef | INewRowRef;
export type RowPositionRef = IAddedRowPositionRef | IExistingRowPositionRef | INewRowPositionRef;
export type ValueRef = IAddedValueRef | IExistingValueRef | INewValueRef;

export const equalRowPositionRef = (a: RowPositionRef, b: RowPositionRef) => {
  return a.type === b.type && (a.type !== "new" && a.position === (b as any).position);
};

// This is a class which maintains separate local extra data for each cell, row and instance of a user view.
// After creating register its `handler` with `userView.registerHandler`.
// When no longer needed, unregister its `handler` with `userView.unregisterHandler`.
// Inherit from it and override its public methods.
export abstract class LocalUserView<ValueT, RowT, ViewT> implements IHandlerProvider {
  uv: CombinedUserView;
  rows: ILocalRow<ValueT, RowT>[];
  newRows: Record<AddedRowId, ILocalRow<ValueT, RowT>>;
  extra: ViewT;
  handler: IUserViewEventHandler;
  // Empty (template) row with default values. Used for displaying new empty rows in table, form etc.
  emptyRow: IEmptyRow<ValueT, RowT> | null;

  constructor(store: Store<any>, uv: CombinedUserView, defaultRawValues: Record<string, any>, oldLocal: LocalUserView<ValueT, RowT, ViewT> | null) {
    this.uv = uv;
    this.extra = this.createLocalUserView(oldLocal === null ? null : oldLocal.extra);

    if (uv.rows === null) {
      this.rows = [];
    } else {
      this.rows = uv.rows.map((row, rowI) => {
        const oldLocalRow = oldLocal !== null ? oldLocal.rows[rowI] : undefined;
        const localRow: ILocalRowInfo<RowT> = {
          extra: this.createLocalRow(rowI, row, oldLocalRow !== undefined ? oldLocalRow.extra : null),
        };
        const values = row.values.map((value, colI) => {
          const oldLocalCell = oldLocalRow !== undefined ? oldLocalRow.values[colI] : undefined;
          return this.createLocalValue(rowI, row, localRow, colI, value, oldLocalCell !== undefined ? oldLocalCell : null);
        });

        const localRowMut = localRow as ILocalRow<ValueT, RowT>;
        localRowMut.values = values;

        this.postInitRow(rowI, row, localRowMut);

        return localRowMut;
      });
    }

    this.newRows = Object.fromEntries(Object.entries(uv.newRows).map(([rowIdRaw, row]) => {
      const rowId = Number(rowIdRaw);
      const oldLocalRow = oldLocal !== null ? oldLocal.newRows[rowId] : undefined;
      const newRow = this.createAddedRow(rowId, row, oldLocalRow !== undefined ? oldLocalRow : null);
      return [rowId, newRow];
    }));

    if (uv.info.mainEntity) {
      const row = newEmptyRow(store, uv, defaultRawValues);
      const oldLocalRow = oldLocal !== null ? oldLocal.emptyRow : null;
      const localRow: ILocalRowInfo<RowT> = {
        extra: this.createEmptyLocalRow(row, oldLocalRow !== null ? oldLocalRow.local.extra : null),
      };
      const values = row.values.map((value, colI) => {
        const oldLocalValue = oldLocalRow !== null ? oldLocalRow.local.values[colI] : undefined;
        return this.createEmptyLocalValue(row, localRow, colI, value, oldLocalValue !== undefined ? oldLocalValue : null);
      });

      const localRowMut = localRow as ILocalRow<ValueT, RowT>;
      localRowMut.values = values;

      this.postInitEmptyRow(row, localRowMut);

      this.emptyRow = {
        row,
        local: localRowMut,
      };
    } else {
      this.emptyRow = null;
    }

    this.handler = {
      updateValue: (rowIndex: number, row: ICombinedRow, columnIndex: number, value: ICombinedValue) => {
        const localRow = this.rows[rowIndex];
        this.updateValue(rowIndex, row, localRow, columnIndex, value, localRow.values[columnIndex]);
      },
      updateAddedValue: (rowId: AddedRowId, row: IAddedRow, columnIndex: number, value: ICombinedValue) => {
        const localRow = this.newRows[rowId];
        this.updateAddedValue(rowId, row, localRow, columnIndex, value, localRow.values[columnIndex]);
      },
      deleteRow: (rowIndex: number, row: ICombinedRow) => {
        const localRow = this.rows[rowIndex];
        this.deleteRow(rowIndex, row, localRow);
      },
      undeleteRow: (rowIndex: number, row: ICombinedRow) => {
        const localRow = this.rows[rowIndex];
        this.undeleteRow(rowIndex, row, localRow);
      },
      insertAddedRow: (rowId: AddedRowId, row: IAddedRow) => {
        const localRow = this.createAddedRow(rowId, row, null);
        Vue.set(this.newRows, rowId, localRow);
        this.insertAddedRow(rowId, row, localRow);
      },
      deleteAddedRow: (rowId: AddedRowId, row: IAddedRow) => {
        const localRow = this.newRows[rowId];
        Vue.delete(this.newRows, rowId);
        this.deleteAddedRow(rowId, row, localRow);
      },
      updateSummary: (columnIndex: number, entries: Entries) => {
        const value = this.emptyRow!.row.values[columnIndex];
        setUpdatedPun(entries, value);
        this.updateNewValue(columnIndex, value, this.emptyRow!.local.values[columnIndex]);
      },
    };

    this.postInitUserView();
  }

  // Local data for existing values from database.
  abstract createLocalValue(rowIndex: number, row: ICombinedRow, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue, oldLocal: ValueT | null): ValueT;

  // Local data for added, but not yet commited, values.
  abstract createAddedLocalValue(rowId: AddedRowId, row: IAddedRow, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue, oldLocal: ValueT | null): ValueT;

  // Local data for template values.
  abstract createEmptyLocalValue(row: IRowCommon, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue, oldLocal: ValueT | null): ValueT;

  // Local data for the user view itself.
  abstract createLocalUserView(oldLocal: ViewT | null): ViewT;

  abstract createLocalRow(rowIndex: number, row: ICombinedRow, oldLocal: RowT | null): RowT;

  abstract createAddedLocalRow(rowId: AddedRowId, row: IAddedRow, oldLocal: RowT | null): RowT;

  abstract createEmptyLocalRow(row: IRowCommon, oldLocal: RowT | null): RowT;

  updateValue(rowIndex: number, row: ICombinedRow, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue, localValue: ValueT) {
    return;
  }

  updateAddedValue(rowId: AddedRowId, row: IAddedRow, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue, localValue: ValueT) {
    return;
  }

  updateNewValue(columnIndex: number, value: ICombinedValue, localValue: ValueT) {
    return;
  }

  deleteRow(rowIndex: number, row: ICombinedRow, localRow: ILocalRow<ValueT, RowT>) {
    return;
  }

  undeleteRow(rowIndex: number, row: ICombinedRow, localRow: ILocalRow<ValueT, RowT>) {
    return;
  }

  deleteAddedRow(rowId: AddedRowId, row: IAddedRow, localRow: ILocalRow<ValueT, RowT>) {
    return;
  }

  insertAddedRow(rowId: AddedRowId, row: IAddedRow, localRow: ILocalRow<ValueT, RowT>) {
    return;
  }

  postInitUserView() {
    return;
  }

  postInitRow(rowIndex: number, row: ICombinedRow, localRow: ILocalRowInfo<RowT>) {
    return;
  }

  postInitAddedRow(rowId: AddedRowId, row: IAddedRow, localRow: ILocalRowInfo<RowT>) {
    return;
  }

  postInitEmptyRow(row: IRowCommon, localRow: ILocalRowInfo<RowT>) {
    return;
  }

  getValueByRef(ref: ValueRef) {
    const row = this.getRowByRef(ref);
    if (row === null) {
      return null;
    } else {
      return {
        row,
        value: row.row.values[ref.column],
        local: row.local.values[ref.column],
      };
    }
  }

  getRowByRef(ref: RowRef) {
    if (ref.type === "added") {
      if (!(ref.id in this.uv.newRows)) {
        return null;
      } else {
        return {
          row: this.uv.newRows[ref.id],
          local: this.newRows[ref.id],
        };
      }
    } else if (ref.type === "existing") {
      const rows = this.uv.rows!;
      const row = rows[ref.position];
      if (row.deleted) {
        return null;
      } else {
        return {
          row: rows[ref.position],
          local: this.rows[ref.position],
        };
      }
    } else if (ref.type === "new") {
      return this.emptyRow;
    } else {
      throw new Error("Impossible");
    }
  }

  getRowByPosition(rowRef: RowPositionRef): RowRef | null {
    if (rowRef.type === "added") {
      const id = this.uv.newRowsPositions[rowRef.position];
      if (id === undefined) {
        return null;
      } else {
        return {
          type: "added",
          id: this.uv.newRowsPositions[rowRef.position],
        };
      }
    } else if (rowRef.type === "existing") {
      return rowRef;
    } else if (rowRef.type === "new") {
      return rowRef;
    } else {
      throw new Error("Impossible");
    }
  }

  protected forEachLocalRow(func: (row: ILocalRow<ValueT, RowT>) => void) {
    this.rows.forEach(func);
    Object.values(this.newRows).forEach(func);
    if (this.emptyRow !== null) {
      func(this.emptyRow.local);
    }
  }

  private createAddedRow(rowId: AddedRowId, row: IAddedRow, oldLocalRow: ILocalRow<ValueT, RowT> | null) {
    const newRow: ILocalRowInfo<RowT> = {
      extra: this.createAddedLocalRow(rowId, row, oldLocalRow !== null ? oldLocalRow.extra : null),
    };
    const values = row.values.map((value, colI) => {
      const oldLocalValue = oldLocalRow !== null ? oldLocalRow.values[colI] : undefined;
      return this.createAddedLocalValue(rowId, row, newRow, colI, value, oldLocalValue !== undefined ? oldLocalValue : null);
    });

    const newRowMut = newRow as ILocalRow<ValueT, RowT>;
    newRowMut.values = values;

    this.postInitAddedRow(rowId, row, newRowMut);

    return newRowMut;
  }
}

export abstract class SimpleLocalUserView<ValueT, RowT, ViewT> extends LocalUserView<ValueT, RowT, ViewT> {
  constructor(store: Store<any>, uv: CombinedUserView, defaultRawValues: Record<string, any>, oldLocal: LocalUserView<ValueT, RowT, ViewT> | null) {
    super(store, uv, defaultRawValues, oldLocal);
  }

  abstract createCommonLocalValue(row: IRowCommon, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue, oldLocal: ValueT | null): ValueT;

  createLocalValue(rowIndex: number, row: ICombinedRow, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue, oldLocal: ValueT | null): ValueT {
    return this.createCommonLocalValue(row, localRow, columnIndex, value, oldLocal);
  }

  createAddedLocalValue(rowId: AddedRowId, row: IAddedRow, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue, oldLocal: ValueT | null): ValueT {
    return this.createCommonLocalValue(row, localRow, columnIndex, value, oldLocal);
  }

  createEmptyLocalValue(row: IRowCommon, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue, oldLocal: ValueT | null): ValueT {
    return this.createCommonLocalValue(row, localRow, columnIndex, value, oldLocal);
  }

  abstract createCommonLocalRow(row: IRowCommon, oldLocal: RowT | null): RowT;

  createLocalRow(rowIndex: number, row: ICombinedRow, oldLocal: RowT | null): RowT {
    return this.createCommonLocalRow(row, oldLocal);
  }

  createAddedLocalRow(rowId: AddedRowId, row: IAddedRow, oldLocal: RowT | null): RowT {
    return this.createCommonLocalRow(row, oldLocal);
  }

  createEmptyLocalRow(row: IRowCommon, oldLocal: RowT | null): RowT {
    return this.createCommonLocalRow(row, oldLocal);
  }

  updateCommonValue(row: IRowCommon, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue, localValue: ValueT) {
    return;
  }

  updateValue(rowIndex: number, row: ICombinedRow, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue, localValue: ValueT) {
    this.updateCommonValue(row, localRow, columnIndex, value, localValue);
  }

  updateAddedValue(rowId: AddedRowId, row: IAddedRow, localRow: ILocalRowInfo<RowT>, columnIndex: number, value: ICombinedValue, localValue: ValueT) {
    this.updateCommonValue(row, localRow, columnIndex, value, localValue);
  }

  updateNewValue(columnIndex: number, value: ICombinedValue, localValue: ValueT) {
    this.updateCommonValue(this.emptyRow!.row, this.emptyRow!.local, columnIndex, value, localValue);
  }

  deleteCommonRow(row: IRowCommon, localRow: ILocalRow<ValueT, RowT>) {
    return;
  }

  deleteRow(rowIndex: number, row: ICombinedRow, localRow: ILocalRow<ValueT, RowT>) {
    this.deleteCommonRow(row, localRow);
  }

  deleteAddedRow(rowId: AddedRowId, row: IAddedRow, localRow: ILocalRow<ValueT, RowT>) {
    this.deleteCommonRow(row, localRow);
  }

  postInitCommonRow(row: IRowCommon, localRow: ILocalRowInfo<RowT>) {
    return;
  }

  postInitRow(rowIndex: number, row: ICombinedRow, localRow: ILocalRowInfo<RowT>) {
    this.postInitCommonRow(row, localRow);
  }

  postInitAddedRow(rowId: AddedRowId, row: IAddedRow, localRow: ILocalRowInfo<RowT>) {
    this.postInitCommonRow(row, localRow);
  }

  postInitEmptyRow(row: IRowCommon, localRow: ILocalRowInfo<RowT>) {
    this.postInitCommonRow(row, localRow);
  }
}

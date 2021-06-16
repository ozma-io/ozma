import Vue from "vue";
import { Store } from "vuex";
import moment, { MomentInput } from "moment";
import { IExecutedValue, IColumnField, IFieldRef, RowId, AttributesMap, IExecutedRow, SchemaName, EntityName, FieldName, UserViewSource, IResultViewInfo, AttributeName, FieldType, IEntityRef,
  ValueType } from "ozma-api";
import { AddedRowId, IAddedEntry, IEntityChanges, IStagingEventHandler, IStagingState } from "@/state/staging_changes";
import { mapMaybe, tryDicts } from "@/utils";
import { equalEntityRef, IUpdatedValue, valueFromRaw, valueIsNull, valueToText } from "@/values";
import { Entries, IEntriesState } from "@/state/entries";

import { IEntitiesState } from "../state/entities";

export interface IValueInfo {
  field: IColumnField | null;
  fieldRef: IFieldRef;
  // Doesn't exist for added entries.
  id?: RowId;
}

export interface ICombinedValue extends IExecutedValue {
  // `undefined` here means that value didn't pass validation
  value: unknown;
  // See `values.ts` for explanation of this. The idea is to use `rawValue` everywhere when it's defined,
  // unless you need validated value.
  // Even better, use `currentValue()`.
  rawValue?: unknown;
  initialValue?: unknown;
  // `undefined` is used when pun is not yet resolved, to avoid adding/removing values.
  pun?: string | null | undefined;
  initialPun?: string;
  info?: IValueInfo;
}

export interface IExtendedValue<ValueT> extends ICombinedValue {
  extra: ValueT;
}

export interface IRowCommon {
  values: ICombinedValue[];
  attributes?: AttributesMap;
}

export interface ICombinedRow extends IExecutedRow, IRowCommon {
  values: ICombinedValue[];
  oldAddedId?: AddedRowId;
  deleted: boolean;
}

export interface IExtendedRowInfo<RowT> {
  extra: RowT;
}

export interface IExtendedRowCommon<ValueT, RowT> extends IRowCommon, IExtendedRowInfo<RowT> {
  values: IExtendedValue<ValueT>[];
}

export interface IExtendedRow<ValueT, RowT> extends IExtendedRowCommon<ValueT, RowT>, ICombinedRow {
  values: IExtendedValue<ValueT>[];
}

export interface IAddedRow extends IRowCommon {
  deleted: boolean;
}

export interface IExtendedAddedRow<ValueT, RowT> extends IExtendedRowCommon<ValueT, RowT>, IAddedRow {
  values: IExtendedValue<ValueT>[];
  // New id if value has been committed.
  newId?: RowId;
}

export type IEmptyRow<ValueT, RowT> = IExtendedRowCommon<ValueT, RowT>;

export type RowPosition = number;
export type ColumnPosition = number;

/* References */

export interface IAddedRowRef {
  type: "added";
  id: AddedRowId;
}

export interface IExistingRowRef {
  type: "existing";
  position: RowPosition;
}

export interface INewRowRef {
  type: "new";
}

export interface IAddedValueRef extends IAddedRowRef {
  column: ColumnPosition;
}

export interface IExistingValueRef extends IExistingRowRef {
  column: ColumnPosition;
}

export interface INewValueRef extends INewRowRef {
  column: ColumnPosition;
}

export type CommittedValueRef = IAddedValueRef | IExistingValueRef;
export type CommittedRowRef = IAddedRowRef | IExistingRowRef;

// Mapping from record ids to user view value refs.
export type IUpdateMapping = Record<SchemaName, Record<EntityName, Record<RowId, Record<FieldName, CommittedValueRef[]>>>>;
// Mapping from fields to column indices with main field.
export type IMainColumnMapping = Record<FieldName, number[]>;
// Mapping from main entity ids to row indices.
export type IMainRowMapping = Record<RowId, CommittedRowRef[]>;

export type RowRef = IAddedRowRef | IExistingRowRef | INewRowRef;
export type ValueRef = IAddedValueRef | IExistingValueRef | INewValueRef;

export interface IUserViewArguments {
  source: UserViewSource;
  args: Record<string, unknown> | null;
}

/* Utility functions. */

export const rowKey = (ref: RowRef): unknown => {
  if (ref.type === "existing") {
    return ref.position;
  } else if (ref.type === "added") {
    return `added-${ref.id}`;
  } else if (ref.type === "new") {
    return "new";
  } else {
    throw new Error("Impossible");
  }
};

// These are not expected to be run after initialization ends, hence we don't use `Vue.set`.
const insertUpdateMapping = (updateMapping: IUpdateMapping, ref: IFieldRef, id: RowId, valueRef: CommittedValueRef) => {
  let entitiesMapping = updateMapping[ref.entity.schema];
  if (entitiesMapping === undefined) {
    entitiesMapping = {};
    updateMapping[ref.entity.schema] = entitiesMapping;
  }
  let rowsMapping = entitiesMapping[ref.entity.name];
  if (rowsMapping === undefined) {
    rowsMapping = {};
    entitiesMapping[ref.entity.name] = rowsMapping;
  }

  let fieldsMapping = rowsMapping[id];
  if (fieldsMapping === undefined) {
    fieldsMapping = {};
    rowsMapping[id] = fieldsMapping;
  }

  let valuesMapping = fieldsMapping[ref.name];
  if (valuesMapping === undefined) {
    valuesMapping = [];
    fieldsMapping[ref.name] = valuesMapping;
  }

  valuesMapping.push(valueRef);
};

const insertMainColumnMapping = (mainColumnMapping: IMainColumnMapping, name: FieldName, columnIndex: number) => {
  let colsMapping = mainColumnMapping[name];
  if (colsMapping === undefined) {
    colsMapping = [];
    mainColumnMapping[name] = colsMapping;
  }

  colsMapping.push(columnIndex);
};

const insertMainRowMapping = (mainRowMapping: IMainRowMapping, id: RowId, rowRef: CommittedRowRef) => {
  let rowsMapping = mainRowMapping[id];
  if (rowsMapping === undefined) {
    rowsMapping = [];
    mainRowMapping[id] = rowsMapping;
  }

  rowsMapping.push(rowRef);
};

const vueInsertUpdateMapping = (updateMapping: IUpdateMapping, ref: IFieldRef, id: RowId, valueRef: CommittedValueRef) => {
  let entitiesMapping = updateMapping[ref.entity.schema];
  if (entitiesMapping === undefined) {
    entitiesMapping = {};
    Vue.set(updateMapping, ref.entity.schema, entitiesMapping);
  }
  let rowsMapping = entitiesMapping[ref.entity.name];
  if (rowsMapping === undefined) {
    rowsMapping = {};
    Vue.set(entitiesMapping, ref.entity.name, rowsMapping);
  }

  let fieldsMapping = rowsMapping[id];
  if (fieldsMapping === undefined) {
    fieldsMapping = {};
    Vue.set(rowsMapping, id, fieldsMapping);
  }

  let valuesMapping = fieldsMapping[ref.name];
  if (valuesMapping === undefined) {
    valuesMapping = [];
    Vue.set(fieldsMapping, ref.name, valuesMapping);
  }

  valuesMapping.push(valueRef);
};

const vueInsertMainRowMapping = (mainRowMapping: IMainRowMapping, id: RowId, rowRef: CommittedRowRef) => {
  let rowsMapping = mainRowMapping[id];
  if (rowsMapping === undefined) {
    rowsMapping = [];
    Vue.set(mainRowMapping, id, rowsMapping);
  }

  rowsMapping.push(rowRef);
};

const setUpdatedPun = (summaries: Entries, value: ICombinedValue, ref: number) => {
  const pun = summaries[ref];
  if (pun === undefined) {
    value.pun = null;
  } else {
    value.pun = pun;
  }
};

const clearUpdatedValue = (value: ICombinedValue) => {
  console.assert(value.initialValue !== undefined);
  value.value = value.initialValue;
  if ("pun" in value) {
    console.assert(value.initialPun !== undefined);
    value.pun = value.initialPun;
  }
  if ("rawValue" in value) {
    value.rawValue = value.value;
  }
};

export const currentValue = (value: ICombinedValue) => "rawValue" in value ? value.rawValue : value.value;

export const homeSchema = (args: IUserViewArguments): SchemaName | null => {
  if (args.source.type === "named") {
    return args.source.ref.schema;
  } else {
    return null;
  }
};

export const valueToPunnedText = (valueType: ValueType, value: ICombinedValue): string => {
  if (value.pun !== undefined && value.pun !== null) {
    return value.pun;
  } else {
    return valueToText(valueType, currentValue(value));
  }
};

export interface ICombinedUserView<ValueT, RowT, ViewT> extends IStagingEventHandler {
  readonly args: IUserViewArguments;
  readonly homeSchema: SchemaName | null;
  readonly info: IResultViewInfo;
  readonly attributes: Record<AttributeName, unknown>;
  readonly columnAttributes: Record<AttributeName, unknown>[];
  readonly rows: IExtendedRow<ValueT, RowT>[] | null;
  // Rows added by user, not yet committed to the database.
  readonly newRows: Record<AddedRowId, IExtendedAddedRow<ValueT, RowT>>;
  readonly newRowsOrder: AddedRowId[];
  readonly updateMapping: IUpdateMapping;
  readonly mainColumnMapping: IMainColumnMapping;
  readonly mainRowMapping: IMainRowMapping;
  readonly extra: ViewT;
  // Empty (template) row with default values. Used for displaying new empty rows in table, form etc.
  readonly emptyRow: IEmptyRow<ValueT, RowT> | null;
  readonly oldCommittedRows: Record<AddedRowId, RowPosition>;
  readonly entries: Record<SchemaName, Record<EntityName, Entries>>;

  trackAddedEntry(id: AddedRowId, meta?: unknown): void;
  getValueByRef(ref: ValueRef): { value: IExtendedValue<ValueT>; row: IExtendedRowCommon<ValueT, RowT> } | undefined;
  getRowByRef(ref: RowRef): IExtendedRowCommon<ValueT, RowT> | undefined;

  forEachRow(func: (row: IExtendedRowCommon<ValueT, RowT>, ref: RowRef) => void): void;
  mapRows<A>(func: (row: IExtendedRowCommon<ValueT, RowT>, ref: RowRef) => A): A[];
  forEachVisibleRow(func: (row: IExtendedRowCommon<ValueT, RowT>, ref: RowRef) => void): void;
  mapVisibleRows<A>(func: (row: IExtendedRowCommon<ValueT, RowT>, ref: RowRef) => A): A[];
}

export type ICombinedUserViewT<T> = T extends IUserViewHandler<infer ValueT, infer RowT, infer ViewT> ? ICombinedUserView<ValueT, RowT, ViewT> : never;
export type ICombinedUserViewAny = ICombinedUserView<any, any, any>;

export interface IUserViewHandler<ValueT, RowT, ViewT> {
  // The contract for `create` and `postInit` functions is:
  // *. All fields in CombinedUserView are already assigned _except_ `extra`;
  // *. There is no guarantee any of `extra` fields exists.

  // Local data for existing values from database.
  createLocalValue(
    uv: ICombinedUserView<ValueT, RowT, ViewT>,
    rowIndex: RowPosition,
    row: ICombinedRow & IExtendedRowInfo<RowT>,
    columnIndex: ColumnPosition,
    value: ICombinedValue,
    oldView: ViewT | null,
    oldRow: RowT | null,
    oldValue: ValueT | null,
  ): ValueT;
  // Local data for added, but not yet committed, values.
  createAddedLocalValue(
    uv: ICombinedUserView<ValueT, RowT, ViewT>,
    rowId: AddedRowId,
    row: IAddedRow & IExtendedRowInfo<RowT>,
    columnIndex: ColumnPosition,
    value: ICombinedValue,
    oldView: ViewT | null,
    oldRow: RowT | null,
    oldValue: ValueT | null,
    meta?: unknown,
  ): ValueT;
  // Local data for template values.
  createEmptyLocalValue(
    uv: ICombinedUserView<ValueT, RowT, ViewT>,
    row: IRowCommon & IExtendedRowInfo<RowT>,
    columnIndex: ColumnPosition,
    value: ICombinedValue,
    oldView: ViewT | null,
    oldRow: RowT | null,
    oldValue: ValueT | null,
  ): ValueT;
  // Local data for the user view itself.
  createLocalUserView(uv: ICombinedUserView<ValueT, RowT, ViewT>, oldView: ViewT | null): ViewT;
  createLocalRow(uv: ICombinedUserView<ValueT, RowT, ViewT>, rowIndex: RowPosition, row: ICombinedRow, oldView: ViewT | null, oldRow: RowT | null): RowT;
  createAddedLocalRow(uv: ICombinedUserView<ValueT, RowT, ViewT>, rowId: AddedRowId, row: IAddedRow, oldView: ViewT | null, oldRow: RowT | null, meta?: unknown): RowT;
  createEmptyLocalRow(uv: ICombinedUserView<ValueT, RowT, ViewT>, row: IRowCommon, oldView: ViewT | null, oldRow: RowT | null): RowT;

  updateValue(uv: ICombinedUserView<ValueT, RowT, ViewT>, rowIndex: RowPosition, row: IExtendedRow<ValueT, RowT>, columnIndex: ColumnPosition, value: IExtendedValue<ValueT>, meta?: unknown): void;
  updateAddedValue(uv: ICombinedUserView<ValueT, RowT, ViewT>, rowId: AddedRowId, row: IExtendedAddedRow<ValueT, RowT>, columnIndex: ColumnPosition, value: IExtendedValue<ValueT>, meta?: unknown): void;
  updateEmptyValue(uv: ICombinedUserView<ValueT, RowT, ViewT>, columnIndex: number, value: IExtendedValue<ValueT>): void;
  deleteRow(uv: ICombinedUserView<ValueT, RowT, ViewT>, rowIndex: RowPosition, row: IExtendedRow<ValueT, RowT>, meta?: unknown): void;
  undeleteRow(uv: ICombinedUserView<ValueT, RowT, ViewT>, rowIndex: RowPosition, row: IExtendedRow<ValueT, RowT>, meta?: unknown): void;
  deleteAddedRow(uv: ICombinedUserView<ValueT, RowT, ViewT>, rowId: AddedRowId, row: IExtendedAddedRow<ValueT, RowT>, meta?: unknown): void;
  // Can happen when committed row is deleted.
  undeleteAddedRow(uv: ICombinedUserView<ValueT, RowT, ViewT>, rowId: AddedRowId, row: IExtendedAddedRow<ValueT, RowT>, meta?: unknown): void;
  postInitUserView(uv: ICombinedUserView<ValueT, RowT, ViewT>): void;
  postInitRow(uv: ICombinedUserView<ValueT, RowT, ViewT>, rowIndex: RowPosition, row: IExtendedRow<ValueT, RowT>, meta?: unknown): void;
  postInitAddedRow(uv: ICombinedUserView<ValueT, RowT, ViewT>, rowId: AddedRowId, row: IExtendedAddedRow<ValueT, RowT>, meta?: unknown): void;
  postInitEmptyRow(uv: ICombinedUserView<ValueT, RowT, ViewT>, row: IEmptyRow<ValueT, RowT>): void;
  // Called when commit happens; from this point, the row is considered "committed" -- it's already in the database,
  // but we don't have updated user view rows yet, just that it's there somewhere.
  // In reloaded user views one can detect previously committed rows by checking `row.oldAddedId` field in existing rows.
  commitAddedRow(uv: ICombinedUserView<ValueT, RowT, ViewT>, rowId: AddedRowId, row: IExtendedAddedRow<ValueT, RowT>): void;
}

export interface ICombinedUserViewDataParams {
  args: IUserViewArguments;
  info: IResultViewInfo;
  attributes: Record<AttributeName, unknown>;
  columnAttributes: Record<AttributeName, unknown>[];
  rows: IExecutedRow[] | null;
}

export interface ICombinedUserViewParams<T> extends ICombinedUserViewDataParams {
  store: Store<any>;
  defaultRawValues: Record<string, any>;
  oldLocal: ICombinedUserViewT<T> | null;
  handler: T;
}

// This is a class which maintains separate local extra data for each cell, row and instance of a user view.
// After creating register its `handler` with `userView.registerHandler`.
// When no longer needed, unregister its `handler` with `userView.unregisterHandler`.
// Inherit from it and override its public methods.
export class CombinedUserView<T extends IUserViewHandler<ValueT, RowT, ViewT>, ValueT, RowT, ViewT> implements ICombinedUserView<ValueT, RowT, ViewT> {
  args: IUserViewArguments;
  homeSchema: SchemaName | null;
  info: IResultViewInfo;
  attributes: Record<AttributeName, unknown>;
  columnAttributes: Record<AttributeName, unknown>[];
  rows: IExtendedRow<ValueT, RowT>[] | null;
  // Rows added by user, not yet commited to the database.
  newRows: Record<AddedRowId, IExtendedAddedRow<ValueT, RowT>>;
  // This exists _only_ for two types of queries:
  // 1. New rows in their insertion order;
  // 2. Total number of new rows.
  // User views should maintain their own specific data structures for other ordering.
  newRowsOrder: AddedRowId[];
  // oldAddedId => row position.
  oldCommittedRows: Record<AddedRowId, RowPosition>;
  updateMapping: IUpdateMapping;
  mainColumnMapping: IMainColumnMapping;
  mainRowMapping: IMainRowMapping;
  extra: ViewT;
  // Empty (template) row with default values. Used for displaying new empty rows in table, form etc.
  emptyRow: IEmptyRow<ValueT, RowT> | null;
  store: Store<any>;
  // Cache of entries records. We get old cache from a previous user view and use it if no entries
  // are available yet during initialization.
  entries: Record<SchemaName, Record<EntityName, Entries>>;
  handler: T;

  // Warning: it takes ownership of all params and mutates!
  constructor(params: ICombinedUserViewParams<T>) {
    const { oldLocal } = params;
    this.store = params.store;
    this.handler = params.handler;
    this.args = params.args;
    this.info = params.info;
    this.attributes = params.attributes;
    this.columnAttributes = params.columnAttributes;
    this.homeSchema = homeSchema(this.args);
    this.oldCommittedRows = {};

    this.entries = {};
    if (oldLocal) {
      for (const [schemaName, oldSchema] of Object.entries(oldLocal.entries)) {
        const schema: Record<EntityName, Entries> = {};
        this.entries[schemaName] = schema;
        for (const [entityName, oldEntries] of Object.entries(oldSchema)) {
          schema[entityName] = oldEntries;
        }
      }
    }

    this.mainColumnMapping = this.makeMainColumnMapping();
    // We pretend these are extended rows already and assign them in.
    // This is unsafe, and we know that.
    this.rows = params.rows ? this.massageCurrentRows(params.rows, oldLocal) as IExtendedRow<ValueT, RowT>[] : null;
    this.mainRowMapping = this.makeMainRowMapping();
    this.updateMapping = this.makeUpdateMapping();

    this.newRows = {};
    this.newRowsOrder = [];
    const mainEntity = this.info.mainEntity;
    if (oldLocal && mainEntity) {
      const myAdded = this.storeChanges.changes[mainEntity.schema]?.[mainEntity.name]?.added;
      for (const addedId of oldLocal.newRowsOrder) {
        const newValues = myAdded?.[addedId];
        if (newValues) {
          this.pushAddedEntry(addedId, newValues);
        }
      }
    }

    this.emptyRow = this.makeEmptyRow(params.defaultRawValues) as IEmptyRow<ValueT, RowT> | null;

    if (oldLocal) {
      for (const [rawAddedId, row] of Object.entries(oldLocal.newRows)) {
        if (row.newId === undefined) {
          continue;
        }
        // We are sure there are only existing rows there right now.
        const newRows = this.mainRowMapping[row.newId] as IExistingRowRef[];
        if (!newRows) {
          continue;
        }
        const addedId = Number(rawAddedId);
        for (const newRow of newRows) {
          // Set old added ids.
          this.rows![newRow.position].oldAddedId = addedId;
          if (!(addedId in this.oldCommittedRows)) {
            this.oldCommittedRows[addedId] = newRow.position;
          }
        }
      }
    }

    this.extra = this.handler.createLocalUserView(this, oldLocal?.extra ?? null);

    if (this.rows) {
      const oldViewExtra = oldLocal?.extra ?? null;
      const mainRowOffsets: Record<RowId, number> | null = (this.info.mainEntity && oldLocal?.info.mainEntity && equalEntityRef(this.info.mainEntity, oldLocal.info.mainEntity)) ? {} : null;
      this.rows.forEach((row, rowI) => {
        let oldRow: IExtendedRowCommon<ValueT, RowT> | undefined;
        if (row.oldAddedId !== undefined) {
          oldRow = oldLocal!.newRows[row.oldAddedId];
        } else if (mainRowOffsets) {
          const oldMapping = oldLocal!.mainRowMapping[row.mainId!];
          if (oldMapping) {
            const offset = mainRowOffsets[row.mainId!] ?? 0;
            // We dealt with committed rows in `oldAddedId` branch.
            const oldRowRef = oldMapping[offset] as IExistingRowRef;
            if (oldRowRef) {
              oldRow = oldLocal!.rows![oldRowRef.position];
              mainRowOffsets[row.mainId!] = offset + 1;
            }
          }
        } else {
          oldRow = oldLocal?.rows?.[rowI];
        }
        const oldRowExtra = oldRow?.extra ?? null;
        row.extra = this.handler.createLocalRow(this, rowI, row, oldViewExtra, oldRowExtra);
        row.values.forEach((value, colI) => {
          const oldValue = oldRow?.values[colI];
          value.extra = this.handler.createLocalValue(this, rowI, row, colI, value, oldViewExtra, oldRowExtra, oldValue?.extra ?? null);
        });
        this.handler.postInitRow(this, rowI, row);
      });
    }

    for (const addedId of this.newRowsOrder) {
      const row = this.newRows[addedId];
      const oldViewExtra = oldLocal!.extra;
      const oldRow = oldLocal!.newRows[addedId];
      row.extra = this.handler.createAddedLocalRow(this, addedId, row, oldViewExtra, oldRow.extra);
      row.values.forEach((value, colI) => {
        value.extra = this.handler.createAddedLocalValue(this, addedId, row, colI, value, oldViewExtra, oldRow.extra, oldRow.values[colI].extra);
      });
      this.handler.postInitAddedRow(this, addedId, row);
    }

    if (this.emptyRow) {
      const oldRow = oldLocal?.emptyRow;
      const oldViewExtra = oldLocal?.extra ?? null;
      const oldRowExtra = oldRow?.extra ?? null;
      this.emptyRow.extra = this.handler.createEmptyLocalRow(this, this.emptyRow, oldViewExtra, oldRowExtra);
      this.emptyRow.values.forEach((value, colI) => {
        const oldValue = oldRow?.values[colI];
        value.extra = this.handler.createEmptyLocalValue(this, this.emptyRow!, colI, value, oldViewExtra, oldRowExtra, oldValue?.extra ?? null);
      });
      this.handler.postInitEmptyRow(this, this.emptyRow);
    }

    this.handler.postInitUserView(this);

    this.prefetchUserViewInfo();
  }

  private get storeEntities() {
    return (this.store.state.entities as IEntitiesState).current;
  }

  private get storeEntries() {
    return (this.store.state.entries as IEntriesState).current;
  }

  private get storeChanges() {
    return (this.store.state.staging as IStagingState).current;
  }

  updateField(fieldRef: IFieldRef, id: RowId, updatedValue: IUpdatedValue, meta?: unknown) {
    const fieldType = this.storeEntities.getEntity(fieldRef.entity)?.columnFields[fieldRef.name].fieldType;

    if (this.rows === null) {
      return;
    }

    const updatedValues = this.updateMapping[fieldRef.entity.schema]?.[fieldRef.entity.name]?.[id]?.[fieldRef.name];
    if (updatedValues === undefined) {
      return;
    }

    updatedValues.forEach(valueRef => {
      if (valueRef.type === "existing") {
        const row = this.rows![valueRef.position];
        // New object because otherwise Vue won't detect changes.
        const value: IExtendedValue<ValueT> = { ...row.values[valueRef.column], ...updatedValue };
        Vue.set(row.values, valueRef.column, value);
        if (fieldType) {
          this.setOrRequestUpdatedPun(value, fieldType, newValue => {
            this.handler.updateValue(this, valueRef.position, row, valueRef.column, newValue, meta);
          });
        }
        this.handler.updateValue(this, valueRef.position, row, valueRef.column, value, meta);
      } else if (valueRef.type === "added") {
        const row = this.newRows[valueRef.id];
        const value: IExtendedValue<ValueT> = { ...row.values[valueRef.column], ...updatedValue };
        Vue.set(row.values, valueRef.column, value);
        if (fieldType) {
          this.setOrRequestUpdatedPun(value, fieldType, newValue => {
            this.handler.updateAddedValue(this, valueRef.id, row, valueRef.column, newValue, meta);
          });
        }
        this.handler.updateAddedValue(this, valueRef.id, row, valueRef.column, value, meta);
      } else {
        throw new Error("Impossible");
      }
    });
  }

  addEntry(entityRef: IEntityRef, id: AddedRowId) {
    // We await for our parent to insert entry with position instead.
  }

  private pushAddedEntry(id: AddedRowId, newValues: IAddedEntry, meta?: unknown): IAddedRow {
    const eref = this.info.mainEntity!;

    // We expect it to be filled with `extra` later. This is unsafe!
    const row = {
      deleted: false,
    } as IAddedRow;

    row.values = this.info.columns.map((column, colI) => {
      if (column.mainField) {
        const updateInfo = {
          field: column.mainField.field,
          fieldRef: {
            entity: eref,
            name: column.mainField.name,
          },
        };

        const updatedValue = newValues.values[column.mainField.name];
        if (updatedValue === undefined) {
          const value = updateInfo.field.isNullable ? null : undefined;
          const result: ICombinedValue = {
            value,
            rawValue: undefined,
            info: updateInfo,
          };
          if (updateInfo.field.fieldType.type === "reference") {
            result.pun = "";
          }
          return result;
        } else {
          const result: ICombinedValue = {
            ...updatedValue,
            info: updateInfo,
          };
          this.setOrRequestUpdatedPun(result, updateInfo.field.fieldType, newValue => {
            this.handler.updateAddedValue(this, id, row as IExtendedAddedRow<ValueT, RowT>, colI, newValue as IExtendedValue<ValueT>, meta);
          });
          return result;
        }
      } else {
        return {
          value: undefined,
        };
      }
    });

    Vue.set(this.newRows, id, row);
    this.newRowsOrder.push(id);
    return row;
  }

  trackAddedEntry(id: AddedRowId, meta?: unknown) {
    const eref = this.info.mainEntity;
    if (!eref) {
      throw new Error("Impossible");
    }

    const newValues = this.storeChanges.changes[eref.schema][eref.name].added[id];
    const row = this.pushAddedEntry(id, newValues, meta) as IExtendedAddedRow<ValueT, RowT>;
    Vue.set(row, "extra", this.handler.createAddedLocalRow(this, id, row, null, null, meta));
    row.values.forEach((value, colI) => {
      Vue.set(value, "extra", this.handler.createAddedLocalValue(this, id, row, colI, value, null, null, null, meta));
    });
    this.handler.postInitAddedRow(this, id, row, meta);
  }

  commitAddedEntry(entityRef: IEntityRef, id: AddedRowId, newId: RowId) {
    const newRow = this.newRows[id];
    if (!newRow) {
      return;
    }

    Vue.set(newRow, "newId", newId);

    newRow.values.forEach((value, colI) => {
      if (!value.info) {
        return;
      }

      value.info.id = newId;
      Vue.set(value, "initialValue", value.value);

      const fieldRef = value.info.fieldRef;
      const valueRef: IAddedValueRef = {
        type: "added",
        id,
        column: colI,
      };
      vueInsertUpdateMapping(this.updateMapping, fieldRef, newId, valueRef);
    });
    const rowRef: IAddedRowRef = {
      type: "added",
      id,
    };
    vueInsertMainRowMapping(this.mainRowMapping, newId, rowRef);

    this.handler.commitAddedRow(this, id, newRow);
  }

  setAddedField(fieldRef: IFieldRef, id: AddedRowId, updatedValue: IUpdatedValue, meta?: unknown) {
    const newRow = this.newRows[id];
    if (!newRow) {
      return;
    }

    const fieldType = this.storeEntities.getEntity(fieldRef.entity)?.columnFields[fieldRef.name].fieldType;
    this.mainColumnMapping[fieldRef.name].forEach(colI => {
      // New object because otherwise Vue won't detect changes.
      const value: IExtendedValue<ValueT> = { ...newRow.values[colI], ...updatedValue };
      Vue.set(newRow.values, colI, value);
      if (fieldType) {
        this.setOrRequestUpdatedPun(value, fieldType, newValue => {
          this.handler.updateAddedValue(this, id, newRow, colI, newValue, meta);
        });
      }
      this.handler.updateAddedValue(this, id, newRow, colI, value, meta);
    });
  }

  deleteEntry(entityRef: IEntityRef, id: RowId, meta?: unknown) {
    if (!this.info.mainEntity || !equalEntityRef(this.info.mainEntity, entityRef)) {
      return;
    }

    const deletedRows = this.mainRowMapping[id];
    if (deletedRows === undefined) {
      return;
    }
    deletedRows.forEach(ref => {
      if (ref.type === "existing") {
        const row = this.rows![ref.position];
        row.deleted = true;
        this.handler.deleteRow(this, ref.position, row, meta);
      } else if (ref.type === "added") {
        // Happens when committed value got deleted.
        const row = this.newRows[ref.id];
        row.deleted = true;
        this.handler.deleteAddedRow(this, ref.id, row, meta);
      }
    });
  }

  resetUpdatedField(fieldRef: IFieldRef, id: RowId, meta?: unknown) {
    if (this.rows === null) {
      return;
    }

    const updatedValues = this.updateMapping[fieldRef.entity.schema]?.[fieldRef.entity.name]?.[id]?.[fieldRef.name];
    if (updatedValues === undefined) {
      return;
    }

    updatedValues.forEach(valueRef => {
      if (valueRef.type === "existing") {
        const row = this.rows![valueRef.position];
        const value = row.values[valueRef.column];
        clearUpdatedValue(value);
        this.handler.updateValue(this, valueRef.position, row, valueRef.column, value, meta);
      } else if (valueRef.type === "added") {
        const row = this.newRows[valueRef.id];
        const value = row.values[valueRef.column];
        clearUpdatedValue(value);
        this.handler.updateAddedValue(this, valueRef.id, row, valueRef.column, value, meta);
      } else {
        throw new Error("Impossible");
      }
    });
  }

  resetAddedEntry(entityRef: IEntityRef, id: AddedRowId, meta?: unknown) {
    const newRow = this.newRows[id];
    if (!newRow) {
      return;
    }

    const row = this.newRows[id];
    const pos = this.newRowsOrder.indexOf(id);
    if (pos < 0) {
      throw new Error("Impossible");
    }
    this.newRowsOrder.splice(pos, 1);
    Vue.delete(this.newRows, id);
    this.handler.deleteAddedRow(this, id, row, meta);
  }

  resetDeleteEntry(entityRef: IEntityRef, id: RowId, meta?: unknown) {
    if (!this.info.mainEntity || !equalEntityRef(this.info.mainEntity, entityRef)) {
      return;
    }

    const deletedRows = this.mainRowMapping[id];
    if (deletedRows === undefined) {
      return;
    }
    deletedRows.forEach(ref => {
      if (ref.type === "existing") {
        const row = this.rows![ref.position];
        row.deleted = false;
        this.handler.undeleteRow(this, ref.position, row, meta);
      } else if (ref.type === "added") {
        // Happens when committed value got undeleted.
        const row = this.newRows[ref.id];
        row.deleted = false;
        this.handler.undeleteAddedRow(this, ref.id, row, meta);
      }
    });
  }

  private insertEntries(entityRef: IEntityRef, entries: Entries) {
    let schemaEntries = this.entries[entityRef.schema];
    if (!schemaEntries) {
      schemaEntries = {};
      Vue.set(this.entries, entityRef.schema, schemaEntries);
    }
    Vue.set(schemaEntries, entityRef.name, entries);
  }

  private setPunFromCache<TValue extends ICombinedValue>(value: TValue, entityRef: IEntityRef, ref: number) {
    const summaries = this.entries[entityRef.schema]?.[entityRef.name];
    if (summaries) {
      setUpdatedPun(summaries, value, ref);
    } else {
      value.pun = null;
    }
  }

  // Sets `null` when there's no pun. Sets `undefined` when pun cannot be resolved now.
  private setOrRequestUpdatedPun<TValue extends ICombinedValue>(value: TValue, fieldType: FieldType, delayedUpdateValue: (nextValue: TValue) => void) {
    const ref = currentValue(value) as number | null;

    if (fieldType.type !== "reference") {
      return;
    }

    if (valueIsNull(ref)) {
      value.pun = "";
      return;
    }

    const entriesRef = {
      field: value.info!.fieldRef,
      rowId: null,
    };

    const summaries = this.storeEntries.entries.get(entriesRef);

    if (summaries !== undefined && ref in summaries.entries) {
      this.insertEntries(fieldType.entity, summaries.entries);
      setUpdatedPun(summaries.entries, value, ref);
    } else {
      void (async () => {
        try {
          const puns = await this.store.dispatch("entries/getEntriesByIds", { ref: entriesRef, reference: "update", ids: [ref] }) as Record<RowId, string>;
          const pending = puns[ref];
          if (pending !== undefined) {
            value.pun = pending;
          } else {
            value.pun = null;
          }
        } catch (e) {
          this.setPunFromCache(value, fieldType.entity, ref);
        }
        delayedUpdateValue(value);
      })();
    }
  }

  private makeEmptyRow(defaultRawValues: Record<string, unknown>): IRowCommon | null {
    const eref = this.info.mainEntity;
    if (!eref) {
      return null;
    }

    const values = this.info.columns.map((info, colI) => {
      const columnAttrs = this.columnAttributes[colI];
      const viewAttrs = this.attributes;
      const getColumnAttr = (name: string) => tryDicts(name, columnAttrs, viewAttrs);

      if (info.mainField) {
        let rawDefaultValue: unknown;
        if (info.mainField.name in defaultRawValues) {
          rawDefaultValue = defaultRawValues[info.mainField.name];
        } else {
          rawDefaultValue = getColumnAttr("default_value");
        }
        let initialValue;
        if (rawDefaultValue === undefined) {
          initialValue = info.mainField.field.defaultValue;
        } else {
          const defaultValue = valueFromRaw(info.mainField.field, rawDefaultValue);
          initialValue = defaultValue !== undefined ? defaultValue : info.mainField.field.defaultValue;
        }
        const updateInfo = {
          field: info.mainField.field,
          fieldRef: {
            entity: eref,
            name: info.mainField.name,
          },
          id: 0,
        };
        const value = {
          value: initialValue,
          rawValue: initialValue,
          info: updateInfo,
        };
        this.setOrRequestUpdatedPun(value, info.mainField.field.fieldType, nextValue => {
          this.handler.updateEmptyValue(this, colI, nextValue as IExtendedValue<ValueT>);
        });
        return value;
      } else {
        return {
          value: undefined,
        };
      }
    });

    return { values } as IRowCommon;
  }

  private makeMainColumnMapping(): IMainColumnMapping {
    if (!this.info.mainEntity) {
      return {};
    }

    const mainColumnMapping: IMainColumnMapping = {};
    this.info.columns.forEach((columnInfo, colI) => {
      const mainField = columnInfo.mainField;
      if (mainField) {
        insertMainColumnMapping(mainColumnMapping, mainField.name, colI);
      }
    });
    return mainColumnMapping;
  }

  private prefetchUserViewInfo() {
    // Preload entities information.
    if (this.info.mainEntity) {
      void this.store.dispatch("entities/getEntity", this.info.mainEntity);
    }
    if (this.rows !== null) {
      Object.values(this.info.domains).forEach(domain => {
        Object.values(domain).forEach(column => {
          void this.store.dispatch("entities/getEntity", column.ref.entity);
        });
      });
    }
  }

  // This only creates mapping for existing rows.
  // It can be extended by committed rows later.
  private makeMainRowMapping(): IMainRowMapping {
    if (!this.rows || !this.info.mainEntity) {
      return {};
    }

    const mainRowMapping: IMainRowMapping = {};
    this.rows.forEach((row, rowI) => {
      const ref: IExistingRowRef = {
        type: "existing",
        position: rowI,
      };
      insertMainRowMapping(mainRowMapping, row.mainId!, ref);
    });
    return mainRowMapping;
  }

  // This only creates mapping for existing rows.
  // It can be extended by committed rows later.
  private makeUpdateMapping(): IUpdateMapping {
    if (!this.rows) {
      return {};
    }

    const updateMapping: IUpdateMapping = {};
    this.rows.forEach((row, rowI) => {
      row.values.forEach((value, colI) => {
        if (!value.info) {
          return;
        }

        const valueRef: IExistingValueRef = {
          type: "existing",
          position: rowI,
          column: colI,
        };

        insertUpdateMapping(updateMapping, value.info.fieldRef, value.info.id!, valueRef);
      });
    });
    return updateMapping;
  }

  private massageCurrentRows(rows: IExecutedRow[], oldLocal: ICombinedUserView<ValueT, RowT, ViewT> | null): ICombinedRow[] {
    const info = this.info;

    const mainChanges = info.mainEntity ? this.storeChanges.changesForEntity(info.mainEntity) : null;

    // First step - convert values by type
    info.columns.forEach((columnInfo, colI) => {
      if (columnInfo.valueType.type === "datetime" || columnInfo.valueType.type === "date") {
        rows.forEach(row => {
          const cell = row.values[colI];
          if (cell.value) {
            cell.value = moment.utc(cell.value as MomentInput);
          }
        });
      }
    });

    // Second step - massage values into expected shape.
    rows.forEach((rawRow, rowI) => {
      const row = rawRow as ICombinedRow;
      const domain = (row.domainId !== null) ? this.info.domains[row.domainId] : undefined;

      if (row.mainId !== undefined) {
        row.deleted = row.mainId in (mainChanges as IEntityChanges).deleted;
        const oldExistingRow = oldLocal?.rows?.[rowI];
        // Get (even older) old added id.
        const oldAddedId = oldExistingRow?.oldAddedId;
        if (oldAddedId !== undefined) {
          row.oldAddedId = oldAddedId;
          if (!(oldAddedId in this.oldCommittedRows)) {
            this.oldCommittedRows[oldAddedId] = rowI;
          }
        }
      } else {
        row.deleted = false;
      }

      const entityIds = row.entityIds;
      if (entityIds === undefined) {
        return;
      }

      info.columns.forEach((columnInfo, colI) => {
        if (domain === undefined) {
          return;
        }
        const field = domain[columnInfo.name];
        if (field === undefined || !(field.idColumn in entityIds)) {
          return;
        }
        const value = row.values[colI];

        const id = entityIds[field.idColumn];
        if (id === undefined) {
          return;
        }
        const fieldRef = id.subEntity ? { entity: id.subEntity, name: field.ref.name } : field.ref;
        const updateInfo = {
          field: field.field || null,
          fieldRef,
          id: id.id,
        };
        value.info = updateInfo;
        value.initialValue = value.value;
        if (value.pun !== undefined) {
          if (value.pun === null) {
            value.pun = "";
          } else {
            value.pun = String(value.pun);
          }
          value.initialPun = value.pun;
        }

        const entityChanges = this.storeChanges.changesForEntity(field.ref.entity);
        const entityUpdated = entityChanges.updated[id.id];
        if (entityUpdated !== undefined) {
          const updated = entityUpdated[field.ref.name];
          if (updated !== undefined) {
            Object.assign(value, updated);
            const fieldType = field.field!.fieldType;
            this.setOrRequestUpdatedPun(value, fieldType, nextValue => {
              this.handler.updateValue(this, rowI, row as IExtendedRow<ValueT, RowT>, colI, nextValue as IExtendedValue<ValueT>);
            });
          }
        }
      });
    });

    return rows as ICombinedRow[];
  }

  getValueByRef(ref: ValueRef): { row: IExtendedRowCommon<ValueT, RowT>; value: IExtendedValue<ValueT> } | undefined {
    const row = this.getRowByRef(ref);
    if (!row) {
      return undefined;
    }

    const value = row.values[ref.column];
    if (!value) {
      return undefined;
    }

    return { row, value };
  }

  getRowByRef(ref: RowRef): IExtendedRowCommon<ValueT, RowT> | undefined {
    if (ref.type === "added") {
      return this.newRows[ref.id];
    } else if (ref.type === "existing") {
      const row = this.rows![ref.position];
      return row.deleted ? undefined : row;
    } else if (ref.type === "new") {
      return this.emptyRow ?? undefined;
    } else {
      throw new Error("Impossible");
    }
  }

  forEachRow(func: (row: IExtendedRowCommon<ValueT, RowT>, ref: RowRef) => void) {
    if (this.rows) {
      this.rows.forEach((row, rowI) => {
        const ref: IExistingRowRef = {
          type: "existing",
          position: rowI,
        };
        func(row, ref);
      });
    }
    for (const id of this.newRowsOrder) {
      const row = this.newRows[id];
      const ref: IAddedRowRef = {
        type: "added",
        id,
      };
      func(row, ref);
    }
    if (this.emptyRow !== null) {
      func(this.emptyRow, { type: "new" });
    }
  }

  mapRows<A>(func: (row: IExtendedRowCommon<ValueT, RowT>, ref: RowRef) => A): A[] {
    const rows = this.rows ? this.rows.map((row, rowI) => {
      const ref: IExistingRowRef = {
        type: "existing",
        position: rowI,
      };
      return func(row, ref);
    }) : [];
    const newRows = this.newRowsOrder.map(id => {
      const row = this.newRows[id];
      const ref: IAddedRowRef = {
        type: "added",
        id,
      };
      return func(row, ref);
    });
    const emptyRow = this.emptyRow ? [func(this.emptyRow, { type: "new" })] : [];
    return [...rows, ...newRows, ...emptyRow];
  }

  forEachVisibleRow(func: (row: IExtendedRowCommon<ValueT, RowT>, ref: RowRef) => void) {
    if (this.rows) {
      this.rows.forEach((row, rowI) => {
        if (!row.deleted) {
          const ref: IExistingRowRef = {
            type: "existing",
            position: rowI,
          };
          func(row, ref);
        }
      });
    }
    for (const id of this.newRowsOrder) {
      const row = this.newRows[id];
      if (!row.deleted) {
        const ref: IAddedRowRef = {
          type: "added",
          id,
        };
        func(row, ref);
      }
    }
  }

  mapVisibleRows<A>(func: (row: IExtendedRowCommon<ValueT, RowT>, ref: RowRef) => A): A[] {
    const rows = this.rows ? mapMaybe((row, rowI) => {
      if (row.deleted) {
        return undefined;
      }
      const ref: IExistingRowRef = {
        type: "existing",
        position: rowI,
      };
      return func(row, ref);
    }, this.rows) : [];
    const newRows = mapMaybe(id => {
      const row = this.newRows[id];
      if (row.deleted) {
        return undefined;
      } else {
        const ref: IAddedRowRef = {
          type: "added",
          id,
        };
        return func(row, ref);
      }
    }, this.newRowsOrder);
    return [...rows, ...newRows];
  }
}

export type CombinedUserViewT<T> = T extends IUserViewHandler<infer ValueT, infer RowT, infer ViewT> ? CombinedUserView<T, ValueT, RowT, ViewT> : never;

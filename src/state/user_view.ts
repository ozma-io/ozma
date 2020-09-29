import Vue from "vue";
import { Store, Dispatch, Module, ActionContext } from "vuex";
import moment from "moment";

import { ObjectSet, IRef, ObjectResourceMap, ReferenceName, ObjectMap, momentLocale, tryDicts, valueSignature, mapMaybe } from "@/utils";
import {
  IColumnField, UserViewSource, IEntityRef, IFieldRef, IResultViewInfo, IExecutedRow, IExecutedValue,
  SchemaName, EntityName, RowId, FieldName, AttributeName, IViewInfoResult, IViewExprResult,
  ValueType, FieldType, AttributesMap, IEntity, FunDBError, UserViewErrorType, default as Api
} from "@/api";
import { IUpdatedValue, valueToText, equalEntityRef, valueFromRaw, valueIsNull } from "@/values";
import { CurrentChanges, IStagingState, UpdatedValues, IEntityChanges, IAddedEntry, AddedRowId, UserViewKey } from "@/state/staging_changes";
import { IReferenceFieldType } from "ozma-api/src";

export interface IUserViewArguments {
  source: UserViewSource;
  args: Record<string, any> | null;
}

export interface IValueInfo {
  field: IColumnField | null;
  fieldRef: IFieldRef;
  id: RowId;
}

export interface ICombinedValue extends IExecutedValue {
  // `undefined` here means that value didn't pass validation
  value: any;
  // See `values.ts` for explanation of this. The idea is to use `rawValue` everywhere when it's defined,
  // unless you need validated value.
  // Even better, use `currentValue()`.
  rawValue?: any;
  erroredOnce?: boolean;
  initialValue?: any;
  // `undefined` is used when pun is not yet resolved, to avoid adding/removing values.
  pun?: string | null | undefined;
  initialPun?: string;
  info?: IValueInfo;
}

export interface IRowCommon {
  values: ICombinedValue[];
  attributes?: AttributesMap;
}

export interface ICombinedRow extends IRowCommon, IExecutedRow {
  values: ICombinedValue[];
  deleted: boolean;
}

export type IAddedRow = IRowCommon;

export interface IUserViewValueRef {
  index: number;
  column: number;
}

// Mapping from record ids to user view value refs.
export type IUpdateMapping = Record<SchemaName, Record<EntityName, Record<RowId, Record<FieldName, IUserViewValueRef[]>>>>;
// Mapping from fields to column indices with main field.
export type IMainColumnMapping = Record<FieldName, number[]>;
// Mapping from main entity ids to row indices.
export type IMainRowMapping = Record<RowId, number[]>;

const insertUpdateMapping = (updateMapping: IUpdateMapping, ref: IFieldRef, id: RowId, valueRef: IUserViewValueRef) => {
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

const insertMainRowMapping = (mainRowMapping: IMainRowMapping, id: RowId, index: number) => {
  let rowsMapping = mainRowMapping[id];
  if (rowsMapping === undefined) {
    rowsMapping = [];
    mainRowMapping[id] = rowsMapping;
  }

  rowsMapping.push(index);
};

export const setUpdatedPun = (entitySummaries: Entries | null, value: ICombinedValue) => {
  const ref = currentValue(value);
  if (valueIsNull(ref)) {
    value.pun = "";
  } else {
    const pun = entitySummaries ? entitySummaries[ref] : undefined;
    if (pun === undefined) {
      value.pun = String(ref);
    } else {
      value.pun = pun;
    }
  }
};

export const referenceEntries = (fieldType: IReferenceFieldType): IEntriesRef => {
  return { entity: fieldType.entity, where: fieldType.where };
}

// Returns `null` when there's no pun. Returns `undefined` when pun cannot be resolved now.
const setOrRequestUpdatedPun = (context: { dispatch: Dispatch; state: IUserViewState }, value: ICombinedValue, fieldType: FieldType) => {
  const { dispatch, state } = context;
  const ref = currentValue(value);

  if (fieldType.type === "reference") {
    if (valueIsNull(ref)) {
      value.pun = "";
    } else {
      const entitySummariesGen = state.entries.entries.get(fieldType);
      if (entitySummariesGen === undefined) {
        dispatch("userView/getEntries", { ref: fieldType, reference: "update" }, { root: true });
        value.pun = undefined;
      } else {
        const summaries = entitySummariesGen.data;
        if (!(summaries instanceof Error) && !(summaries instanceof Promise)) {
          const pun = summaries[ref];
          if (pun === undefined) {
            value.pun = String(ref);
          } else {
            value.pun = pun;
          }
        } else {
          value.pun = undefined;
        }
      }
    }
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
  if ("erroredOnce" in value) {
    value.erroredOnce = false;
  }
};

export const newEmptyRow = (store: Store<any>, uv: CombinedUserView, defaultRawValues: Record<string, any>): IRowCommon => {
  const eref = uv.info.mainEntity;
  if (!eref) {
    throw new Error("Main entity must be specified");
  }

  const context = {
    state: store.state.userView,
    dispatch: store.dispatch,
  };

  const values = uv.info.columns.map((info, colI) => {
    const columnAttrs = uv.columnAttributes[colI];
    const viewAttrs = uv.attributes;
    const getColumnAttr = (name: string) => tryDicts(name, columnAttrs, viewAttrs);

    if (info.mainField) {
      let rawDefaultValue: any;
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
      setOrRequestUpdatedPun(context, value, info.mainField.field.fieldType);
      return value;
    } else {
      return {
        value: undefined,
      };
    }
  });

  const row = {
    values,
  };

  return row;
};

export const currentValue = (value: ICombinedValue) => "rawValue" in value ? value.rawValue : value.value;

// Event handler which is notified about user view changes.
export interface IUserViewEventHandler {
  updateValue: (rowIndex: number, row: ICombinedRow, columnIndex: number, value: ICombinedValue) => void;
  updateAddedValue: (rowId: AddedRowId, row: IAddedRow, columnIndex: number, value: ICombinedValue) => void;
  deleteRow: (rowIndex: number, row: ICombinedRow) => void;
  undeleteRow: (rowIndex: number, row: ICombinedRow) => void;
  insertAddedRow: (rowId: AddedRowId, row: IAddedRow) => void;
  deleteAddedRow: (rowId: AddedRowId, row: IAddedRow) => void;
  updateSummary: (columnIndex: number, entries: Entries) => void;
}

interface ICombinedUserViewParams {
  args: IUserViewArguments;
  info: IResultViewInfo;
  attributes: Record<AttributeName, any>;
  columnAttributes: Record<AttributeName, any>[];
  rows: IExecutedRow[] | null;
  changes: CurrentChanges;
}

// Combine initial user view response with current staging data, entry summaries map and extra data needed by a user view representation.
export class CombinedUserView {
  args: IUserViewArguments;
  homeSchema: SchemaName | null;
  info: IResultViewInfo;
  attributes: Record<AttributeName, any>;
  columnAttributes: Record<AttributeName, any>[];
  rows: ICombinedRow[] | null;
  // Rows added by user, not yet commited to the database.
  newRows: Record<AddedRowId, IAddedRow>;
  newRowsPositions: AddedRowId[];
  updateMapping: IUpdateMapping;
  mainColumnMapping: IMainColumnMapping;
  mainRowMapping: IMainRowMapping;
  handlers: IUserViewEventHandler[] = [];
  userViewKey: UserViewKey;

  // Warning: it takes ownership of all params and mutates!
  constructor(context: ActionContext<IUserViewState, {}>, params: ICombinedUserViewParams) {
    const { args, info, attributes, columnAttributes, rows, changes } = params;
    this.args = args;
    this.info = info;
    this.attributes = attributes;
    this.columnAttributes = columnAttributes;
    this.homeSchema = homeSchema(args);
    this.userViewKey = valueSignature(args);

    let mainChanges: IEntityChanges | null = null;
    if (info.mainEntity) {
      const eref = info.mainEntity;
      mainChanges = changes.changesForEntity(eref);

      const mainColumnMapping: IMainColumnMapping = {};
      info.columns.forEach((columnInfo, colI) => {
        const mainField = columnInfo.mainField;
        if (mainField) {
          insertMainColumnMapping(mainColumnMapping, mainField.name, colI);
        }
      });

      const uvAdded = mainChanges.added[this.userViewKey];
      if (uvAdded !== undefined) {
        this.newRows = Object.fromEntries(Object.entries(uvAdded.entries).map(([newIdRaw, entry]) => {
          const newId = Number(newIdRaw);
          const row = entry.values;

          const values = info.columns.map(columnInfo => {
            const mainField = columnInfo.mainField;

            if (mainField) {
              const updateInfo = {
                field: mainField.field,
                fieldRef: {
                  entity: eref,
                  name: mainField.name,
                },
                id: newId,
              };
              const updated = row[mainField.name];
              if (updated !== undefined) {
                const fieldType = mainField.field.fieldType;
                const value = { info: updateInfo, ...updated };
                setOrRequestUpdatedPun(context, value, fieldType);
                return value;
              } else {
                return {
                  info: updateInfo,
                  value: undefined,
                };
              }
            } else {
              return {
                value: undefined,
              };
            }
          });

          const newEntry = {
            values,
          };
          return [newId, newEntry];
        }));
        this.newRowsPositions = uvAdded.positions.slice();
      } else {
        this.newRows = {};
        this.newRowsPositions = [];
      }
      this.mainColumnMapping = mainColumnMapping;
    } else {
      this.newRowsPositions = [];
      this.newRows = {};
      this.mainColumnMapping = {};
    }

    if (rows !== null) {
      // First step - convert values by type
      info.columns.forEach((columnInfo, colI) => {
        if (columnInfo.valueType.type === "datetime" || columnInfo.valueType.type === "date") {
          rows.forEach(row => {
            const cell = row.values[colI];
            if (cell.value) {
              cell.value = moment.utc(cell.value);
            }
          });
        }
      });

      // Second step - massage values into expected shape
      const updateMapping: IUpdateMapping = {};
      rows.forEach((rawRow, rowI) => {
        const row = rawRow as ICombinedRow;
        const domain = this.info.domains[row.domainId];

        if (row.mainId !== undefined) {
          row.deleted = row.mainId in (mainChanges as IEntityChanges).deleted;
        } else {
          row.deleted = false;
        }

        const entityIds = row.entityIds;
        if (entityIds === undefined) {
          return;
        }

        info.columns.forEach((columnInfo, colI) => {
          const field = domain[columnInfo.name];

          const value = row.values[colI];

          if (field === undefined || !(field.idColumn in entityIds)) {
            return;
          }

          const id = entityIds[field.idColumn];
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

          const entityChanges = changes.changesForEntity(field.ref.entity);
          const entityUpdated = entityChanges.updated[id.id];
          if (entityUpdated !== undefined) {
            const updated = entityUpdated[field.ref.name];
            if (updated !== undefined) {
              Object.assign(value, updated);
              const fieldType = field.field!.fieldType;
              setOrRequestUpdatedPun(context, value, fieldType);
            }
          }

          const valueRef = {
            index: rowI,
            column: colI,
          };

          insertUpdateMapping(updateMapping, fieldRef, id.id, valueRef);
        });
      });

      this.rows = rows as ICombinedRow[];
      this.updateMapping = updateMapping;
    } else {
      this.rows = null;
      this.updateMapping = {};
    }

    if (rows !== null && info.mainEntity !== null) {
      const mainRowMapping: IMainRowMapping = {};
      rows.forEach((row, rowI) => {
        insertMainRowMapping(mainRowMapping, row.mainId!, rowI);
      });
      this.mainRowMapping = mainRowMapping;
    } else {
      this.mainRowMapping = {};
    }
  }

  get name() {
    if (this.args.source.type === "named") {
      return this.args.source.ref.name;
    } else {
      return "unnamed";
    }
  }

  forEachUpdatedValues(valueFunc: (field: IColumnField, ref: IUserViewValueRef) => void, fieldPredicate: (field: IColumnField) => boolean, changes: CurrentChanges) {
    if (this.rows !== null) {
      Object.values(this.info.domains).forEach(domain => {
        Object.values(domain).forEach(field => {
          if (!field.field || !fieldPredicate(field.field)) {
            return;
          }

          const changedEntities = changes.changes[field.ref.entity.schema];
          if (changedEntities === undefined) {
            return;
          }
          const entityChanges = changedEntities[field.ref.entity.name];
          if (entityChanges === undefined) {
            return;
          }

          const updateEntities = this.updateMapping[field.ref.entity.schema];
          if (updateEntities === undefined) {
            return;
          }
          const updateIds = updateEntities[field.ref.entity.name];

          Object.entries(entityChanges.updated).forEach(([updatedId, updatedFields]) => {
            if (!(field.ref.name in updatedFields)) {
              return;
            }

            const entryFields = updateIds[updatedId as any];
            if (entryFields === undefined) {
              return;
            }
            const entryRefs = entryFields[field.ref.name];
            if (entryRefs === undefined) {
              return;
            }

            entryRefs.forEach(valueRef => {
              valueFunc(field.field as IColumnField, valueRef);
            });
          });
        });
      });
    }
  }

  forEachDeletedRow(rowFunc: (row: ICombinedRow, rowI: number) => void, entityRef: IEntityRef, id: RowId) {
    if (!this.rows ||
                !this.info.mainEntity ||
                !equalEntityRef(this.info.mainEntity, entityRef)) {
      return;
    }

    const deletedRows = this.mainRowMapping[id];
    if (deletedRows === undefined) {
      return;
    }
    deletedRows.forEach(rowI => {
      const row = (this.rows as ICombinedRow[])[rowI];
      rowFunc(row, rowI);
    });
  }
}

export class UserViewError extends Error {
  type: UserViewErrorType;
  description: string;
  args: IUserViewArguments;

  constructor(type: UserViewErrorType, description: string, args: IUserViewArguments) {
    super(description !== "" ? description : type);
    this.type = type;
    this.description = description;
    this.args = args;
  }
}

// We use numeric "generations" to distinguish fetched data before and after a reload.
// All old data is flushed after "root" user views are reloaded.
export interface IGeneration<T> {
  generation: number;
  data: T;
}

// For each entity contains array of all accessible entries (main fields) identified by id
export type Entries = Record<RowId, string>;
export type EntriesResult = Entries | Promise<Entries> | Error;

export interface IEntriesRef {
  entity: IEntityRef;
  where?: string;
}

export const equalEntriesRef = (a: IEntriesRef, b: IEntriesRef): boolean => {
  return equalEntityRef(a.entity, b.entity) && a.where === b.where;
};

export class CurrentEntries {
  entries = new ObjectResourceMap<null, IEntriesRef, IGeneration<EntriesResult>>();

  getEntriesOrError(ref: IEntriesRef) {
    const entries = this.entries.get(ref)?.data;
    if (entries === undefined || entries instanceof Promise) {
      return undefined;
    } else {
      return entries;
    }
  }

  getEntries(ref: IEntriesRef) {
    const entity = this.getEntriesOrError(ref);
    if (entity instanceof Error) {
      return undefined;
    } else {
      return entity;
    }
  }
}

// For each entity contains array of all accessible entries (main fields) identified by id
export type EntityResult = IEntity | Promise<IEntity> | Error;

export class CurrentEntities {
  // Entities data is both finite and small, so we don't use ObjectResourceMap here and just keep all fetched info till reload.
  entities = new ObjectMap<IEntityRef, IGeneration<EntityResult>>();

  getEntityOrError(ref: IEntityRef) {
    const entity = this.entities.get(ref)?.data;
    if (entity === undefined || entity instanceof Promise) {
      return undefined;
    } else {
      return entity;
    }
  }

  getEntity(ref: IEntityRef) {
    const entity = this.getEntityOrError(ref);
    if (entity instanceof Error) {
      return undefined;
    } else {
      return entity;
    }
  }
}

export type UserViewResult = CombinedUserView | UserViewError | Promise<CombinedUserView>;

export interface IUserViewReferenceMeta {
  root: true;
}

export class CurrentUserViews {
  userViews = new ObjectResourceMap<IUserViewReferenceMeta, IUserViewArguments, IGeneration<UserViewResult>>();

  getUserViewOrError(args: IUserViewArguments) {
    const uv = this.userViews.get(args)?.data;
    if (uv === undefined || uv instanceof Promise) {
      return undefined;
    } else {
      return uv;
    }
  }

  getUserView(args: IUserViewArguments) {
    const uv = this.getUserViewOrError(args);
    if (uv instanceof UserViewError) {
      return undefined;
    } else {
      return uv;
    }
  }
}

export interface IUserViewState {
  generation: number;
  current: CurrentUserViews;
  entries: CurrentEntries;
  entities: CurrentEntities;
  // Needed because during user view reloads we don't want to replace CurrentUserView right away.
  pendingReload: Promise<void> | null;
}

export const homeSchema = (args: IUserViewArguments): SchemaName | null => {
  if (args.source.type === "named") {
    return args.source.ref.schema;
  } else {
    return null;
  }
};

export const valueToPunnedText = (valueType: ValueType, value: ICombinedValue): string => {
  if (value.pun !== undefined) {
    if (value.pun === null) {
      return "";
    } else {
      return value.pun;
    }
  } else {
    return valueToText(valueType, currentValue(value));
  }
};

const fetchUserView = async (context: ActionContext<IUserViewState, {}>, args: IUserViewArguments): Promise<CombinedUserView | UserViewError> => {
  const { dispatch } = context;
  try {
    let current: CombinedUserView;
    const changes = ((context.rootState as any).staging as IStagingState).current;
    if (args.source.type === "named") {
      if (args.args === null) {
        const res: IViewInfoResult = await dispatch("callProtectedApi", {
          func: Api.getNamedUserViewInfo.bind(Api),
          args: [args.source.ref],
        }, { root: true });
        await momentLocale;
        current = new CombinedUserView(context, {
          args,
          info: res.info,
          attributes: res.pureAttributes,
          columnAttributes: res.pureColumnAttributes,
          rows: null,
          changes,
        });
      } else {
        const res: IViewExprResult = await dispatch("callProtectedApi", {
          func: Api.getNamedUserView.bind(Api),
          args: [args.source.ref, args.args],
        }, { root: true });
        await momentLocale;
        current = new CombinedUserView(context, {
          args,
          info: res.info,
          attributes: res.result.attributes,
          columnAttributes: res.result.columnAttributes,
          rows: res.result.rows,
          changes,
        });
      }
    } else if (args.source.type === "anonymous") {
      if (args.args === null) {
        throw new Error("Getting information about anonymous views is not supported");
      } else {
        const res: IViewExprResult = await dispatch("callProtectedApi", {
          func: Api.getAnonymousUserView.bind(Api),
          args: [args.source.query, args.args],
        }, { root: true });
        await momentLocale;
        current = new CombinedUserView(context, {
          args,
          info: res.info,
          attributes: res.result.attributes,
          columnAttributes: res.result.columnAttributes,
          rows: res.result.rows,
          changes,
        });
      }
    } else {
      throw new Error("Invalid source type");
    }

    return current;
  } catch (e) {
    if (e instanceof FunDBError) {
      return new UserViewError(e.body.error as UserViewErrorType, e.message, args);
    }

    throw e;
  }
};

const prefetchUserViewInfo = ({ dispatch }: ActionContext<IUserViewState, {}>, uv: CombinedUserView) => {
  // Preload entities information.
  if (uv.info.mainEntity) {
    dispatch("getEntity", uv.info.mainEntity);
  }
  if (uv.rows !== null) {
    Object.values(uv.info.domains).forEach(domain => {
      Object.values(domain).forEach(column => {
        dispatch("getEntity", column.ref.entity);
      });
    });
  }
};

const userViewModule: Module<IUserViewState, {}> = {
  namespaced: true,
  state: {
    generation: 0,
    current: new CurrentUserViews(),
    entries: new CurrentEntries(),
    entities: new CurrentEntities(),
    pendingReload: null,
  },
  mutations: {
    initUserView: (state, args: { args: IUserViewArguments; reference: ReferenceName; meta: IUserViewReferenceMeta; generation: number; userView: UserViewResult }) => {
      state.current.userViews.createResource(args.args, args.reference, args.meta, { generation: args.generation, data: args.userView });
    },
    updateUserView: (state, { args, generation, userView }: { args: IUserViewArguments; generation?: number; userView: UserViewResult }) => {
      const uv = state.current.userViews.apply(uv => {
        uv.data = userView;
        if (generation !== undefined) {
          uv.generation = generation;
        }
      }, args);
    },
    addUserViewConsumer: (state, { args, reference, meta }: { args: IUserViewArguments; reference: ReferenceName; meta: IUserViewReferenceMeta }) => {
      state.current.userViews.addReference(args, reference, meta);
    },
    removeUserViewConsumer: (state, { args, reference }: { args: IUserViewArguments; reference: ReferenceName }) => {
      state.current.userViews.removeReference(args, reference);
    },

    initEntity: (state, args: { ref: IEntityRef; generation: number; entity: EntityResult }) => {
      state.entities.entities.insert(args.ref, { generation: args.generation, data: args.entity });
    },
    updateEntity: (state, { ref, entity }: { ref: IEntityRef; entity: EntityResult }) => {
      state.entities.entities.apply(ent => {
        ent.data = entity;
      }, ref);
    },

    initEntries: (state, args: { ref: IEntriesRef; reference: ReferenceName; generation: number; entries: EntriesResult }) => {
      state.entries.entries.createResource(args.ref, args.reference, null, { generation: args.generation, data: args.entries });
    },
    updateEntries: (state, { ref, entries }: { ref: IEntriesRef; entries: EntriesResult }) => {
      state.entries.entries.apply(ent => {
        ent.data = entries;
      }, ref);
    },
    addEntriesConsumer: (state, { ref, reference }: { ref: IEntriesRef; reference: ReferenceName }) => {
      state.entries.entries.addReference(ref, reference, null);
    },
    removeEntriesConsumer: (state, { ref, reference }: { ref: IEntriesRef; reference: ReferenceName }) => {
      state.entries.entries.removeReference(ref, reference);
    },

    bumpGeneration: state => {
      state.generation += 1;
    },
    setPendingReload: (state, pendingReload: Promise<void>) => {
      state.pendingReload = pendingReload;
    },
    clear: state => {
      state.generation = 0;
      state.current = new CurrentUserViews();
      state.entries = new CurrentEntries();
      state.entities = new CurrentEntities();
      state.pendingReload = null;
    },

    updateUserViewSummaries: (state, params: { ref: IEntityRef; entries: Entries; changes: CurrentChanges }) => {
      const { ref, entries, changes } = params;

      const filterReference = (field: IColumnField) => {
        return field.fieldType.type === "reference" && equalEntityRef(field.fieldType.entity, ref);
      };

      state.current.userViews.values().forEach(({ data: uv }) => {
        if (!(uv instanceof CombinedUserView)) {
          return;
        }

        // Update old updated rows.
        uv.forEachUpdatedValues((_, valueRef) => {
          const row = (uv.rows as ICombinedRow[])[valueRef.index];
          const value = row.values[valueRef.column];
          setUpdatedPun(entries, value);
          uv.handlers.forEach(handler => {
            handler.updateValue(valueRef.index, row, valueRef.column, value);
          });
        }, filterReference, changes);

        // Update new rows
        uv.info.columns.forEach((columnInfo, colI) => {
          if (!columnInfo.mainField) {
            return;
          }

          const fieldType = columnInfo.mainField.field.fieldType;
          if (!(fieldType.type === "reference" && equalEntityRef(fieldType.entity, ref))) {
            return;
          }

          uv.newRowsPositions.forEach(rowId => {
            const row = uv.newRows[rowId];
            const value = row.values[colI];
            setUpdatedPun(entries, value);
            uv.handlers.forEach(handler => {
              handler.updateAddedValue(rowId, row, colI, value);
            });
          });

          uv.handlers.forEach(handler => {
            handler.updateSummary(colI, entries);
          });
        });
      });
    },

    updateField: (state, params: { fieldRef: IFieldRef; id: RowId; updatedValue: IUpdatedValue; fieldType?: FieldType }) => {
      const entitySummaries = params.fieldType && params.fieldType.type === "reference" ? state.entries.getEntries(params.fieldType) : undefined;

      state.current.userViews.values().forEach(({ data: uv }) => {
        if (!(uv instanceof CombinedUserView)) {
          return;
        }

        if (uv.rows === null) {
          return;
        }

        const updatedEntities = uv.updateMapping[params.fieldRef.entity.schema];
        if (updatedEntities === undefined) {
          return;
        }
        const updatedIds = updatedEntities[params.fieldRef.entity.name];
        if (updatedIds === undefined) {
          return;
        }
        const updatedFields = updatedIds[params.id];
        if (updatedFields === undefined) {
          return;
        }

        const updatedValues = updatedFields[params.fieldRef.name];
        if (updatedValues === undefined) {
          return;
        }

        updatedValues.forEach(valueRef => {
          const row = (uv.rows as ICombinedRow[])[valueRef.index];
          // New object because otherwise Vue won't detect changes.
          const value = { ...row.values[valueRef.column], ...params.updatedValue };
          Vue.set(row.values, valueRef.column, value);
          if ("pun" in value) {
            setUpdatedPun(entitySummaries || null, value);
          }

          uv.handlers.forEach(handler => {
            handler.updateValue(valueRef.index, row, valueRef.column, value);
          });
        });
      });
    },
    // Expects all values to be empty, therefore doesn't set updated puns!
    addEntry: (state, params: { entityRef: IEntityRef; userView: UserViewKey; id: AddedRowId; positions: number[]; newValues: UpdatedValues }) => {
      const uv = state.current.userViews.getBySignature(params.userView);
      if (!uv ||
          !(uv instanceof CombinedUserView) ||
          !uv.info.mainEntity ||
          !equalEntityRef(uv.info.mainEntity, params.entityRef)) {
        return;
      }

      const eref = uv.info.mainEntity;

      const values = uv.info.columns.map((column, colI): ICombinedValue => {
        if (column.mainField) {
          const updateInfo = {
            id: params.id,
            field: column.mainField.field,
            fieldRef: {
              entity: eref,
              name: column.mainField.name,
            },
          };

          const updated = params.newValues[column.mainField.name];
          let result: ICombinedValue;
          if (updated !== undefined) {
            result = { info: updateInfo, ...updated };
          } else {
            result = {
              value: null,
              rawValue: "",
              info: updateInfo,
            };
          }
          if (updateInfo.field.fieldType.type === "reference") {
            result.pun = "";
          }
          return result;
        } else {
          return {
            value: undefined,
          };
        }
      });

      const newRow: IRowCommon = {
        values,
      };

      Vue.set(uv.newRows, params.id, newRow);
      uv.handlers.forEach(handler => {
        handler.insertAddedRow(params.id, newRow);
      });
      uv.newRowsPositions = params.positions;
    },
    setAddedField: (state, params: { fieldRef: IFieldRef; userView: UserViewKey; id: AddedRowId; addedEntry: IAddedEntry; fieldType?: FieldType }) => {
      const uv = state.current.userViews.getBySignature(params.userView);
      if (!uv ||
          !(uv instanceof CombinedUserView) ||
          !uv.info.mainEntity ||
          !equalEntityRef(uv.info.mainEntity, params.fieldRef.entity) ||
          uv.userViewKey !== params.userView) {
        return;
      }

      const entitySummaries = params.fieldType && params.fieldType.type === "reference" ? state.entries.getEntries(params.fieldType) : undefined;

      const newRow = uv.newRows[params.id];
      uv.mainColumnMapping[params.fieldRef.name].forEach(colI => {
        // New object because otherwise Vue won't detect changes.
        const updated = params.addedEntry.values[params.fieldRef.name];
        const value: ICombinedValue = Object.assign({}, newRow.values[colI], updated);
        Vue.set(newRow.values, colI, value);
        if (entitySummaries !== undefined && "pun" in value) {
          setUpdatedPun(entitySummaries, value);
        }

        uv.handlers.forEach(handler => {
          handler.updateAddedValue(params.id, newRow, colI, value);
        });
      });
    },
    deleteEntry: (state, params: { entityRef: IEntityRef; id: RowId }) => {
      state.current.userViews.values().forEach(uv => {
        if (!(uv instanceof CombinedUserView)) {
          return;
        }

        const deleteOneRow = (row: ICombinedRow, rowI: number) => {
          row.deleted = true;
          uv.handlers.forEach(handler => {
            handler.deleteRow(rowI, row);
          });
        };

        uv.forEachDeletedRow(deleteOneRow, params.entityRef, params.id);
      });
    },
    resetChanges: (state, current: CurrentChanges) => {
      state.current.userViews.values().forEach(uv => {
        if (!(uv instanceof CombinedUserView)) {
          return;
        }

        const clearValueUpdate = (field: IColumnField, valueRef: IUserViewValueRef) => {
          const row = (uv.rows as ICombinedRow[])[valueRef.index];
          const value = row.values[valueRef.column];
          clearUpdatedValue(value);

          uv.handlers.forEach(handler => {
            handler.updateValue(valueRef.index, row, valueRef.column, value);
          });
        };

        uv.forEachUpdatedValues(clearValueUpdate, () => true, current);

        uv.newRowsPositions = [];
        const oldRows = uv.newRows;
        uv.newRows = {};
        uv.handlers.forEach(handler => {
          Object.entries(oldRows).forEach(([rowIdRaw, row]) => {
            const rowId = Number(rowIdRaw);
            handler.deleteAddedRow(rowId, row);
          });
        });

        if (uv.rows && uv.info.mainEntity) {
          const changedSchema = current.changes[uv.info.mainEntity.schema];
          if (changedSchema !== undefined) {
            const changedEntity = changedSchema[uv.info.mainEntity.name];
            if (changedEntity !== undefined) {
              Object.keys(changedEntity.deleted).forEach(rowId => {
                const affectedRows = uv.mainRowMapping[rowId as any];
                if (affectedRows === undefined) {
                  return;
                }
                affectedRows.forEach(rowI => {
                  const row = (uv.rows as ICombinedRow[])[rowI];
                  row.deleted = false;
                  uv.handlers.forEach(handler => {
                    handler.undeleteRow(rowI, row);
                  });
                });
              });
            }
          }
        }
      });
    },
    resetUpdatedField: (state, params: { fieldRef: IFieldRef; id: RowId }) => {
      state.current.userViews.values().forEach(uv => {
        if (!(uv instanceof CombinedUserView)) {
          return;
        }

        if (uv.rows === null) {
          return;
        }

        const updatedEntities = uv.updateMapping[params.fieldRef.entity.schema];
        if (updatedEntities === undefined) {
          return;
        }
        const updatedIds = updatedEntities[params.fieldRef.entity.name];
        if (updatedIds === undefined) {
          return;
        }
        const updatedFields = updatedIds[params.id];
        if (updatedFields === undefined) {
          return;
        }

        const updatedValues = updatedFields[params.fieldRef.name];
        if (updatedValues === undefined) {
          return;
        }

        updatedValues.forEach(valueRef => {
          const row = (uv.rows as ICombinedRow[])[valueRef.index];
          const value = row.values[valueRef.column];
          clearUpdatedValue(value);

          uv.handlers.forEach(handler => {
            handler.updateValue(valueRef.index, row, valueRef.column, value);
          });
        });
      });
    },
    resetAddedEntry: (state, params: { entityRef: IEntityRef; userView: UserViewKey; id: AddedRowId; positions: number[] }) => {
      const uv = state.current.userViews.getBySignature(params.userView);
      if (!uv ||
          !(uv instanceof CombinedUserView) ||
          !uv.info.mainEntity ||
          !equalEntityRef(uv.info.mainEntity, params.entityRef)) {
        return;
      }

      const position = uv.newRowsPositions.indexOf(params.id);
      if (position === -1) {
        throw new Error("Impossible");
      }
      uv.newRowsPositions.splice(position, 1);
      const row = uv.newRows[params.id];
      Vue.delete(uv.newRows, params.id);
      uv.handlers.forEach(handler => {
        handler.deleteAddedRow(params.id, row);
      });
    },
    resetDeleteEntry: (state, params: { entityRef: IEntityRef; id: RowId }) => {
      state.current.userViews.values().forEach(uv => {
        if (!(uv instanceof CombinedUserView)) {
          return;
        }

        const undeleteOneRow = (row: ICombinedRow, rowI: number) => {
          row.deleted = false;
          uv.handlers.forEach(handler => {
            handler.undeleteRow(rowI, row);
          });
        };

        uv.forEachDeletedRow(undeleteOneRow, params.entityRef, params.id);
      });
    },
    updateErroredOnce: (state, changes: CurrentChanges) => {
      state.current.userViews.values().forEach(uv => {
        if (!(uv instanceof CombinedUserView)) {
          return;
        }

        const mainEntity = uv.info.mainEntity;
        if (mainEntity) {
          const schemaChanges = changes.changes[mainEntity.schema];
          if (schemaChanges) {
            const entityChanges = schemaChanges[mainEntity.name];
            if (entityChanges) {
              const uvAdded = entityChanges.added[uv.userViewKey];
              if (uvAdded) {
                Object.entries(uvAdded.entries).forEach(([addedIdStr, rowValues]) => {
                  const addedId = Number(addedIdStr);
                  const newRow = uv.newRows[addedId];
                  Object.entries(rowValues.values).forEach(([fieldName, addedValue]) => {
                    uv.mainColumnMapping[fieldName].forEach(colI => {
                      const value = newRow.values[colI];
                      Vue.set(value, "erroredOnce", addedValue.erroredOnce);
                    });
                  });
                });
              }
            }
          }
        }

        if (uv.rows !== null) {
          Object.entries(changes.changes).forEach(([schemaName, schemaChanges]) => {
            const updatedEntities = uv.updateMapping[schemaName];
            if (updatedEntities === undefined) {
              return;
            }

            Object.entries(schemaChanges).forEach(([entityName, entityChanges]) => {
              const updatedIds = updatedEntities[entityName];
              if (updatedIds === undefined) {
                return;
              }

              Object.entries(entityChanges.updated).forEach(([rowIdStr, rowChanges]) => {
                const rowId = Number(rowIdStr);
                const updatedFields = updatedIds[rowId];
                if (updatedFields === undefined) {
                  return;
                }

                Object.entries(rowChanges).forEach(([fieldName, fieldChanges]) => {
                  const updatedValues = updatedFields[fieldName];
                  if (updatedValues === undefined) {
                    return;
                  }

                  updatedValues.forEach(valueRef => {
                    const row = (uv.rows as ICombinedRow[])[valueRef.index];
                    const value = row.values[valueRef.column];
                    Vue.set(value, "erroredOnce", fieldChanges.erroredOnce);
                  });
                });
              });
            });
          });
        }
      });
    },

    registerHandler: (state, { args, handler }: { args: IUserViewArguments; handler: IUserViewEventHandler }) => {
      const uv = state.current.getUserView(args);
      if (uv === undefined) {
        throw new Error("User view does not exist");
      }
      if (uv.handlers.includes(handler)) {
        return;
      }
      uv.handlers.push(handler);
    },
    unregisterHandler: (state, { args, handler }: { args: IUserViewArguments; name: ReferenceName; handler: IUserViewEventHandler }) => {
      const uv = state.current.getUserView(args);
      if (uv === undefined) {
        return;
      }
      const pos = uv.handlers.indexOf(handler);
      if (pos !== -1) {
        uv.handlers.splice(pos, 1);
      }
    },
  },
  actions: {
    removeAuth: {
      root: true,
      handler: ({ dispatch }) => {
        dispatch("reload");
      },
    },
    setAuth: {
      root: true,
      handler: ({ dispatch }) => {
        dispatch("reload");
      },
    },

    getEntries: ({ state, rootState, commit, dispatch }, { reference, ref }: { reference: ReferenceName; ref: IEntriesRef }): Promise<Entries> => {
      const oldResource = state.entries.entries.getResource(ref);
      if (oldResource !== undefined) {
        if (!(reference in oldResource.refs)) {
          commit("addEntriesConsumer", { ref, reference });
        }
        const data = oldResource.value.data;
        if (data instanceof Error) {
          return Promise.reject(data);
        } else if (data instanceof Promise) {
          return data;
        } else {
          return Promise.resolve(data);
        }
      }

      const pending: IRef<Promise<Entries>> = {};
      pending.ref = (async () => {
        try {
          const entityPromise = dispatch("getEntity", ref.entity);
          const query = `SELECT id, __main AS name FROM "${ref.entity.schema}"."${ref.entity.name}" ORDER BY __main`;
          const resPromise = dispatch("callProtectedApi", {
            func: Api.getAnonymousUserView.bind(Api),
            args: [query, {}],
          }, { root: true });
          await entityPromise;
          const res: IViewExprResult = await resPromise;
          const currPending = state.entries.entries.get(ref)?.data;
          if (currPending !== pending.ref) {
            throw new Error(`Pending entries get cancelled, ref ${JSON.stringify(ref)}`);
          }
          const mainType = res.info.columns[1].valueType;
          const entries = Object.fromEntries(res.result.rows.map<[number, string]>(row => {
            const id = row.values[0].value;
            const main = valueToText(mainType, row.values[1].value);
            return [id, main];
          }));
          const changes = ((rootState as any).staging as IStagingState).current;
          commit("updateEntries", { ref, entries });
          commit("updateUserViewSummaries", { ref: ref.entity, entries, changes });
          return entries;
        } catch (e) {
          const currPending = state.entries.entries.get(ref)?.data;
          if (currPending === pending.ref) {
            commit("updateEntries", { ref, entries: e });
          }
          throw e;
        }
      })();
      commit("initEntries", { ref, reference, generation: state.generation, entries: pending.ref });
      return pending.ref;
    },
    getEntity: ({ state, commit, dispatch }, ref: IEntityRef): Promise<IEntity> => {
      const oldGen = state.entities.entities.get(ref);
      if (oldGen !== undefined) {
        const old = oldGen.data;
        if (old instanceof Error) {
          return Promise.reject(old);
        } else if (old instanceof Promise) {
          return old;
        } else {
          return Promise.resolve(old);
        }
      }

      const pending: IRef<Promise<IEntity>> = {};
      pending.ref = (async () => {
        try {
          const entity: IEntity = await dispatch("callProtectedApi", {
            func: Api.getEntityInfo.bind(Api),
            args: [ref],
          }, { root: true });
          const currPending = state.entities.entities.get(ref)?.data;
          if (currPending !== pending.ref) {
            throw new Error(`Pending entity get cancelled, ref ${JSON.stringify(ref)}`);
          }
          commit("updateEntity", { ref, entity });
          return entity;
        } catch (e) {
          const currPending = state.entities.entities.get(ref)?.data;
          if (currPending === pending.ref) {
            commit("updateEntity", { ref, entity: e });
          }
          throw e;
        }
      })();
      commit("initEntity", { ref, generation: state.generation, entity: pending.ref });
      return pending.ref;
    },
    getUserView: (context, { reference, root, args }: { reference: ReferenceName; root: boolean; args: IUserViewArguments }): Promise<CombinedUserView> => {
      const { state, commit } = context;

      const oldResource = state.current.userViews.getResource(args);
      if (oldResource !== undefined) {
        if (!(reference in oldResource.refs)) {
          commit("addUserViewConsumer", { args, reference });
        }
        const data = oldResource.value.data;
        if (data instanceof CombinedUserView) {
          return Promise.resolve(data);
        } else if (data instanceof Promise) {
          return data;
        } else {
          return Promise.reject(data);
        }
      }

      const pending: IRef<Promise<CombinedUserView>> = {};
      pending.ref = (async () => {
        let current: UserViewError | CombinedUserView;
        try {
          current = await fetchUserView(context, args);
          const currPending = state.current.userViews.get(args)?.data;
          if (currPending !== pending.ref) {
            throw new Error(`Pending view get cancelled for scope ${reference}, args ${JSON.stringify(args)}`);
          }
          commit("updateUserView", { args, userView: current });
          if (current instanceof CombinedUserView) {
            prefetchUserViewInfo(context, current);
          }
        } catch (e) {
          const currPending = state.current.userViews.get(args)?.data;
          if (currPending === pending.ref) {
            commit("updateUserView", { args, userView: e });
          }
          throw e;
        }
        if (current instanceof UserViewError) {
          throw current;
        } else {
          return current;
        }
      })();
      commit("initUserView", { args, reference, meta: { root }, generation: state.generation, userView: pending.ref });
      return pending.ref;
    },
    reload: async context => {
      const { state, commit } = context;
      if (state.pendingReload !== null) {
        return state.pendingReload;
      }
      commit("bumpGeneration");

      const pendingReload = (async () => {
        // Prefetch root user views.
        const generation = state.generation;
        const prefetchesPromises = mapMaybe(resource => {
          if (Object.values(resource.refs).find(meta => meta.root) === undefined) return;

          const args = resource.value[0];

          return (async () => {
            const ret = await fetchUserView(context, args);
            return [args, ret] as [IUserViewArguments, CombinedUserView | UserViewError];
          })();
        }, state.current.userViews.resources());
        const prefetches = await Promise.all(prefetchesPromises);
        prefetches.forEach(([args, ret]) => {
          const existing = state.current.userViews.get(args);
          if (existing !== undefined) {
            commit("updateUserView", { args, generation, userView: ret });
          }
        });
        state.current.userViews.entries().forEach(([args, gen]) => {
          if (gen.generation !== generation) {
            state.current.userViews.forceRemove(args);
          }
        });
      })();

      commit("setPendingReload", pendingReload);
      return pendingReload;
    },

    // Called from stagingChanges.
    afterUpdateField: ({ state, rootState, commit, dispatch }, args: { fieldRef: IFieldRef; id: RowId; value: any }) => {
      const changes = ((rootState as any).staging as IStagingState).current;
      const updatedValue = changes.changes[args.fieldRef.entity.schema][args.fieldRef.entity.name].updated[args.id][args.fieldRef.name];
      const fieldType = state.entities.getEntity(args.fieldRef.entity)?.columnFields[args.fieldRef.name].fieldType;
      if (fieldType && fieldType.type === "reference") {
        dispatch("getEntries", { ref: fieldType as IEntriesRef, reference: "update" });
      }
      commit("updateField", { ...args, updatedValue, fieldType });
    },
    afterAddEntry: ({ rootState, commit }, args: { entityRef: IEntityRef; userView: UserViewKey; id: AddedRowId; position: number }) => {
      const changes = ((rootState as any).staging as IStagingState).current;
      const uvAdded = changes.changes[args.entityRef.schema][args.entityRef.name].added[args.userView];
      // We take a slice to ensure positions won't be updated externally in staging before our newRows object gets populated.
      const positions = uvAdded.positions.slice();
      const newValues = uvAdded.entries[args.id];
      commit("addEntry", { ...args, positions, newValues });
    },
    afterSetAddedField: ({ state, rootState, commit, dispatch }, args: { fieldRef: IFieldRef; userView: UserViewKey; id: AddedRowId; value: any }) => {
      const changes = ((rootState as any).staging as IStagingState).current;
      const addedEntry = changes.changes[args.fieldRef.entity.schema][args.fieldRef.entity.name].added[args.userView].entries[args.id];
      const fieldType = state.entities.getEntity(args.fieldRef.entity)?.columnFields[args.fieldRef.name].fieldType;
      if (fieldType && fieldType.type === "reference") {
        dispatch("getEntries", { ref: fieldType as IEntriesRef, reference: "update" });
      }
      commit("setAddedField", { ...args, addedEntry, fieldType });
    },
    afterDeleteEntry: ({ commit }, args: { entityRef: IEntityRef; id: RowId }) => {
      commit("deleteEntry", args);
    },
    beforeResetChanges: ({ rootState, commit }) => {
      const changes = ((rootState as any).staging as IStagingState).current;
      commit("resetChanges", changes);
    },
    beforeResetUpdatedField: ({ commit }, args: { fieldRef: IFieldRef; id: RowId }) => {
      commit("resetUpdatedField", args);
    },
    beforeResetAddedEntry: ({ rootState, commit }, args: { entityRef: IEntityRef; userView: UserViewKey; id: AddedRowId }) => {
      const changes = ((rootState as any).staging as IStagingState).current;
      commit("resetAddedEntry", args);
    },
    beforeResetDeleteEntry: ({ commit }, args: { entityRef: IEntityRef; id: RowId }) => {
      commit("resetDeleteEntry", args);
    },
    updateErroredOnce: ({ rootState, commit }) => {
      const changes = ((rootState as any).staging as IStagingState).current;
      commit("updateErroredOnce", changes);
    },
  },
};

export default userViewModule;

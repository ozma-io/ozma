import Vue from "vue";
import { Store, Dispatch, Module, ActionContext } from "vuex";
import moment from "moment";

import { IRef, FetchError, momentLocale, tryDicts } from "@/utils";
import * as Api from "@/api";
import {
    IColumnField, IEntityRef, IFieldRef, IResultViewInfo, IExecutedRow, IExecutedValue,
    IReferenceFieldType, SchemaName, EntityName, RowId, FieldName, AttributeName,
    ValueType, FieldType, AttributesMap,
} from "@/api";
import { IUpdatedValue, FieldsInfo, valueToRaw, insertFieldsInfo, equalEntityRef, valueFromRaw } from "@/values";
import { CurrentChanges, UpdatedValues, IEntityChanges, IAddedEntry, AddedRowId } from "@/state/staging_changes";

export interface IAnonymousUserView {
    type: "anonymous";
    query: string;
}

export interface INamedUserView {
    type: "named";
    ref: Api.IUserViewRef;
}

export interface IUserViewArguments {
    source: IAnonymousUserView | INamedUserView;
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
    rawValue?: any;
    erroredOnce?: boolean;
    initialValue?: any;
    // `undefined` is used when pun is not yet resolved, to avoid adding/removing values.
    pun?: string | undefined;
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
export type IMainRowMapping = Record<number, number[]>;

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

const getEntitySummaries = (entries: EntriesMap, fieldType: FieldType) => {
    if (fieldType.type === "reference") {
        const schemaSummaries = entries[fieldType.entity.schema];
        if (schemaSummaries !== undefined) {
            const entitySummaries = schemaSummaries[fieldType.entity.name];
            if (entitySummaries !== undefined) {
                if (!(entitySummaries instanceof Promise)) {
                    return entitySummaries;
                }
            }
        }
    }
    return null;
};

// Expects "updated" to exist
const setUpdatedPun = (entitySummaries: Record<RowId, string>, value: any) => {
    if (value.value !== null) {
        value.pun = entitySummaries[value.value];
        console.assert(value.pun !== undefined);
    } else {
        value.pun = "";
    }
};

// Returns `null` when there's no pun. Returns `undefined` when pun cannot be resolved now.
const setOrRequestUpdatedPun = (context: { dispatch: Dispatch, state: IUserViewState }, value: ICombinedValue, fieldType: FieldType) => {
    const { dispatch, state } = context;

    // We don't use `getEntitySummaries` because we request new entries only if Promise wasn't found -- for performance.
    if (fieldType.type === "reference") {
        if (value.value === null || value.value === undefined) {
            value.pun = "";
        } else {
            const schemaSummaries = state.entries[fieldType.entity.schema];
            if (schemaSummaries !== undefined) {
                const entitySummaries = schemaSummaries[fieldType.entity.name];
                if (entitySummaries !== undefined) {
                    if (!(entitySummaries instanceof Promise)) {
                        value.pun = entitySummaries[value.value];
                        console.assert(value.pun !== undefined);
                        return;
                    }
                } else {
                    // We use global naming here because this function is used both from global store and the module.
                    dispatch("userView/getEntries", fieldType.entity, { root: true });
                }
            } else {
                dispatch("userView/getEntries", fieldType.entity, { root: true });
            }
            value.pun = undefined;
        }
    }
};

const clearUpdatedValue = (value: ICombinedValue) => {
    if ("pun" in value) {
        console.assert(value.initialPun !== undefined);
        value.pun = value.initialPun;
    }
    console.assert(value.initialValue !== undefined);
    value.value = value.initialValue;
    if ("erroredOnce" in value) {
        value.erroredOnce = false;
    }
};

export const newEmptyRow = (store: Store<any>, uv: CombinedUserView, defaultRawValues: Record<string, any>): IRowCommon => {
    const eref = uv.info.mainEntity;
    if (eref === null) {
        throw new Error("Main entity cannot be null");
    }

    const context = {
        state: store.state.userView,
        dispatch: store.dispatch,
    };

    const values = uv.info.columns.map((info, colI) => {
        const columnAttrs = uv.columnAttributes[colI];
        const viewAttrs = uv.attributes;
        const getColumnAttr = (name: string) => tryDicts(name, columnAttrs, viewAttrs);

        if (info.mainField !== null) {
            let rawValue: any;
            if (info.mainField.name in defaultRawValues) {
                rawValue = defaultRawValues[info.mainField.name];
            } else {
                rawValue = getColumnAttr("DefaultValue");
            }
            const defaultValue = valueFromRaw(info.mainField.field, rawValue);
            const initialValue = defaultValue !== undefined ? defaultValue : info.mainField.field.defaultValue;
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
                rawValue: valueToRaw(info.valueType, initialValue),
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

// For each entity contains array of all accessible entries (main fields) identified by id
export type Entries = Record<RowId, string>;
export type EntriesMap = Record<SchemaName, Record<EntityName, Entries | Promise<Entries>>>;

export interface IUserViewEventHandler {
    updateValue: (rowIndex: number, row: ICombinedRow, columnIndex: number, value: ICombinedValue) => void;
    updateAddedValue: (rowId: AddedRowId, row: IAddedRow, columnIndex: number, value: ICombinedValue) => void;
    deleteRow: (rowIndex: number, row: ICombinedRow) => void;
    undeleteRow: (rowIndex: number, row: ICombinedRow) => void;
    insertAddedRow: (rowId: AddedRowId, row: IAddedRow) => void;
    deleteAddedRow: (rowId: AddedRowId, row: IAddedRow) => void;
}

interface ICombinedUserViewParams {
    args: IUserViewArguments;
    info: IResultViewInfo;
    attributes: Record<AttributeName, any>;
    columnAttributes: Array<Record<AttributeName, any>>;
    rows: IExecutedRow[] | null;
    changes: CurrentChanges;
}

// Combine initial user view response with current staging data, entry summaries map and extra data needed by a user view representation.
export class CombinedUserView {
    args: IUserViewArguments;
    homeSchema: SchemaName | null;
    info: IResultViewInfo;
    attributes: Record<AttributeName, any>;
    columnAttributes: Array<Record<AttributeName, any>>;
    newRows: Record<AddedRowId, IAddedRow>;
    newRowsPositions: AddedRowId[];
    rows: ICombinedRow[] | null;
    updateMapping: IUpdateMapping;
    mainColumnMapping: IMainColumnMapping;
    mainRowMapping: IMainRowMapping;
    handlers: IUserViewEventHandler[] = [];

    // Warning: it takes ownership of all params and mutates!
    constructor(context: ActionContext<IUserViewState, {}>, params: ICombinedUserViewParams) {
        const { args, info, attributes, columnAttributes, rows, changes } = params;
        this.args = args;
        this.info = info;
        this.attributes = attributes;
        this.columnAttributes = columnAttributes;
        this.homeSchema = homeSchema(args);

        let mainChanges: IEntityChanges | null = null;
        if (info.mainEntity !== null) {
            const eref = info.mainEntity;
            mainChanges = changes.changesForEntity(eref.schema, eref.name);

            const mainColumnMapping: IMainColumnMapping = {};
            info.columns.forEach((columnInfo, colI) => {
                const mainField = columnInfo.mainField;
                if (mainField !== null) {
                    insertMainColumnMapping(mainColumnMapping, mainField.name, colI);
                }
            });

            this.newRows = Object.fromEntries(Object.entries(mainChanges.added.entries).map(([newIdRaw, entry]) => {
                const newId = Number(newIdRaw);
                const row = entry.values;

                const values = info.columns.map(columnInfo => {
                    const mainField = columnInfo.mainField;

                    if (mainField !== null) {
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

            this.newRowsPositions = mainChanges.added.positions;
            this.mainColumnMapping = mainColumnMapping;
        } else {
            this.newRows = {};
            this.newRowsPositions = [];
            this.mainColumnMapping = {};
        }

        if (rows !== null) {
            // First step - convert values by type
            info.columns.forEach((columnInfo, colI) => {
                if (columnInfo.valueType.type === "datetime" || columnInfo.valueType.type === "date") {
                    rows.forEach(row => {
                        const cell = row.values[colI];
                        if (typeof cell.value === "number") {
                            cell.value = moment.utc(cell.value * 1000);
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
                    const updateInfo = {
                        field: field.field,
                        fieldRef: field.ref,
                        id,
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

                    const eref = field.ref.entity;

                    const entityChanges = changes.changesForEntity(eref.schema, eref.name);
                    const entityUpdated = entityChanges.updated[id];
                    if (entityUpdated !== undefined) {
                        const updated = entityUpdated[field.ref.name];
                        if (updated !== undefined) {
                            Object.assign(value, updated);
                            const fieldType = field.field!.fieldType;
                            setOrRequestUpdatedPun(context, value, fieldType);
                        }
                    }

                    if (value.rawValue === undefined) {
                        value.rawValue = valueToRaw(columnInfo.valueType, value.value);
                    }

                    const valueRef = {
                        index: rowI,
                        column: colI,
                    };

                    insertUpdateMapping(updateMapping, field.ref, id, valueRef);
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
                    if (field.field === null || !fieldPredicate(field.field)) {
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

    forEachDeletedRow(rowFunc: (row: ICombinedRow, rowI: number) => void, schema: SchemaName, entity: EntityName, id: RowId) {
        if (this.rows === null ||
                this.info.mainEntity === null ||
                this.info.mainEntity.schema !== schema ||
                this.info.mainEntity.name !== entity) {
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

export type UserViewErrorType = "forbidden" | "not_found" | "bad_request" | "unknown";

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

export class CurrentUserViews {
    rootArgs: IUserViewArguments | null = null;
    userViews: Record<string, CombinedUserView | UserViewError | Promise<CombinedUserView>> = {};
    lastLocalId: number = 0;

    get rootView() {
        if (this.rootArgs === null) {
            return null;
        } else {
            return this.getUserView(this.rootArgs);
        }
    }

    setUserView(args: IUserViewArguments, uv: CombinedUserView | UserViewError | Promise<CombinedUserView>) {
        Vue.set(this.userViews, userViewHash(args), uv);
    }

    getUserView(args: IUserViewArguments) {
        const uv = this.userViews[userViewHash(args)];
        if (uv === null || uv instanceof Promise) {
            return null;
        } else {
            return uv;
        }
    }
}

export interface IUserViewState {
    current: CurrentUserViews;
    pending: Promise<CombinedUserView> | null;
    entries: EntriesMap;
    fieldsInfo: FieldsInfo;
    errors: string[];
}

export const homeSchema = (args: IUserViewArguments): SchemaName | null => {
    if (args.source.type === "named") {
        return args.source.ref.schema;
    } else {
        return null;
    }
};

export const valueReferenceName = (entriesMap: EntriesMap, fieldType: IReferenceFieldType, value: any) => {
    if (value !== undefined && value !== null) {
        const ref = fieldType.entity;
        const schemaMap = entriesMap[ref.schema];
        if (schemaMap !== undefined) {
            const refEntries = schemaMap[ref.name];
            if (refEntries !== undefined && !(refEntries instanceof Promise)) {
                return refEntries[value];
            }
        }
    }
    return null;
};

export const valueToText = (valueType: ValueType, value: ICombinedValue): string => {
    if (value.pun !== undefined) {
        return value.pun;
    } else {
        return String(valueToRaw(valueType, value.value));
    }
};

const userViewHash = (args: IUserViewArguments): string => {
    let query: string[];
    if (args.source.type === "anonymous") {
        query = ["anonymous", args.source.query];
    } else if (args.source.type === "named") {
        query = [args.source.ref.schema, args.source.ref.name];
    } else {
        throw new Error("Invalid source type");
    }
    if (args.args === null) {
        query.push("info");
    } else {
        const queryArgs = Object.entries(args.args).map(([name, arg]) => `${name}=${JSON.stringify(arg)}`);
        if (queryArgs.length !== 0) {
            query.push(queryArgs.join(","));
        }
    }
    return query.join(".");
};

const getUserView = async (context: ActionContext<IUserViewState, {}>, args: IUserViewArguments): Promise<CombinedUserView | UserViewError> => {
    const { dispatch } = context;
    try {
        let current: CombinedUserView;
        if (args.source.type === "named") {
            if (args.args === null) {
                const res: Api.IViewInfoResult = await dispatch("callProtectedApi", {
                    func: Api.fetchNamedViewInfo,
                    args: [args.source.ref],
                }, { root: true });
                await momentLocale;
                current = new CombinedUserView(context, {
                    args,
                    info: res.info,
                    attributes: res.pureAttributes,
                    columnAttributes: res.pureColumnAttributes,
                    rows: null,
                    changes: (context.rootState as any).staging.current,
                });
            } else {
                const res: Api.IViewExprResult = await dispatch("callProtectedApi", {
                    func: Api.fetchNamedView,
                    args: [args.source.ref, args.args],
                }, { root: true });
                await momentLocale;
                current = new CombinedUserView(context, {
                    args,
                    info: res.info,
                    attributes: res.result.attributes,
                    columnAttributes: res.result.columnAttributes,
                    rows: res.result.rows,
                    changes: (context.rootState as any).staging.current,
                });
            }
        } else if (args.source.type === "anonymous") {
            if (args.args === null) {
                throw Error("Getting information about anonymous views is not supported");
            } else {
                const res: Api.IViewExprResult = await dispatch("callProtectedApi", {
                    func: Api.fetchAnonymousView,
                    args: [args.source.query, args.args],
                }, { root: true });
                await momentLocale;
                current = new CombinedUserView(context, {
                    args,
                    info: res.info,
                    attributes: res.result.attributes,
                    columnAttributes: res.result.columnAttributes,
                    rows: res.result.rows,
                    changes: (context.rootState as any).staging.current,
                });
            }
        } else {
            throw new Error("Invalid source type");
        }
        return current;
    } catch (e) {
        if (e instanceof FetchError) {
            if (e.response.status === 403) {
                return new UserViewError("forbidden", "", args);
            } else if (e.response.status === 404) {
                return new UserViewError("not_found", "", args);
            } else if (e.response.status === 400) {
                return new UserViewError("bad_request", e.message, args);
            } else {
                return new UserViewError("unknown", e.message, args);
            }
        }

        throw e;
    }
};

const userViewModule: Module<IUserViewState, {}> = {
    namespaced: true,
    state: {
        current: new CurrentUserViews(),
        pending: null,
        entries: {},
        errors: [],
        fieldsInfo: {},
    },
    mutations: {
        addError: (state, lastError: string) => {
            state.errors.push(lastError);
        },
        removeError: (state, errorIndex: number) => {
            state.errors.splice(errorIndex, 1);
        },

        setUserView: (state, { args, userView, isRoot }: { args: IUserViewArguments, userView: CombinedUserView | Promise<CombinedUserView>, isRoot?: boolean }) => {
            state.current.setUserView(args, userView);
            if (isRoot) {
                state.current.rootArgs = args;
            }
        },
        addFieldsInfo: (state, info: IResultViewInfo) => {
            insertFieldsInfo(state.fieldsInfo, info);
        },
        setPending: (state, pending: Promise<CombinedUserView>) => {
            state.pending = pending;
        },
        clear: state => {
            state.current = new CurrentUserViews();
            state.entries = {};
            state.errors = [];
            state.fieldsInfo = {};
            state.pending = null;
        },

        setEntries: (state, { ref, entries }: { ref: IEntityRef, entries: Entries | Promise<Entries> }) => {

            let entities = state.entries[ref.schema];
            if (entities === undefined) {
                entities = {};
                Vue.set(state.entries, ref.schema, entities);
            }

            Vue.set(entities, ref.name, entries);
        },
        updateUserViewSummaries: (state, params: { ref: IEntityRef, entries: Entries, changes: CurrentChanges }) => {
            const { ref, entries, changes } = params;

            const filterReference = (field: IColumnField) => {
                return field.fieldType.type === "reference" && equalEntityRef(field.fieldType.entity, ref);
            };

            Object.values(state.current.userViews).forEach(uv => {
                if (!(uv instanceof CombinedUserView)) {
                    return;
                }

                // Update old updated rows
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
                    if (columnInfo.mainField === null) {
                        return;
                    }

                    const fieldType = columnInfo.mainField.field.fieldType;
                    if (!(fieldType.type === "reference" && equalEntityRef(fieldType.entity, ref))) {
                        return;
                    }

                    uv.newRowsPositions.forEach((rowId, rowI) => {
                        const row = uv.newRows[rowId];
                        const value = row.values[colI];
                        setUpdatedPun(entries, value);
                        uv.handlers.forEach(handler => {
                            handler.updateAddedValue(rowId, row, colI, value);
                        });
                    });
                });
            });
        },
        clearEntries: (state, ref: IEntityRef) => {
            const entities = state.entries[ref.schema];
            if (entities === undefined) {
                return;
            }

            Vue.delete(entities, ref.name);
        },

        updateField: (state, params: { schema: SchemaName, entity: EntityName, id: number, field: FieldName, updatedValue: IUpdatedValue, fieldType: FieldType }) => {
            const entitySummaries = getEntitySummaries(state.entries, params.fieldType);

            Object.values(state.current.userViews).forEach(uv => {
                if (!(uv instanceof CombinedUserView)) {
                    return;
                }

                if (uv.rows === null) {
                    return;
                }

                const updatedEntities = uv.updateMapping[params.schema];
                if (updatedEntities === undefined) {
                    return;
                }
                const updatedIds = updatedEntities[params.entity];
                if (updatedIds === undefined) {
                    return;
                }
                const updatedFields = updatedIds[params.id];
                if (updatedFields === undefined) {
                    return;
                }

                const updatedValues = updatedFields[params.field];
                if (updatedValues === undefined) {
                    return;
                }

                updatedValues.forEach(valueRef => {
                    const row = (uv.rows as ICombinedRow[])[valueRef.index];
                    // New object because otherwise Vue won't detect changes.
                    const value = Object.assign({}, row.values[valueRef.column], params.updatedValue);
                    Vue.set(row.values, valueRef.column, value);
                    if (entitySummaries !== null && "pun" in value) {
                        setUpdatedPun(entitySummaries, value);
                    }

                    uv.handlers.forEach(handler => {
                        handler.updateValue(valueRef.index, row, valueRef.column, value);
                    });
                });
            });
        },
        // Expects all values to be empty, therefore doesn't set updated puns!
        addEntry: (state, params: { schema: SchemaName, entity: EntityName, id: number, positions: AddedRowId[], newValues: UpdatedValues }) => {
            Object.values(state.current.userViews).forEach(uv => {
                if (!(uv instanceof CombinedUserView) ||
                        uv.info.mainEntity === null ||
                        uv.info.mainEntity.schema !== params.schema ||
                        uv.info.mainEntity.name !== params.entity) {
                    return;
                }
                const eref = uv.info.mainEntity;

                const values = uv.info.columns.map((column, colI) => {
                    if (column.mainField !== null) {
                        const updateInfo = {
                            id: params.id,
                            field: column.mainField.field,
                            fieldRef: {
                                entity: eref,
                                name: column.mainField.name,
                            },
                        };
                        const updated = params.newValues[column.mainField.name];
                        if (updated !== undefined) {
                            return { info: updateInfo, ...updated };
                        } else {
                            return {
                                value: null,
                                rawValue: "",
                                info: updateInfo,
                            };
                        }
                    } else {
                        return {
                            value: undefined,
                        };
                    }
                });

                const newRow = {
                    values,
                };

                Vue.set(uv.newRows, params.id, newRow);
                uv.handlers.forEach(handler => {
                    handler.insertAddedRow(params.id, newRow);
                });
                uv.newRowsPositions = params.positions;
            });
        },
        setAddedField: (state, params: { schema: SchemaName, entity: EntityName, id: number, field: FieldName, addedEntry: IAddedEntry, fieldType: FieldType }) => {
            const entitySummaries = getEntitySummaries(state.entries, params.fieldType);
            Object.values(state.current.userViews).forEach(uv => {
                if (!(uv instanceof CombinedUserView) ||
                        uv.info.mainEntity === null ||
                        uv.info.mainEntity.schema !== params.schema ||
                        uv.info.mainEntity.name !== params.entity) {
                    return;
                }

                const newRow = uv.newRows[params.id];
                uv.mainColumnMapping[params.field].forEach(colI => {
                    // New object because otherwise Vue won't detect changes.
                    const updated = params.addedEntry.values[params.field];
                    const value = Object.assign({}, newRow.values[colI], updated);
                    Vue.set(newRow.values, colI, value);
                    if (entitySummaries !== null && "pun" in value) {
                        setUpdatedPun(entitySummaries, value);
                    }

                    uv.handlers.forEach(handler => {
                        handler.updateAddedValue(params.id, newRow, colI, value);
                    });
                });
            });
        },
        deleteEntry: (state, params: { schema: SchemaName, entity: EntityName, id: number }) => {
            Object.values(state.current.userViews).forEach(uv => {
                if (!(uv instanceof CombinedUserView)) {
                    return;
                }

                const deleteOneRow = (row: ICombinedRow, rowI: number) => {
                    row.deleted = true;
                    uv.handlers.forEach(handler => {
                        handler.deleteRow(rowI, row);
                    });
                };

                uv.forEachDeletedRow(deleteOneRow, params.schema, params.entity, params.id);
            });
        },
        resetChanges: (state, current: CurrentChanges) => {
            Object.values(state.current.userViews).forEach(uv => {
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

                if (uv.rows !== null &&
                        uv.info.mainEntity !== null) {
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
        resetUpdatedEntry: (state, params: { schema: SchemaName, entity: EntityName, id: number, currentChanges: CurrentChanges }) => {
            const changedSchema = params.currentChanges.changes[params.schema];
            if (changedSchema === undefined) {
                return;
            }

            const changedEntity = changedSchema[params.entity];
            if (changedEntity === undefined) {
                return;
            }

            const changedEntry = changedEntity.updated[params.id];
            if (changedEntry === undefined) {
                return;
            }

            Object.values(state.current.userViews).forEach(uv => {
                if (!(uv instanceof CombinedUserView)) {
                    return;
                }

                if (uv.rows === null) {
                    return;
                }

                const updatedEntities = uv.updateMapping[params.schema];
                if (updatedEntities === undefined) {
                    return;
                }
                const updatedIds = updatedEntities[params.entity];
                if (updatedIds === undefined) {
                    return;
                }
                const updatedFields = updatedIds[params.id];
                if (updatedFields === undefined) {
                    return;
                }

                Object.keys(changedEntry).forEach(field => {
                    const updatedValues = updatedFields[field];
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
            });
        },
        resetAddedEntry: (state, params: { schema: SchemaName, entity: EntityName, id: number, positions: AddedRowId[] }) => {
            Object.values(state.current.userViews).forEach(uv => {
                if (!(uv instanceof CombinedUserView) ||
                        uv.info.mainEntity === null ||
                        uv.info.mainEntity.schema !== params.schema ||
                        uv.info.mainEntity.name !== params.entity) {
                    return;
                }

                uv.newRowsPositions = params.positions;
                const row = uv.newRows[params.id];
                Vue.delete(uv.newRows, params.id);
                uv.handlers.forEach(handler => {
                    handler.deleteAddedRow(params.id, row);
                });
            });
        },
        resetDeleteEntry: (state, params: { schema: SchemaName, entity: EntityName, id: number }) => {
            Object.values(state.current.userViews).forEach(uv => {
                if (!(uv instanceof CombinedUserView)) {
                    return;
                }

                const undeleteOneRow = (row: ICombinedRow, rowI: number) => {
                    row.deleted = false;
                    uv.handlers.forEach(handler => {
                        handler.undeleteRow(rowI, row);
                    });
                };

                uv.forEachDeletedRow(undeleteOneRow, params.schema, params.entity, params.id);
            });
        },
        clearAdded: state => {
            Object.values(state.current.userViews).forEach(uv => {
                if (!(uv instanceof CombinedUserView)) {
                    return;
                }

                uv.newRows = [];
            });
        },
        updateErroredOnce: (state, changes: CurrentChanges) => {
            Object.values(state.current.userViews).forEach(uv => {
                if (!(uv instanceof CombinedUserView)) {
                    return;
                }

                const mainEntity = uv.info.mainEntity;
                if (mainEntity !== null) {
                    const schemaChanges = changes.changes[mainEntity.schema];
                    if (schemaChanges !== undefined) {
                        const entityChanges = schemaChanges[mainEntity.name];
                        if (entityChanges !== undefined) {
                            Object.entries(entityChanges.added.entries).forEach(([addedIdStr, rowValues]) => {
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

        registerHandler: (state, { args, handler }: { args: IUserViewArguments, handler: IUserViewEventHandler }) => {
            const uv = state.current.getUserView(args);
            if (!(uv instanceof CombinedUserView)) {
                throw Error("User view does not exist");
            }
            if (uv.handlers.includes(handler)) {
                return;
            }
            uv.handlers.push(handler);
        },
        unregisterHandler: (state, { args, handler }: { args: IUserViewArguments, handler: IUserViewEventHandler }) => {
            const uv = state.current.getUserView(args);
            if (!(uv instanceof CombinedUserView)) {
                return;
            }
            const pos = uv.handlers.indexOf(handler);
            if (pos !== -1) {
                uv.handlers.splice(pos, 1);
            }
        },
    },
    actions: {
        getEntries: ({ state, rootState, commit, dispatch }, ref: IEntityRef) => {
            if (state.pending !== null) {
                return;
            }
            if (ref.schema in state.entries && ref.name in state.entries[ref.schema]) {
                return;
            }

            const pending: IRef<Promise<Entries>> = {};
            pending.ref = (async () => {
                try {
                    const query = `SELECT "Id", __main AS "Main" FROM "${ref.schema}"."${ref.name}" ORDER BY __main`;
                    const res: Api.IViewExprResult = await dispatch("callProtectedApi", {
                        func: Api.fetchAnonymousView,
                        args: [query, {}],
                    }, { root: true });
                    if (!(ref.schema in state.entries && state.entries[ref.schema][ref.name] === pending.ref)) {
                        throw Error("Pending operation cancelled");
                    }
                    const mainType = res.info.columns[1].valueType;
                    const entries = Object.fromEntries(res.result.rows.map<[number, string]>(row => {
                        const id = row.values[0].value;
                        const main = valueToRaw(mainType, row.values[1].value);
                        return [id, main];
                    }));
                    const changes: CurrentChanges = (rootState as any).staging.current;
                    commit("setEntries", { ref, entries });
                    commit("updateUserViewSummaries", { ref, entries, changes });
                    return entries;
                } catch (e) {
                    if (ref.schema in state.entries && state.entries[ref.schema][ref.name] === pending.ref) {
                        commit("clearEntries", ref);
                    }
                    throw e;
                }
            })();
            commit("setEntries", { ref, entries: pending.ref });
        },
        getRootView: (store, args: IUserViewArguments) => {
            const { state, commit } = store;
            const pending: IRef<Promise<CombinedUserView>> = {};
            pending.ref = (async () => {
                let current: UserViewError | CombinedUserView;
                try {
                    current = await getUserView(store, args);
                    if (state.pending !== pending.ref) {
                        throw Error("Pending operation cancelled");
                    }
                    commit("clear");
                    commit("setUserView", { args, userView: current, isRoot: true });
                    if (current instanceof CombinedUserView) {
                        commit("addFieldsInfo", current.info);
                    }
                } catch (e) {
                    if (state.pending === pending.ref) {
                        commit("clear");
                        commit("addError", e.message);
                    }
                    throw e;
                }
                if (current instanceof UserViewError) {
                    throw current;
                } else {
                    return current;
                }
            })();
            commit("setPending", pending.ref);
            return pending.ref;
        },
        getNestedView: (store, args: IUserViewArguments) => {
            const { state, commit } = store;

            console.assert(state.pending === null);
            const uvHash = userViewHash(args);
            if (uvHash in state.current.userViews) {
                return;
            }

            const pending: IRef<Promise<CombinedUserView>> = {};
            pending.ref = (async () => {
                let current: UserViewError | CombinedUserView;
                try {
                    current = await getUserView(store, args);
                    if (state.current.userViews[uvHash] !== pending.ref) {
                        throw Error("Pending operation cancelled");
                    }
                    commit("setUserView", { args, userView: current });
                    if (current instanceof CombinedUserView) {
                        commit("addFieldsInfo", current.info);
                    }
                } catch (e) {
                    if (state.current.userViews[uvHash] === pending.ref) {
                        commit("addError", e.message);
                    }
                    throw e;
                }
                if (current instanceof UserViewError) {
                    throw current;
                } else {
                    return current;
                }
            })();
            commit("setUserView", { args, userView: pending.ref });
            return pending.ref;
        },
        reload: async ({ state, dispatch }) => {
            if (state.current.rootView === null) {
                return;
            }
            await dispatch("getRootView", state.current.rootView.args);
        },

        // Called from stagingChanges.
        afterUpdateField: ({ state, rootState, commit, dispatch }, args: { schema: SchemaName, entity: EntityName, id: number, field: FieldName, value: any }) => {
            const changes = (rootState as any).staging.current as CurrentChanges;
            const updatedValue = changes.changes[args.schema][args.entity].updated[args.id][args.field];
            const fieldType = state.fieldsInfo[args.schema][args.entity][args.field].fieldType;
            if (fieldType.type === "reference") {
                dispatch("getEntries", fieldType.entity);
            }
            commit("updateField", { ...args, updatedValue, fieldType });
        },
        afterAddEntry: ({ state, rootState, commit }, args: { schema: SchemaName, entity: EntityName, position?: number }) => {
            const changes = (rootState as any).staging.current as CurrentChanges;
            const added = changes.changes[args.schema][args.entity].added;
            let id: number;
            if (args.position === undefined) {
                id = added.positions[added.positions.length - 1];
            } else {
                id = added.positions[args.position];
            }
            // We take a slice to ensure positions won't be updated externally in staging before our newRows object gets populated.
            const positions = added.positions.slice();
            const newValues = added.entries[id];
            commit("addEntry", { ...args, id, positions, newValues });
        },
        afterSetAddedField: ({ state, rootState, commit, dispatch }, args: { schema: SchemaName, entity: EntityName, id: number, field: FieldName, value: any }) => {
            const changes = (rootState as any).staging.current as CurrentChanges;
            const addedEntry = changes.changes[args.schema][args.entity].added.entries[args.id];
            const fieldType = state.fieldsInfo[args.schema][args.entity][args.field].fieldType;
            if (fieldType.type === "reference") {
                dispatch("getEntries", fieldType.entity);
            }
            commit("setAddedField", { ...args, addedEntry, fieldType });
        },
        afterDeleteEntry: ({ commit }, args: { schema: SchemaName, entity: EntityName, id: number }) => {
            commit("deleteEntry", args);
        },
        beforeResetChanges: ({ rootState, commit }) => {
            const changes = (rootState as any).staging.current as CurrentChanges;
            commit("resetChanges", changes);
        },
        beforeResetUpdatedEntry: ({ rootState, commit }, args: { schema: SchemaName, entity: EntityName, id: number }) => {
            const currentChanges = (rootState as any).staging.current as CurrentChanges;
            commit("resetUpdatedEntry", { ...args, currentChanges });
        },
        beforeResetAddedEntry: ({ rootState, commit }, args: { schema: SchemaName, entity: EntityName, id: number }) => {
            const changes = (rootState as any).staging.current as CurrentChanges;
            const positions = changes.changes[args.schema][args.entity].added.positions.slice();
            commit("resetAddedEntry", { ...args, positions });
        },
        beforeResetDeleteEntry: ({ commit }, args: { schema: SchemaName, entity: EntityName, id: number }) => {
            commit("resetDeleteEntry", args);
        },
        updateErroredOnce: ({ rootState, commit }) => {
            const changes = (rootState as any).staging.current as CurrentChanges;
            commit("updateErroredOnce", changes);
        },
    },
};

export default userViewModule;

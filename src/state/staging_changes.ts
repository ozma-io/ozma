import Vue from "vue";
import { Module, ActionContext } from "vuex";
import { Moment } from "moment";
import moment from "moment";

import { RecordSet, deepClone, mapMaybe, map2 } from "@/utils";
import { TransactionResult, RowId, SchemaName, FieldName, EntityName } from "@/api";
import { IUpdatedValue, IFieldInfo, EntityFieldsInfo, valueFromRaw, FieldsInfo } from "@/values";
import * as Api from "@/api";
import { i18n } from "@/modules";

export type ScopeName = string;

export type Scopes = RecordSet<ScopeName>;

export interface IScopedUpdatedValue extends IUpdatedValue {
    scopes: Scopes;
}

export type AddedValues = Record<FieldName, IUpdatedValue>;
export type UpdatedValues = Record<FieldName, IScopedUpdatedValue>;

export type AddedRowId = number;

export interface IAddedEntry {
    scopes: Scopes;
    values: AddedValues;
}

export interface IDeletedEntry {
    scopes: Scopes;
}

export interface IAddedEntries {
    nextId: number;
    // Actual updated values, indexed by unique id
    entries: Record<AddedRowId, IAddedEntry>;
    // Value positions
    positions: AddedRowId[];
}

export type AutoSaveLock = number;

export interface IEntityChanges {
    updated: Record<RowId, UpdatedValues>;
    // Applied to user views with FOR INSERT INTO
    added: IAddedEntries;
    // Applied to user views with FOR UPDATE OF (or FOR INSERT INTO)
    deleted: Record<RowId, IDeletedEntry>;
}

export interface IAddedResult {
    position: number;
    id: AddedRowId;
}

const emptyAdded: IAddedEntries = {
    nextId: 0,
    entries: {},
    positions: [],
};

const emptyUpdates: IEntityChanges = {
    updated: {},
    added: emptyAdded,
    deleted: {},
};

export interface ICombinedInsertEntityResult extends Api.IInsertEntityOp, Api.IInsertEntityResult {
}

export interface ICombinedUpdateEntityResult extends Api.IUpdateEntityOp, Api.IUpdateEntityResult {
}

export interface ICombinedDeleteEntityResult extends Api.IDeleteEntityOp, Api.IDeleteEntityResult {
}

export type CombinedTransactionResult = ICombinedInsertEntityResult | ICombinedUpdateEntityResult | ICombinedDeleteEntityResult;

export class CurrentChanges {
    changes: Record<SchemaName, Record<EntityName, IEntityChanges>> = {};

    get isEmpty() {
        return Object.entries(this.changes).length === 0;
    }

    getOrCreateChanges(schemaName: string, entityName: string): IEntityChanges {
        let entities = this.changes[schemaName];
        if (entities === undefined) {
            entities = {};
            Vue.set(this.changes, schemaName, entities);
        }

        let entity = entities[entityName];
        if (entity === undefined) {
            entity = deepClone(emptyUpdates);
            Vue.set(entities, entityName, entity);
        }

        return entity;
    }

    changesForEntity(schemaName: string, entityName: string): IEntityChanges {
        const entities = this.changes[schemaName];
        if (entities === undefined) {
            return emptyUpdates;
        }
        const changes = entities[entityName];
        if (changes === undefined) {
            return emptyUpdates;
        }
        return changes;
    }
}

export interface IStagingState {
    current: CurrentChanges;
    // Needed for quick checking whether any entries are added.
    addedCount: number;
    // Current submit promise
    currentSubmit: Promise<TransactionResult[]> | null;
    // Set if changes were made during the submit to decide how to clear.
    // We allow updating and removing entries while submit is ongoing, but not adding new ones to prevent duplicate inserts.
    touched: boolean;
    // FIXME: instead set errors for each change -- this requires transactions and per-change errors support in FunDB.
    errors: string[];
    autoSaveTimeout: number | null;
    autoSaveTimeoutId: NodeJS.Timeout | null;
    lastAutoSaveLock: AutoSaveLock;
    autoSaveLocks: Record<AutoSaveLock, null>;
}

const askOnClose = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    const msg = i18n.tc("confirm_close");
    e.returnValue = msg;
    return msg;
};

const stopAutoSave = ({ state, commit }: ActionContext<IStagingState, {}>) => {
    if (state.autoSaveTimeoutId !== null) {
        clearTimeout(state.autoSaveTimeoutId);
        commit("clearAutoSaveHandler");
    }
};

const startAutoSave = (context: ActionContext<IStagingState, {}>) => {
    const { state, commit, dispatch } = context;
    stopAutoSave(context);

    if (state.autoSaveTimeout !== null) {
        const timeoutId = setTimeout(() => {
            dispatch("submit");
        }, state.autoSaveTimeout);
        commit("setAutoSaveHandler", timeoutId);
    }
};

const checkAutoSave = (context: ActionContext<IStagingState, {}>) => {
    const { state, commit } = context;
    if (state.addedCount === 0 && state.currentSubmit === null && Object.entries(state.autoSaveLocks).length === 0) {
        startAutoSave(context);
    } else {
        stopAutoSave(context);
    }
};

const checkCounters = async (context: ActionContext<IStagingState, {}>) => {
    const { state } = context;
    if (state.current.isEmpty) {
        await context.dispatch("reset");
    } else {
        window.addEventListener("beforeunload", askOnClose);
        checkAutoSave(context);
    }
};

const changeToParam = (change: IUpdatedValue): any => {
    if (change.value === undefined) {
        throw new Error("Value didn't pass validation");
    }
    let arg;
    if (change.value instanceof moment) {
        arg = Math.floor((change.value as Moment).unix());
    } else {
        arg = change.value;
    }
    return arg;
};

const validateValue = (info: IFieldInfo, value: any): IUpdatedValue => {
    return {
        rawValue: value,
        value: valueFromRaw(info, value),
        erroredOnce: false,
    };
};

const getEntityFieldsInfo = (context: ActionContext<IStagingState, {}>, schema: SchemaName, entity: EntityName): EntityFieldsInfo => {
    const fieldsInfo: FieldsInfo = (context.rootState as any).userView.fieldsInfo;
    const schemaInfo = fieldsInfo[schema];
    if (schemaInfo === undefined) {
        throw new Error(`No schema info for schema ${schema}`);
    }
    const entityInfo = schemaInfo[entity];
    if (entityInfo === undefined) {
        throw new Error(`No entity info for entity ${schema}.${entity}`);
    }
    return entityInfo;
};

const getFieldInfo = (context: ActionContext<IStagingState, {}>, schema: SchemaName, entity: EntityName, field: FieldName): IFieldInfo => {
    const entityInfo = getEntityFieldsInfo(context, schema, entity);
    const fieldInfo = entityInfo[field];
    if (fieldInfo === undefined) {
        throw new Error(`No field info for field ${schema}.${entity}.${field}`);
    }
    return fieldInfo;
};

const getEmptyValues = (scope: ScopeName, entityInfo: EntityFieldsInfo): UpdatedValues => {
    return Object.fromEntries(Object.entries(entityInfo).filter(([name, info]) => !info.isNullable).map(([name, info]) => {
        const value = { value: undefined, rawValue: "", erroredOnce: false, scopes: { [scope]: null } };
        return [name, value];
    }));
};

const checkUpdatedFields = (fields: Record<FieldName, IUpdatedValue>) => {
    Object.values(fields).forEach(field => {
        field.erroredOnce = field.value === undefined;
    });
};

const resetUpdatedEntryValue = (state: IStagingState, entityChanges: IEntityChanges, id: RowId) => {
    Vue.delete(entityChanges.updated, id);
};

const resetAddedEntryValue = (state: IStagingState, entityChanges: IEntityChanges, id: AddedRowId) => {
    Vue.delete(entityChanges.added.entries, id);
    const position = entityChanges.added.positions.indexOf(id);

    if (position === -1) {
        throw Error("Impossible");
    }
    entityChanges.added.positions.splice(position, 1);
    state.addedCount -= 1;
};

const resetDeletedEntryValue = (state: IStagingState, entityChanges: IEntityChanges, id: RowId) => {
    Vue.delete(entityChanges.deleted, id);
};

const cleanupEntity = (state: IStagingState, schema: SchemaName, entity: EntityName, entityChanges: IEntityChanges) => {
    if (Object.keys(entityChanges.updated).length === 0 && entityChanges.added.positions.length === 0 && Object.keys(entityChanges.deleted).length === 0) {
        const schemaChanges = state.current.changes[schema];
        Vue.delete(schemaChanges, entity);
        if (Object.keys(schemaChanges).length === 0) {
            Vue.delete(state.current.changes, schema);
        }
    }
};

const resetScopeBy = ({ state, dispatch }: ActionContext<IStagingState, {}>, checkScope: (scopes: Scopes) => boolean) => {
    Object.entries(state.current.changes).forEach(([schema, schemaChanges]) => {
        Object.entries(schemaChanges).forEach(([entity, entityChanges]) => {
            Object.entries(entityChanges.added.entries).forEach(([addedIdStr, addedEntry]) => {
                const addedId = Number(addedIdStr);
                if (!checkScope(addedEntry.scopes)) {
                    dispatch("resetAddedEntry", { schema, entity, id: addedId });
                }
            });

            Object.entries(entityChanges.updated).forEach(([updatedIdStr, updatedEntry]) => {
                const updatedId = Number(updatedIdStr);
                Object.entries(updatedEntry).forEach(([fieldName, updatedField]) => {
                    if (!checkScope(updatedField.scopes)) {
                        dispatch("resetUpdatedField", { schema, entity, id: updatedId, field: fieldName });
                    }
                });
            });

            Object.entries(entityChanges.deleted).forEach(([deletedIdStr, deletedEntry]) => {
                const deletedId = Number(deletedIdStr);
                if (!checkScope(deletedEntry.scopes)) {
                    dispatch("resetDeleteEntry", { schema, entity, id: deletedId });
                }
            });
        });
    });
};

const stagingModule: Module<IStagingState, {}> = {
    namespaced: true,
    state: {
        current: new CurrentChanges(),
        addedCount: 0,
        currentSubmit: null,
        touched: false,
        errors: [],
        lastAutoSaveLock: 0,
        autoSaveTimeout: null,
        autoSaveTimeoutId: null,
        autoSaveLocks: {},
    },
    mutations: {
        clear: state => {
            state.current = new CurrentChanges();
            state.addedCount = 0;
            state.touched = false;
        },
        validate: state => {
            Object.entries(state.current.changes).forEach(([schemaName, entities]) => {
                Object.entries(entities).forEach(([entityName, entityChanges]) => {
                    Object.entries(entityChanges.updated).forEach(([updatedIdStr, updatedFields]) => {
                        checkUpdatedFields(updatedFields);
                    });
                    Object.values(entityChanges.added.entries).forEach(addedFields => {
                        checkUpdatedFields(addedFields.values);
                    });
                });
            });
        },
        setAutoSaveHandler: (state, timeoutId: NodeJS.Timeout) => {
            state.autoSaveTimeoutId = timeoutId;
        },
        clearAutoSaveHandler: state => {
            state.autoSaveTimeoutId = null;
        },
        setAutoSaveTimeout: (state, timeout: number | null) => {
            state.autoSaveTimeout = timeout;
        },
        addAutoSaveLock: state => {
            state.autoSaveLocks[state.lastAutoSaveLock] = null;
            state.lastAutoSaveLock++;
        },
        removeAutoSaveLock: (state, lock: AutoSaveLock) => {
            delete state.autoSaveLocks[lock];
        },
        startSubmit: (state, submit: Promise<TransactionResult[]>) => {
            state.touched = false;
            state.currentSubmit = submit;
        },
        finishSubmit: state => {
            state.currentSubmit = null;
            state.errors = [];
        },
        addError: (state, lastError: string) => {
            state.errors.push(lastError);
        },
        removeError: (state, errorIndex: number) => {
            state.errors.splice(errorIndex, 1);
        },
        updateField: (state, params: { scope: ScopeName, schema: SchemaName, entity: EntityName, id: RowId, field: FieldName, value: any, fieldInfo: IFieldInfo }) => {
            const { scope, schema, entity, id, field, value, fieldInfo } = params;

            const entityChanges = state.current.getOrCreateChanges(schema, entity);
            let fields = entityChanges.updated[id];
            if (fields === undefined) {
                fields = {};
                if (id in entityChanges.deleted) {
                    resetDeletedEntryValue(state, entityChanges, id);
                }
                Vue.set(entityChanges.updated, String(id), fields);
            }
            const oldField = fields[field];
            const scopes = oldField === undefined ? { [scope]: null } : { [scope]: null, ...oldField.scopes };
            Vue.set(fields, field, { scopes, ...validateValue(fieldInfo, value) });
            state.touched = true;
        },
        addEntry: (state, params: { scope: ScopeName, schema: SchemaName, entity: EntityName, position?: number, entityInfo: EntityFieldsInfo }) => {
            const { scope, schema, entity, position, entityInfo } = params;

            // During submit new entries aren't allowed to be added because this can result in duplicates.
            if (state.currentSubmit !== null) {
                throw Error("Adding entries are forbidden while submitting");
            }

            const entityChanges = state.current.getOrCreateChanges(schema, entity);
            const newEntry = {
                values: getEmptyValues(scope, entityInfo),
                scopes: { [scope]: null },
            };
            const newId = entityChanges.added.nextId++;
            entityChanges.added.entries[newId] = newEntry;
            if (position === undefined) {
                entityChanges.added.positions.push(newId);
            } else {
                entityChanges.added.positions.splice(position, 0, newId);
            }
            state.addedCount += 1;
            state.touched = true;
        },
        setAddedField: (state, params: { scope: ScopeName, schema: SchemaName, entity: EntityName, id: AddedRowId, field: FieldName, value: any, fieldInfo: IFieldInfo }) => {
            const { scope, schema, entity, id, field, value, fieldInfo } = params;
            // During submit new entries aren't allowed to be added because this can result in duplicates.
            if (state.currentSubmit !== null) {
                throw Error("Adding entries are forbidden while submitting");
            }

            const entityChanges = state.current.getOrCreateChanges(schema, entity);
            const added = entityChanges.added.entries[id];
            if (added === undefined) {
                throw new Error(`New entity id ${id} is not found`);
            }
            Vue.set(added.scopes, scope, null);
            Vue.set(added.values, field, validateValue(fieldInfo, value));
            state.touched = true;
        },
        deleteEntry: (state, params: { scope: ScopeName, schema: SchemaName, entity: FieldName, id: RowId }) => {
            const { scope, schema, entity, id } = params;
            const entityChanges = state.current.getOrCreateChanges(schema, entity);
            const deleted = entityChanges.deleted[id];
            if (deleted === undefined) {
                const entry = {
                    scopes: { [scope]: null },
                };
                Vue.set(entityChanges.deleted, String(id), entry);
                if (id in entityChanges.updated) {
                    resetUpdatedEntryValue(state, entityChanges, id);
                }
                state.touched = true;
            } else {
                Vue.set(deleted.scopes, scope, null);
            }
        },
        resetUpdatedField: (state, params: { schema: SchemaName, entity: EntityName, id: RowId, field: FieldName }) => {
            const { schema, entity, id, field } = params;
            const entityChanges = state.current.getOrCreateChanges(schema, entity);
            const fieldUpdates = entityChanges.updated[id];
            if (fieldUpdates === undefined) {
                return;
            }
            if (field in fieldUpdates) {
                Vue.delete(fieldUpdates, field);
                if (Object.keys(fieldUpdates).length === 0) {
                    resetUpdatedEntryValue(state, entityChanges, id);
                    cleanupEntity(state, schema, entity, entityChanges);
                }
            }
        },
        resetAddedEntry: (state, { schema, entity, id }: { schema: SchemaName, entity: EntityName, id: AddedRowId }) => {
            const entityChanges = state.current.getOrCreateChanges(schema, entity);
            // During submit new entries aren't allowed to be added because this can result in duplicates.
            if (state.currentSubmit !== null) {
                throw Error("Adding entries are forbidden while submitting");
            }

            const added = entityChanges.added.entries[id];
            if (added !== undefined) {
                resetAddedEntryValue(state, entityChanges, id);
                cleanupEntity(state, schema, entity, entityChanges);
            }
        },
        resetDeleteEntry: (state, { schema, entity, id }: { schema: SchemaName, entity: EntityName, id: number }) => {
            const entityChanges = state.current.getOrCreateChanges(schema, entity);
            if (id in entityChanges.deleted) {
                resetDeletedEntryValue(state, entityChanges, id);
                cleanupEntity(state, schema, entity, entityChanges);
            }
        },
    },
    actions: {
        updateField: async (context, args: { schema: SchemaName, entity: EntityName, id: RowId, field: FieldName, value: any }) => {
            const { commit, dispatch } = context;
            const fieldInfo = getFieldInfo(context, args.schema, args.entity, args.field);
            commit("updateField", { ...args, fieldInfo });
            await checkCounters(context);
            await dispatch("userView/afterUpdateField", args, { root: true });
        },
        addEntry: async (context, args: { schema: SchemaName, entity: EntityName, position?: number }): Promise<IAddedResult> => {
            const { state, commit, dispatch } = context;
            const entityInfo = getEntityFieldsInfo(context, args.schema, args.entity);
            commit("addEntry", { ...args, entityInfo });
            const entityChanges = state.current.changesForEntity(args.schema, args.entity);
            const newId = entityChanges.added.nextId - 1;
            let position: number;
            if (args.position === undefined) {
                position = entityChanges.added.positions.length - 1;
            } else {
                position = args.position;
            }
            const result = {
                id: newId,
                position,
            };
            await checkCounters(context);
            await dispatch("userView/afterAddEntry", { ...args, ...result }, { root: true });
            return result;
        },
        setAddedField: async (context, args: { schema: SchemaName, entity: EntityName, id: AddedRowId, field: FieldName, value: any }) => {
            const { commit, dispatch } = context;
            const fieldInfo = getFieldInfo(context, args.schema, args.entity, args.field);
            commit("setAddedField", { ...args, fieldInfo });
            await checkCounters(context);
            await dispatch("userView/afterSetAddedField", args, { root: true });
        },
        deleteEntry: async (context, args: { schema: SchemaName, entity: EntityName, id: RowId }) => {
            const { commit, dispatch } = context;
            commit("deleteEntry", args);
            await checkCounters(context);
            await dispatch("userView/afterDeleteEntry", args, { root: true });
        },
        reset: async context => {
            const { commit, dispatch } = context;
            await dispatch("userView/beforeResetChanges", undefined, { root: true });
            commit("clear");
            stopAutoSave(context);
            window.removeEventListener("beforeunload", askOnClose);
        },
        resetUpdatedField: async (context, args: { schema: SchemaName, entity: EntityName, id: RowId, field: FieldName }) => {
            const { commit, dispatch } = context;
            await dispatch("userView/beforeResetUpdatedField", args, { root: true });
            commit("resetUpdatedEntry", args);
            await checkCounters(context);
        },
        resetAddedEntry: async (context, args: { schema: SchemaName, entity: EntityName, id: AddedRowId }) => {
            const { commit, dispatch } = context;
            await dispatch("userView/beforeResetAddedEntry", args, { root: true });
            commit("resetAddedEntry", args);
            await checkCounters(context);
        },
        resetDeleteEntry: async (context, args: { schema: SchemaName, entity: EntityName, id: RowId }) => {
            const { commit, dispatch } = context;
            await dispatch("userView/beforeResetDeleteEntry", args, { root: true });
            commit("resetDeleteEntry", args);
            await checkCounters(context);
        },
        // If scope is specified, clears only entries which have it.
        clearAdded: ({ state, dispatch }, scope?: ScopeName) => {
            Object.entries(state.current.changes).forEach(([schema, entities]) => {
                Object.entries(entities).forEach(([entity, entityChanges]) => {
                    Object.entries(entityChanges.added.entries).forEach(([addedIdStr, addedEntry]) => {
                        const addedId = Number(addedIdStr);
                        if (scope === undefined || scope in addedEntry.scopes) {
                            dispatch("resetAddedEntry", { schema, entity, id: addedId });
                        }
                    });
                });
            });
        },
        // Removes scope and entries that are only bound to it.
        removeScope: (context, scope: ScopeName) => {
            resetScopeBy(context, scopes => {
                Vue.delete(scopes, scope);
                return Object.keys(scopes).length !== 0;
            });
        },
        // Clears all scoped entries (when they have been successfully submitted).
        resetScoped: (context, scope: ScopeName) => {
            resetScopeBy(context, scopes => scope in scopes);
        },

        addAutoSaveLock: context => {
            const id = context.state.lastAutoSaveLock;
            context.commit("addAutoSaveLock");
            checkAutoSave(context);
            return id;
        },
        removeAutoSaveLock: (context, id: AutoSaveLock) => {
            context.commit("removeAutoSaveLock", id);
            checkAutoSave(context);
        },
        submit: (context, scope?: ScopeName): Promise<TransactionResult[]> => {
            const { state, commit, dispatch } = context;
            if (state.currentSubmit !== null) {
                return state.currentSubmit;
            }
            commit("validate");

            const ops = Object.entries(state.current.changes).flatMap(([schemaName, entities]) => {
                return Object.entries(entities).flatMap(([entityName, entityChanges]) => {
                    try {
                        const entity = {
                            schema: schemaName,
                            name: entityName,
                        };
                        const updated =
                            mapMaybe(([updatedIdStr, updatedFields]) => {
                                const entries =
                                    mapMaybe(([name, change]) => (scope && !(scope in change.scopes)) ? undefined : [name, changeToParam(change)],
                                        Object.entries(updatedFields));
                                if (entries.length === 0) {
                                    return undefined;
                                } else {
                                    return {
                                        type: "update",
                                        entity,
                                        id: Number(updatedIdStr),
                                        entries: Object.fromEntries(entries),
                                    } as Api.TransactionOp;
                                }
                            }, Object.entries(entityChanges.updated));
                        const added =
                            mapMaybe(addedFields => {
                                if (scope && !(scope in addedFields.scopes)) {
                                    return undefined;
                                } else {
                                    const entries = Object.entries(addedFields.values).map(([name, value]) => [name, changeToParam(value)]);
                                    return {
                                        type: "insert",
                                        entity,
                                        entries: Object.fromEntries(entries),
                                    } as Api.TransactionOp;
                                }
                            }, Object.values(entityChanges.added.entries));
                        const deleted =
                            mapMaybe(([deletedIdStr, deletedEntry]) => {
                                if (scope && !(scope in deletedEntry.scopes)) {
                                    return undefined;
                                } else {
                                    return {
                                        type: "delete",
                                        entity,
                                        id: Number(deletedIdStr),
                                    } as Api.TransactionOp;
                                }
                            }, Object.entries(entityChanges.deleted));
                        return [...updated, ...added, ...deleted];
                    } catch (e) {
                        commit("addError", `Invalid value for ${schemaName}.${entityName}`);
                        dispatch("userView/updateErroredOnce", undefined, { root: true });
                        throw e;
                    }
                });
            });

            const submit = (async (): Promise<CombinedTransactionResult[]> => {
                let result: TransactionResult[] | Error;
                try {
                    result = await dispatch("callProtectedApi", {
                        func: Api.runTransaction,
                        args: [ops],
                    }, { root: true });
                } catch (e) {
                    result = e;
                }
                if (result instanceof Array) {
                    try {
                        await dispatch("userView/reload", undefined, { root: true });
                    } catch (e) {
                        console.error("Error while commiting", e);
                        // Ignore errors; they've been already handled for userView
                    }
                }

                commit("finishSubmit");
                if (result instanceof Array) {
                    if (state.touched) {
                        await dispatch("clearAdded", scope);
                        await dispatch("userView/updateErroredOnce", undefined, { root: true });
                    } else {
                        if (scope) {
                            await dispatch("resetScoped", scope);
                        } else {
                            await dispatch("reset");
                        }
                    }
                    return map2((op, res) => ({ ...op, ...res } as CombinedTransactionResult), ops, result);
                } else {
                    commit("addError", result.message);
                    throw result;
                }
            })();
            commit("startSubmit", submit);
            return submit;
        },
    },
};

export default stagingModule;

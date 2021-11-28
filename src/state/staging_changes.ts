import Vue from "vue";
import { Module, ActionContext } from "vuex";
import R from "ramda";
import {
  ITransaction, ITransactionResult, IEntityRef, IFieldRef, IEntity, RowId, SchemaName, FieldName, EntityName,
  IInsertEntityOp, IUpdateEntityOp, IDeleteEntityOp, IInsertEntityResult, IUpdateEntityResult, IDeleteEntityResult,
  TransactionOp,
} from "ozma-api";

import { RecordSet, deepClone, mapMaybe, waitTimeout } from "@/utils";
import { IUpdatedValue, IFieldInfo, valueFromRaw, valueEquals, serializeValue } from "@/values";
import Api from "@/api";
import { i18n } from "@/modules";
import { eventBus } from "@/main";

export type ScopeName = string;

export type AddedValues = Record<FieldName, IUpdatedValue>;
export type UpdatedValues = Record<FieldName, IUpdatedValue>;

export type AddedRowId = number;

export interface IAddedEntry {
  // Scopes are used to split adds between different "windows" which can be closed separately,
  // dropping only unfinished entries bound to that particular scope.
  scope: ScopeName;
  values: AddedValues;
}

export type AutoSaveLock = number;

export interface IAddedPosition {
  type: "added";
  id: number;
}

// Transient entries are entries which were just added, and we need to keep them in place
// till user view is closed. They might actually be gone, or not shown in current user
// view because of `WHERE` clause, or have a different ordering.
export interface ITransientPosition {
  type: "transient";
  id: number;
}

const maxNextAddedId = 2 ** 32;

export interface IEntityChanges {
  // Reflected everywhere.
  updated: Record<RowId, UpdatedValues>;
  // Reflected (in CombinedUserView) only in the user view where they were initially added.
  added: Record<AddedRowId, IAddedEntry>;
  // Reflected in user views with FOR INSERT INTO "this entity"
  // (in future, possibly, also with FOR UPDATE OF as a relaxed variant).
  deleted: RecordSet<RowId>;
}

const emptyUpdates: IEntityChanges = {
  updated: {},
  added: {},
  deleted: {},
};

export interface IInternalInsertEntityOp extends IInsertEntityOp {
  internalId: number;
  entityInfo: IEntity;
}

export interface IInternalUpdateEntityOp extends IUpdateEntityOp {
  entityInfo: IEntity;
}

export interface ICombinedInsertEntityResult extends IInternalInsertEntityOp, IInsertEntityResult {
}

export interface ICombinedUpdateEntityResult extends IInternalUpdateEntityOp, IUpdateEntityResult {
}

export interface ICombinedDeleteEntityResult extends IDeleteEntityOp, IDeleteEntityResult {
}

export type CombinedTransactionResult = ICombinedInsertEntityResult | ICombinedUpdateEntityResult | ICombinedDeleteEntityResult;

type InternalTransactionOp = IInternalInsertEntityOp | IInternalUpdateEntityOp | IDeleteEntityOp;

export interface IScope {
  addedCount: number;
  locked: boolean; // Locked scope can't be submitted until unlocked.
}

export class CurrentChanges {
  changes: Record<SchemaName, Record<EntityName, IEntityChanges>> = {};
  // Needed for determining whether there are changes for a given scope.
  scopes: Record<ScopeName, IScope> = {};
  // Needed for quick checking whether any entries are updated or deleted.
  updatedCount = 0;
  deletedCount = 0;

  get isEmpty() {
    return Object.entries(this.changes).length === 0;
  }

  get addedCount() {
    return Object.values(this.scopes).reduce((prev, scope) => prev + scope.addedCount, 0);
  }

  isScopeEmpty(scope: ScopeName) {
    return this.updatedCount === 0 && this.deletedCount === 0 && (this.scopes[scope]?.addedCount ?? 0) === 0;
  }

  getOrCreateChanges(ref: IEntityRef): IEntityChanges {
    let entities = this.changes[ref.schema];
    if (entities === undefined) {
      entities = {};
      Vue.set(this.changes, ref.schema, entities);
    }

    let entity = entities[ref.name];
    if (entity === undefined) {
      entity = deepClone(emptyUpdates);
      Vue.set(entities, ref.name, entity);
    }

    return entity;
  }

  resetUpdatedEntryValue(entityChanges: IEntityChanges, id: RowId) {
    const entry = entityChanges.updated[id];
    Vue.delete(entityChanges.updated, id);
  }

  cleanupEntity(ref: IEntityRef, entityChanges: IEntityChanges) {
    if (Object.keys(entityChanges.updated).length === 0
     && Object.keys(entityChanges.added).length === 0
     && Object.keys(entityChanges.deleted).length === 0
    ) {
      const schemaChanges = this.changes[ref.schema];
      Vue.delete(schemaChanges, ref.name);
      if (Object.keys(schemaChanges).length === 0) {
        Vue.delete(this.changes, ref.schema);
      }
    }
  }

  changesForEntity(ref: IEntityRef): IEntityChanges {
    const entities = this.changes[ref.schema];
    if (entities === undefined) {
      return emptyUpdates;
    }
    const changes = entities[ref.name];
    if (changes === undefined) {
      return emptyUpdates;
    }
    return changes;
  }
}

// Event handler which is notified about user view changes.
export interface IStagingEventHandler {
  updateField(fieldRef: IFieldRef, id: RowId, value: IUpdatedValue, meta?: unknown): void;
  addEntry(entityRef: IEntityRef, id: AddedRowId, meta?: unknown): void;
  setAddedField(fieldRef: IFieldRef, id: AddedRowId, value: IUpdatedValue, meta?: unknown): void;
  deleteEntry(entityRef: IEntityRef, id: RowId, meta?: unknown): void;
  resetUpdatedField(fieldRef: IFieldRef, id: RowId, meta?: unknown): void;
  resetAddedEntry(entityRef: IEntityRef, id: AddedRowId, meta?: unknown): void;
  resetDeleteEntry(entityRef: IEntityRef, id: RowId, meta?: unknown): void;
  // Called after an added entry has been commited and assigned a database id.
  commitAddedEntry(entityRef: IEntityRef, id: AddedRowId, newId: RowId, meta?: unknown): void;
}

export type StagingKey = string;

export interface IStagingState {
  current: CurrentChanges;
  nextAddedId: AddedRowId;
  // Current submit promise
  currentSubmit: Promise<CombinedTransactionResult[]> | null;
  autoSaveTimeout: number | null;
  autoSaveTimeoutId: NodeJS.Timeout | null;
  lastAutoSaveLock: AutoSaveLock;
  autoSaveLocks: Record<AutoSaveLock, null>;
  disableAutoSaveCount: number; // Each userview with disabled autosave adds 1 to count while it's alive.
  handlers: Record<StagingKey, IStagingEventHandler>;
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
      if (state.disableAutoSaveCount === 0) {
        void dispatch("submit", {});
      }
    }, state.autoSaveTimeout);
    commit("setAutoSaveHandler", timeoutId);
  }
};

const checkAutoSave = (context: ActionContext<IStagingState, {}>) => {
  const { state } = context;
  if (state.currentSubmit === null
   && Object.keys(state.autoSaveLocks).length === 0
  //  && state.current.addedCount === 0 // disable autosave for new records
  ) {
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

const validateValue = (info: IFieldInfo, value: unknown): IUpdatedValue => {
  return {
    rawValue: value,
    value: valueFromRaw(info, value),
  };
};

const getEntityInfo = async (context: ActionContext<IStagingState, {}>, ref: IEntityRef): Promise<IEntity> => {
  return context.dispatch("entities/getEntity", ref, { root: true });
};

const getFieldInfo = async (context: ActionContext<IStagingState, {}>, ref: IFieldRef): Promise<IFieldInfo> => {
  const entityInfo = await getEntityInfo(context, ref.entity);
  const fieldInfo = entityInfo.columnFields[ref.name];
  if (fieldInfo === undefined) {
    throw new Error(`No field info for field ${ref.entity.schema}.${ref.entity.name}.${ref.name}`);
  }
  return fieldInfo;
};

const getEmptyValues = (scope: ScopeName, entity: IEntity): UpdatedValues => {
  return Object.fromEntries(Object.entries(entity.columnFields).filter(([name, info]) => !(info.isNullable || info.defaultValue !== undefined)).map(([name, info]) => {
    const value = { value: undefined, rawValue: "" };
    return [name, value];
  }));
};

const entityChangesToOperations = async (context: ActionContext<IStagingState, {}>, scope: ScopeName | null, errorOnIncomplete: boolean): Promise<InternalTransactionOp[]> => {
  const nestedOps = await Promise.all(Object.entries(context.state.current.changes).map(async ([schemaName, entities]) => {
    const ret = await Promise.all(Object.entries(entities).map(async ([entityName, entityChanges]) => {
      try {
        const entity = {
          schema: schemaName,
          name: entityName,
        };
        const entityInfo = await getEntityInfo(context, entity);
        const updated =
          mapMaybe(([updatedIdStr, updatedFields]) => {
            const entries = mapMaybe(([name, change]) => {
              if (change.value === undefined) {
                if (!errorOnIncomplete) {
                  return undefined;
                } else {
                  throw new Error(`Value for ${name} didn't pass validation`);
                }
              } else {
                return [name, change.value];
              }
            }, Object.entries(updatedFields));
            return {
              type: "update",
              entity,
              id: Number(updatedIdStr),
              entries: Object.fromEntries(entries),
              entityInfo,
            } as InternalTransactionOp;
          }, Object.entries(entityChanges.updated));
        const added =
          mapMaybe(([addedIdStr, addedFields]) => {
            if (scope && scope !== addedFields.scope) {
              return undefined;
            }
            for (const [name, value] of Object.entries(addedFields.values)) {
              if (value.value === undefined) {
                if (!errorOnIncomplete) {
                  return undefined;
                } else {
                  throw new Error(`Value for ${name} didn't pass validation`);
                }
              }
            }
            const entries = Object.entries(addedFields.values).map(([name, value]) => [name, value.value]);
            return {
              type: "insert",
              entity,
              internalId: Number(addedIdStr),
              entries: Object.fromEntries(entries),
              entityInfo,
            } as InternalTransactionOp;
          }, Object.entries(entityChanges.added));
        const deleted =
          Object.keys(entityChanges.deleted).map(deletedIdStr => {
            return {
              type: "delete",
              entity,
              id: Number(deletedIdStr),
            } as InternalTransactionOp;
          });
        return [...updated, ...added, ...deleted];
      } catch (e) {
        throw new Error(`Invalid value for ${schemaName}.${entityName}: ${e.message}`);
      }
    }));
    return ret.flat(1);
  }));
  return nestedOps.flat(1);
};

const serializeValues = (entityInfo: IEntity, entries: Record<FieldName, unknown>): Record<FieldName, unknown> => {
  return Object.fromEntries(Object.entries(entries).map(([name, value]) => [name, serializeValue(entityInfo.columnFields[name].fieldType, value)]));
};

const internalOpToTransactionOp = (op: InternalTransactionOp): TransactionOp => {
  if (op.type === "insert") {
    return { type: "insert", entity: op.entity, entries: serializeValues(op.entityInfo, op.entries) };
  } else if (op.type === "update") {
    return { type: "update", entity: op.entity, id: op.id, entries: serializeValues(op.entityInfo, op.entries) };
  } else {
    return op;
  }
};

const errorKey = "staging";

const stagingModule: Module<IStagingState, {}> = {
  namespaced: true,
  state: {
    current: new CurrentChanges(),
    nextAddedId: 0,
    currentSubmit: null,
    lastAutoSaveLock: 0,
    autoSaveTimeout: null,
    autoSaveTimeoutId: null,
    autoSaveLocks: {},
    disableAutoSaveCount: 0,
    handlers: {},
  },
  mutations: {
    clear: state => {
      state.current = new CurrentChanges();
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
      Vue.delete(state.autoSaveLocks, lock);
    },
    addDisableAutoSaveCount: state => {
      state.disableAutoSaveCount++;
    },
    removeDisableAutoSaveCount: state => {
      state.disableAutoSaveCount--;
    },
    startSubmit: (state, submit: Promise<CombinedTransactionResult[]>) => {
      state.currentSubmit = submit;
    },
    finishSubmit: state => {
      state.currentSubmit = null;
    },

    lockScope: (state, scope: ScopeName) => {
      if (!state.current.scopes[scope]) return;

      state.current.scopes[scope] = { ...state.current.scopes[scope], locked: true };
    },

    unlockScope: (state, scope: ScopeName) => {
      if (!state.current.scopes[scope]) return;

      state.current.scopes[scope] = { ...state.current.scopes[scope], locked: false };
    },

    updateField: (state, params: { fieldRef: IFieldRef; id: RowId; value: unknown; fieldInfo: IFieldInfo }) => {
      const { fieldRef, id, value, fieldInfo } = params;

      const entityChanges = state.current.getOrCreateChanges(fieldRef.entity);
      let fields = entityChanges.updated[id];
      if (fields === undefined) {
        if (id in entityChanges.deleted) {
          throw new Error("Cannot update fields in deleted entry");
        }
        fields = {};
        Vue.set(entityChanges.updated, String(id), fields);
        state.current.updatedCount += 1;
      }
      Vue.set(fields, fieldRef.name, validateValue(fieldInfo, value));
    },
    addEntry: (state, params: { scope: ScopeName; entityRef: IEntityRef; entityInfo: IEntity }) => {
      const { scope, entityRef, entityInfo } = params;

      const entityChanges = state.current.getOrCreateChanges(entityRef);
      const newEntry = {
        values: getEmptyValues(scope, entityInfo),
        scope,
      };

      const id = state.nextAddedId;
      state.nextAddedId = (state.nextAddedId + 1) % maxNextAddedId;
      Vue.set(entityChanges.added, id, newEntry);

      let scopeInfo = state.current.scopes[scope];
      if (scopeInfo === undefined) {
        scopeInfo = {
          addedCount: 0,
          locked: false,
        };
        Vue.set(state.current.scopes, scope, scopeInfo);
      }
      scopeInfo.addedCount += 1;
    },
    setAddedField: (
      state,
      params: {
        fieldRef: IFieldRef;
        id: AddedRowId;
        value: unknown;
        fieldInfo: IFieldInfo;
      },
    ) => {
      const { fieldRef, id, value, fieldInfo } = params;

      const entityChanges = state.current.getOrCreateChanges(fieldRef.entity);
      const added = entityChanges.added[id];
      if (added === undefined) {
        throw new Error(`New entity id ${id} is not found`);
      }
      Vue.set(added.values, fieldRef.name, validateValue(fieldInfo, value));
    },
    deleteEntry: (state, params: { entityRef: IEntityRef; id: RowId }) => {
      const { entityRef, id } = params;
      const entityChanges = state.current.getOrCreateChanges(entityRef);
      const deleted = entityChanges.deleted[id];
      if (deleted === undefined) {
        Vue.set(entityChanges.deleted, String(id), null);
        if (id in entityChanges.updated) {
          state.current.resetUpdatedEntryValue(entityChanges, id);
        }
        state.current.deletedCount += 1;
      }
    },
    resetUpdatedField: (state, params: { fieldRef: IFieldRef; id: RowId }) => {
      const { fieldRef, id } = params;

      if (state.currentSubmit !== null) {
        throw new Error("Resetting changes is forbidden while submitting");
      }

      const entityChanges = state.current.getOrCreateChanges(fieldRef.entity);
      const fieldUpdates = entityChanges.updated[id];
      if (fieldUpdates === undefined) {
        return;
      }
      const update = fieldUpdates[fieldRef.name];
      if (update !== undefined) {
        Vue.delete(fieldUpdates, fieldRef.name);
        if (Object.keys(fieldUpdates).length === 0) {
          state.current.resetUpdatedEntryValue(entityChanges, id);
          state.current.cleanupEntity(fieldRef.entity, entityChanges);
        }
        state.current.updatedCount -= 1;
      }
    },
    resetAddedEntry: (state, params: { entityRef: IEntityRef; id: AddedRowId }) => {
      const { entityRef, id } = params;

      if (state.currentSubmit !== null) {
        throw new Error("Resetting changes is forbidden while submitting");
      }

      const entityChanges = state.current.getOrCreateChanges(entityRef);
      const entry = entityChanges.added[id];
      if (entry === undefined) {
        // Next line is workaround for some compex case with submitting on route change.
        state.current.cleanupEntity(entityRef, entityChanges);
        return;
      }
      Vue.delete(entityChanges.added, id);

      const scope = state.current.scopes[entry.scope];
      scope.addedCount -= 1;
      if (scope.addedCount === 0) {
        Vue.delete(state.current.scopes, entry.scope);
      }
      state.current.cleanupEntity(entityRef, entityChanges);
    },
    resetDeleteEntry: (state, { entityRef, id }: { entityRef: IEntityRef; id: RowId }) => {
      if (state.currentSubmit !== null) {
        throw new Error("Resetting changes is forbidden while submitting");
      }

      const entityChanges = state.current.getOrCreateChanges(entityRef);
      if (id in entityChanges.deleted) {
        Vue.delete(entityChanges.deleted, id);
        state.current.cleanupEntity(entityRef, entityChanges);
        state.current.deletedCount -= 1;
      }
    },

    setHandler: (state, { key, handler }: { key: StagingKey; handler: IStagingEventHandler }) => {
      Vue.set(state.handlers, key, handler);
    },
    removeHandler: (state, key: StagingKey) => {
      Vue.delete(state.handlers, key);
    },
  },
  actions: {
    updateField: async (
      context,
      args: {
        fieldRef: IFieldRef;
        id: RowId;
        value: unknown;
        meta?: unknown;
      },
    ) => {
      const { state, commit } = context;
      const fieldInfo = await getFieldInfo(context, args.fieldRef);
      commit("updateField", { ...args, fieldInfo });
      await checkCounters(context);

      // Vuex is stupid, so we need to re-fetch the value.
      const value = state.current.getOrCreateChanges(args.fieldRef.entity).updated[args.id][args.fieldRef.name];
      Object.values(state.handlers).forEach(handler => handler.updateField(args.fieldRef, args.id, value, args.meta));
    },
    addEntry: async (
      context,
      args: {
        scope: ScopeName;
        entityRef: IEntityRef;
        meta?: unknown;
      },
    ): Promise<AddedRowId> => {
      const { state, commit } = context;
      const entityInfo = await getEntityInfo(context, args.entityRef);
      commit("addEntry", { ...args, entityInfo });
      // UGH. We'd like to return new id from `addEntry` instead.
      const newId = state.nextAddedId === 0 ? maxNextAddedId : state.nextAddedId - 1;
      await checkCounters(context);

      Object.values(state.handlers).forEach(handler => handler.addEntry(args.entityRef, newId, args.meta));

      return newId;
    },
    setAddedField: async (
      context,
      args: {
        fieldRef: IFieldRef;
        id: AddedRowId;
        value: unknown;
        meta?: unknown;
      },
    ) => {
      const { state, commit } = context;
      const fieldInfo = await getFieldInfo(context, args.fieldRef);
      commit("setAddedField", { ...args, fieldInfo });
      await checkCounters(context);

      // Vuex is stupid, so we need to re-fetch the value.
      const value = state.current.getOrCreateChanges(args.fieldRef.entity).added[args.id].values[args.fieldRef.name];
      Object.values(state.handlers).forEach(handler => handler.setAddedField(args.fieldRef, args.id, value, args.meta));
    },
    deleteEntry: async (context, args: { entityRef: IEntityRef; id: RowId; meta?: unknown }) => {
      const { state, commit } = context;
      commit("deleteEntry", args);
      await checkCounters(context);

      // Vuex is stupid, so we need to re-fetch the value.
      Object.values(state.handlers).forEach(handler => handler.deleteEntry(args.entityRef, args.id, args.meta));
    },
    reset: context => {
      const { state, commit } = context;

      for (const [schemaName, schemaChanges] of Object.entries(state.current.changes)) {
        for (const [entityName, entityChanges] of Object.entries(schemaChanges)) {
          const entityRef = {
            schema: schemaName,
            name: entityName,
          };

          for (const [rawId, updated] of Object.entries(entityChanges.updated)) {
            for (const fieldName of Object.keys(updated)) {
              const fieldRef = {
                entity: entityRef,
                name: fieldName,
              };
              const id = Number(rawId);
              Object.values(state.handlers).forEach(handler => handler.resetUpdatedField(fieldRef, id));
            }
          }

          for (const rawId of Object.keys(entityChanges.added)) {
            const id = Number(rawId);
            Object.values(state.handlers).forEach(handler => handler.resetAddedEntry(entityRef, id));
          }

          for (const rawId of Object.keys(entityChanges.deleted)) {
            const id = Number(rawId);
            Object.values(state.handlers).forEach(handler => handler.resetDeleteEntry(entityRef, id));
          }
        }
      }

      commit("clear");
      stopAutoSave(context);
      window.removeEventListener("beforeunload", askOnClose);
    },
    // `dontNotify` is used to avoid notifying user views that changes were reset.
    // It is used after a reload, because there is a period between a successful submit and user view reload
    // when there are no changes in the store, but user view should maintain changed values until
    // reloaded.
    // For updates and deletes this is easy enough -- just don't notify about a reset.
    // For inserts this is more difficult -- we need to explicitly tell a user view about inserted
    // entry, so that further field updates in that period are indeed reported as updates to the new
    // inserted entry.
    resetUpdatedField: async (
      context,
      args: {
        fieldRef: IFieldRef;
        id: RowId;
        dontNotify?: boolean;
        meta?: unknown;
      },
    ) => {
      const { commit, state } = context;
      if (!args.dontNotify) {
        Object.values(state.handlers).forEach(handler => handler.resetUpdatedField(args.fieldRef, args.id, args.meta));
      }
      commit("resetUpdatedField", args);
      await checkCounters(context);
    },
    resetAddedEntry: async (
      context,
      args: {
        entityRef: IEntityRef;
        id: AddedRowId;
        dontNotify?: boolean;
        meta?: unknown;
      },
    ) => {
      const { commit, state } = context;
      if (!args.dontNotify) {
        Object.values(state.handlers).forEach(handler => handler.resetAddedEntry(args.entityRef, args.id, args.meta));
      }
      commit("resetAddedEntry", args);
      await checkCounters(context);
    },
    resetDeleteEntry: async (
      context,
      args: {
        entityRef: IEntityRef;
        id: RowId;
        dontNotify?: boolean;
        meta?: unknown;
      },
    ) => {
      const { commit, state } = context;
      if (!args.dontNotify) {
        Object.values(state.handlers).forEach(handler => handler.resetDeleteEntry(args.entityRef, args.id, args.meta));
      }
      commit("resetDeleteEntry", args);
      await checkCounters(context);
    },
    clearAdded: async (
      { state, dispatch },
      params: {
        scope?: ScopeName; // If specified, clears only entries which have this scope.
      },
    ) => {
      const { scope } = params;
      for (const [schema, entities] of Object.entries(state.current.changes)) {
        for (const [entity, entityChanges] of Object.entries(entities)) {
          for (const [addedIdStr, addedEntry] of Object.entries(entityChanges.added)) {
            if (scope === undefined || scope === addedEntry.scope) {
              // Not sure about safety of parallel "resetAddedEntry" dispatches
              // and they are almost instant anyway, so awaits in loop are fine.
              // eslint-disable-next-line
              await dispatch(
                "resetAddedEntry",
                {
                  entityRef: { schema, name: entity },
                  id: Number(addedIdStr),
                },
              );
            }
          }
        }
      }
    },
    clearUnchanged: async (context, ops: CombinedTransactionResult[]) => {
      const { state, dispatch } = context;
      await Promise.all(ops.map(async op => {
        const entityChanges = state.current.changes[op.entity.schema][op.entity.name];
        if (op.type === "insert") {
          if (op.id !== null) {
            Object.values(state.handlers).forEach(handler => handler.commitAddedEntry(op.entity, op.internalId, op.id!));
            const addedValues = entityChanges.added[op.internalId];
            await Promise.all(Object.entries(addedValues.values).map(async ([fieldName, newValue]) => {
              const maybeOldValue = op.entries[fieldName];
              const valueType = op.entityInfo.columnFields[fieldName].valueType;
              if (!valueEquals(valueType, maybeOldValue, newValue.value)) {
                await dispatch("updateField", { entityRef: op.entity, id: op.id, value: newValue.rawValue });
              }
            }));
            await dispatch("resetAddedEntry", { entityRef: op.entity, id: op.internalId, dontNotify: true });
          } else {
            // This means some trigger cancelled INSERT operation. We can't do much here -- be honest
            // and just report that the entry is gone.
            await dispatch("resetAddedEntry", { entityRef: op.entity, id: op.internalId });
          }
        } else if (op.type === "update") {
          const updatedValues = entityChanges.updated[op.id];
          await Promise.all(Object.entries(updatedValues).map(async ([fieldName, newValue]) => {
            const maybeOldValue = op.entries[fieldName];
            const valueType = op.entityInfo.columnFields[fieldName].valueType;
            if (valueEquals(valueType, maybeOldValue, newValue.value)) {
              await dispatch("resetUpdatedField", { fieldRef: { entity: op.entity, name: fieldName }, id: op.id, dontNotify: true });
            }
          }));
        } else if (op.type === "delete") {
          await dispatch("resetDeleteEntry", { entityRef: op.entity, id: op.id, dontNotify: true });
        }
      }));
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
    submitIfNeeded: async (context, params: { scope?: ScopeName; preReload?: () => Promise<void>; errorOnIncomplete?: boolean }): Promise<CombinedTransactionResult[]> => {
      const { state, dispatch } = context;
      if (state.current.isEmpty) return [];
      return dispatch("submit", params);
    },
    submit: async (context, params: { scope?: ScopeName; preReload?: () => Promise<void>; errorOnIncomplete?: boolean }): Promise<CombinedTransactionResult[]> => {
      const { state, commit, dispatch } = context;

      if (params.scope && state.current.scopes[params.scope]?.locked) {
        return [];
      }

      if (state.currentSubmit !== null) {
        await state.currentSubmit;
      }

      commit("errors/resetErrors", errorKey, { root: true });

      let ops: InternalTransactionOp[];
      try {
        ops = await entityChangesToOperations(context, params.scope ?? null, params.errorOnIncomplete ?? false);
      } catch (e) {
        commit("errors/pushError", { key: errorKey, error: e.message }, { root: true });
        throw e;
      }
      if (ops.length === 0) {
        if (params.preReload) {
          try {
            await params.preReload();
          } catch (e) {
            console.error("Error while commiting", e);
          }
        }
        return [];
      }
      const action: ITransaction = { operations: ops.map(internalOpToTransactionOp) };

      const submit = (async (): Promise<CombinedTransactionResult[]> => {
        await waitTimeout(); // Delay promise so that it gets saved to `pending` first.
        let result: ITransactionResult | Error;
        try {
          result = await dispatch("callProtectedApi", {
            func: Api.runTransaction,
            args: [action],
          }, { root: true });
        } catch (e) {
          result = e;
        }
        if (!(result instanceof Error)) {
          try {
            if (params.preReload) {
              await params.preReload();
            }
            void dispatch("reload", undefined, { root: true });
          } catch (e) {
            console.error("Error while commiting", e);
            // Ignore errors; they've been already handled for userView
          }
        }

        commit("finishSubmit");
        if (!(result instanceof Error)) {
          commit("errors/resetErrors", errorKey, { root: true });
          eventBus.emit("closeAllToasts");
          const opResults = R.zipWith((op, res) => ({ ...op, ...res } as CombinedTransactionResult), ops, result.results);
          await dispatch("clearUnchanged", opResults);
          return opResults;
        } else {
          commit("errors/setError", { key: errorKey, error: result.message }, { root: true });
          throw result;
        }
      })();
      commit("startSubmit", submit);
      return submit;
    },
  },
};

export default stagingModule;

import Vue from "vue";
import { Module, ActionContext } from "vuex";
import { Moment } from "moment";

import { RecordSet, deepClone, mapMaybe, map2, waitTimeout } from "@/utils";
import { IUpdatedValue, IFieldInfo, valueFromRaw, valueEquals } from "@/values";
import {
  ITransaction, ITransactionResult, IEntityRef, IFieldRef, IEntity, RowId, SchemaName, FieldName, EntityName,
  IInsertEntityOp, IUpdateEntityOp, IDeleteEntityOp, IInsertEntityResult, IUpdateEntityResult, IDeleteEntityResult,
  IColumnField, TransactionOp, default as Api,
} from "@/api";
import { i18n } from "@/modules";

export type ScopeName = string;

export type UserViewKey = string;

export type AddedValues = Record<FieldName, IUpdatedValue>;
export type UpdatedValues = Record<FieldName, IUpdatedValue>;

export type AddedRowId = number;

export interface IAddedEntry {
  // Scopes are used to split adds between different "windows" which can be closed separately,
  // dropping only unfinished entries bound to that particular scope.
  scope: ScopeName;
  userView: UserViewKey;
  values: AddedValues;
  // Used to remove added entries without any changes
  // (e.g. if user clicked several times on "add entry" button in table and used only one of the rows).
  touched: boolean;
}

export type AutoSaveLock = number;

export interface IEntityChanges {
  updated: Record<RowId, UpdatedValues>;
  // Applied to user views with FOR INSERT INTO
  nextAddedId: AddedRowId;
  added: Record<AddedRowId, IAddedEntry>;
  // Added entries are bound to a particular user view.
  addedPositions: Record<UserViewKey, AddedRowId[]>;
  // Applied to user views with FOR UPDATE OF (or FOR INSERT INTO)
  deleted: RecordSet<RowId>;
}

export interface IAddedResult {
  position: number;
  id: AddedRowId;
}

const emptyUpdates: IEntityChanges = {
  updated: {},
  nextAddedId: 0,
  added: {},
  addedPositions: {},
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
  submitAddsAutomatically: boolean;
  addedCount: number;
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

export interface IStagingState {
  current: CurrentChanges;
  // Current submit promise
  currentSubmit: Promise<CombinedTransactionResult[]> | null;
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
      void dispatch("submit", {});
    }, state.autoSaveTimeout);
    commit("setAutoSaveHandler", timeoutId);
  }
};

const checkAutoSave = (context: ActionContext<IStagingState, {}>) => {
  const { state } = context;
  if (state.currentSubmit === null
   && Object.keys(state.autoSaveLocks).length === 0
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

const changeToParam = (fieldInfo: IColumnField, name: FieldName, change: IUpdatedValue): unknown => {
  if (change.value === undefined) {
    throw new Error(`Value for ${name} didn't pass validation`);
  }

  if (change.value === null) {
    return null;
  }

  if (fieldInfo.valueType.type === "date") {
    return (change.value as Moment).format("YYYY-MM-DD");
  } else if (fieldInfo.valueType.type === "datetime") {
    return (change.value as Moment).format(); // ISO 8601
  } else {
    return change.value;
  }
};

const validateValue = (info: IFieldInfo, value: unknown): IUpdatedValue => {
  return {
    rawValue: value,
    value: valueFromRaw(info, value),
  };
};

const getEntityInfo = async (context: ActionContext<IStagingState, {}>, ref: IEntityRef): Promise<IEntity> => {
  return context.dispatch("userView/getEntity", ref, { root: true });
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

const entityChangesToOperations = async (context: ActionContext<IStagingState, {}>, scope?: ScopeName): Promise<InternalTransactionOp[]> => {
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
            let entries: unknown[][];
            try {
              entries = Object.entries(updatedFields).map(([name, change]) => [name, changeToParam(entityInfo.columnFields[name], name, change)]);
            } catch (e) {
              return undefined;
            }
            if (entries.length === 0) {
              return undefined;
            } else {
              return {
                type: "update",
                entity,
                id: Number(updatedIdStr),
                entries: Object.fromEntries(entries),
                entityInfo,
              } as InternalTransactionOp;
            }
          }, Object.entries(entityChanges.updated));
        const added =
          mapMaybe(([addedIdStr, addedFields]) => {
            if (scope && scope !== addedFields.scope) {
              return undefined;
            }
            let entries: unknown[][];
            try {
              entries = Object.entries(addedFields.values).map(([name, value]) => [name, changeToParam(entityInfo.columnFields[name], name, value)]);
            } catch (e) {
              return undefined;
            }
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

// Remove internal fields.
const internalOpToTransactionOp = (op: InternalTransactionOp): TransactionOp => {
  if (op.type === "insert") {
    return { type: "insert", entity: op.entity, entries: op.entries };
  } else if (op.type === "update") {
    return { type: "update", entity: op.entity, id: op.id, entries: op.entries };
  } else {
    return op;
  }
};

const errorKey = "staging";

const stagingModule: Module<IStagingState, {}> = {
  namespaced: true,
  state: {
    current: new CurrentChanges(),
    currentSubmit: null,
    lastAutoSaveLock: 0,
    autoSaveTimeout: null,
    autoSaveTimeoutId: null,
    autoSaveLocks: {},
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
    startSubmit: (state, submit: Promise<CombinedTransactionResult[]>) => {
      state.currentSubmit = submit;
    },
    finishSubmit: state => {
      state.currentSubmit = null;
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
    addEntry: (state, params: { scope: ScopeName; submitAddsAutomatically: boolean, entityRef: IEntityRef; userView: UserViewKey; position?: number; entityInfo: IEntity }) => {
      const { scope, submitAddsAutomatically, entityRef, userView, position, entityInfo } = params;

      const entityChanges = state.current.getOrCreateChanges(entityRef);
      const newEntry = {
        values: getEmptyValues(scope, entityInfo),
        scope,
        userView,
        touched: false,
      };
      const newId = entityChanges.nextAddedId++;
      entityChanges.added[newId] = newEntry;

      let uvPositions = entityChanges.addedPositions[userView];
      if (uvPositions === undefined) {
        uvPositions = [];
        entityChanges.addedPositions[userView] = uvPositions;
      }

      if (position === undefined) {
        uvPositions.push(newId);
      } else {
        uvPositions.splice(position, 0, newId);
      }
      let scopeInfo = state.current.scopes[scope];
      if (scopeInfo === undefined) {
        scopeInfo = {
          submitAddsAutomatically,
          addedCount: 0,
        };
        state.current.scopes[scope] = scopeInfo;
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
        noTouch?: boolean;
      },
    ) => {
      const { fieldRef, id, value, fieldInfo, noTouch } = params;

      const entityChanges = state.current.getOrCreateChanges(fieldRef.entity);
      const added = entityChanges.added[id];
      if (added === undefined) {
        throw new Error(`New entity id ${id} is not found`);
      }
      Vue.set(added.values, fieldRef.name, validateValue(fieldInfo, value));
      added.touched = !noTouch;
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
        return;
      }
      Vue.delete(entityChanges.added, id);
      if (Object.entries(entityChanges.added).length === 0) {
        entityChanges.nextAddedId = 0;
      }

      const uvPositions = entityChanges.addedPositions[entry.userView];
      const position = uvPositions.indexOf(id);
      if (position === -1) {
        throw new Error("Impossible");
      }
      uvPositions.splice(position, 1);
      if (uvPositions.length === 0) {
        Vue.delete(entityChanges.addedPositions, entry.userView);
      }

      const scope = state.current.scopes[entry.scope];
      scope.addedCount -= 1;
      if (scope.addedCount === 0) {
        Vue.delete(state.current.scopes, entry.scope);
      }
      state.current.cleanupEntity(entityRef, entityChanges);
    },
    resetDeleteEntry: (state, { entityRef, id }: { entityRef: IEntityRef; id: number }) => {
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
  },
  actions: {
    updateField: async (context, args: { fieldRef: IFieldRef; id: RowId; value: unknown }) => {
      const { commit, dispatch } = context;
      const fieldInfo = await getFieldInfo(context, args.fieldRef);
      commit("updateField", { ...args, fieldInfo });
      await checkCounters(context);
      await dispatch("userView/afterUpdateField", args, { root: true });
    },
    addEntry: async (
      context,
      args: {
        scope: ScopeName;
        entityRef: IEntityRef;
        userView: UserViewKey;
        position?: number;
      },
    ): Promise<IAddedResult> => {
      const { state, commit, dispatch } = context;
      const entityInfo = await getEntityInfo(context, args.entityRef);
      commit("addEntry", { ...args, entityInfo });

      const entityChanges = state.current.changesForEntity(args.entityRef);
      const newId = entityChanges.nextAddedId - 1;
      const uvPositions = entityChanges.addedPositions[args.userView];
      const position = args.position ?? uvPositions.length - 1;

      const result = {
        id: newId,
        position,
      };
      await checkCounters(context);
      await dispatch("userView/afterAddEntry", { ...args, ...result }, { root: true });

      return result;
    },
    // Like `addEntry`, but doesn't sets `touched` property of entry for setting `defaultValues`.
    addEntryWithDefaults: async (
      context,
      args: {
        entityRef: IEntityRef;
        userView: UserViewKey;
        position?: number;
        scope: ScopeName;
        defaultValues: Record<string, unknown>;
      },
    ): Promise<IAddedResult> => {
      const { dispatch } = context;
      const result: IAddedResult = await dispatch("addEntry", args);
      for (const [mainFieldName, value] of Object.entries(args.defaultValues)) {
        // eslint-disable-next-line
        await dispatch("setAddedField", {
          scope: args.scope,
          fieldRef: {
            entity: args.entityRef,
            name: mainFieldName,
          },
          userView: args.userView,
          id: result.id,
          value,
          noTouch: true,
        });
      }
      return result;
    },
    setAddedField: async (
      context,
      args: {
        fieldRef: IFieldRef;
        id: AddedRowId;
        value: unknown;
        noTouch?: boolean; // Used to initialize entries with values.
      },
    ) => {
      const { commit, dispatch } = context;
      const fieldInfo = await getFieldInfo(context, args.fieldRef);
      commit("setAddedField", { ...args, fieldInfo });
      await checkCounters(context);
      await dispatch("userView/afterSetAddedField", args, { root: true });
    },
    deleteEntry: async (context, args: { entityRef: IEntityRef; id: RowId }) => {
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
    resetUpdatedField: async (context, args: { entityRef: IEntityRef; id: RowId; field: FieldName }) => {
      const { commit, dispatch } = context;
      await dispatch("userView/beforeResetUpdatedField", args, { root: true });
      commit("resetUpdatedField", args);
      await checkCounters(context);
    },
    resetAddedEntry: async (context, args: { entityRef: IEntityRef; userView: UserViewKey; id: AddedRowId }) => {
      const { commit, dispatch } = context;
      await dispatch("userView/beforeResetAddedEntry", args, { root: true });
      commit("resetAddedEntry", args);
      await checkCounters(context);
    },
    resetDeleteEntry: async (context, args: { entityRef: IEntityRef; id: RowId }) => {
      const { commit, dispatch } = context;
      await dispatch("userView/beforeResetDeleteEntry", args, { root: true });
      commit("resetDeleteEntry", args);
      await checkCounters(context);
    },
    clearAdded: async (
      { state, dispatch },
      params: {
        scope?: ScopeName; // If specified, clears only entries which have this scope.
        onlyUntouched?: boolean; // If true, clears only untouched (added and not edited) entries.
      },
    ) => {
      const { scope, onlyUntouched = false } = params;
      for (const [schema, entities] of Object.entries(state.current.changes)) {
        for (const [entity, entityChanges] of Object.entries(entities)) {
          for (const [addedIdStr, addedEntry] of Object.entries(entityChanges.added)) {
            if ((scope === undefined || scope === addedEntry.scope)
                && (!onlyUntouched || (!addedEntry.touched))) {
              // Not sure about safety of parallel "resetAddedEntry" dispatches
              // and they are almost instant anyway, so awaits in loop is fine.
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
          const addedValues = entityChanges.added[op.internalId];
          await Promise.all(Object.entries(addedValues.values).map(async ([fieldName, newValue]) => {
            const maybeOldValue = op.entries[fieldName];
            const valueType = op.entityInfo.columnFields[fieldName].valueType;
            if (!valueEquals(valueType, maybeOldValue, newValue.value)) {
              await dispatch("updateField", { entityRef: op.entity, id: op.id, value: newValue.rawValue });
            }
          }));
          await dispatch("resetAddedEntry", { entityRef: op.entity, id: op.internalId });
        } else if (op.type === "update") {
          const updatedValues = entityChanges.updated[op.id];
          await Promise.all(Object.entries(updatedValues).map(async ([fieldName, newValue]) => {
            const maybeOldValue = op.entries[fieldName];
            const valueType = op.entityInfo.columnFields[fieldName].valueType;
            if (valueEquals(valueType, maybeOldValue, newValue.value)) {
              await dispatch("resetUpdatedField", { fieldRef: { entity: op.entity, name: fieldName }, id: op.id });
            }
          }));
        } else if (op.type === "delete") {
          await dispatch("resetDeleteEntry", { entityRef: op.entity, id: op.id });
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
    submit: async (context, { scope, preReload }: { scope?: ScopeName; preReload?: () => Promise<void> }): Promise<CombinedTransactionResult[]> => {
      const { state, commit, dispatch } = context;
      if (state.currentSubmit !== null) {
        await state.currentSubmit;
      }

      commit("errors/resetErrors", errorKey, { root: true });
      await dispatch("clearAdded", { scope, onlyUntouched: true });
      let ops: InternalTransactionOp[];
      try {
        ops = await entityChangesToOperations(context, scope);
      } catch (e) {
        commit("errors/pushError", { key: errorKey, error: e.message }, { root: true });
        throw e;
      }
      if (ops.length === 0) {
        if (preReload) {
          try {
            await preReload();
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
            if (preReload) {
              await preReload();
            }
            commit("userView/clear", undefined, { root: true });
          } catch (e) {
            console.error("Error while commiting", e);
            // Ignore errors; they've been already handled for userView
          }
        }

        commit("finishSubmit");
        if (!(result instanceof Error)) {
          commit("errors/resetErrors", errorKey, { root: true });
          const opResults = map2((op, res) => ({ ...op, ...res } as CombinedTransactionResult), ops, result.results);
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

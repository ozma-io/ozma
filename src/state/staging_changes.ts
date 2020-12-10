import Vue from "vue";
import { Module, ActionContext } from "vuex";
import { Moment } from "moment";

import { RecordSet, deepClone, mapMaybe, map2, waitTimeout } from "@/utils";
import { IUpdatedValue, IFieldInfo, valueFromRaw } from "@/values";
import {
  ITransaction, ITransactionResult, IEntityRef, IFieldRef, IEntity, RowId, SchemaName, FieldName, EntityName,
  IInsertEntityOp, IUpdateEntityOp, IDeleteEntityOp, IInsertEntityResult, IUpdateEntityResult, IDeleteEntityResult,
  IColumnField, TransactionOp, default as Api, IResultColumnInfo,
} from "@/api";
import { i18n } from "@/modules";
import { ICombinedValue, currentValue } from "./user_view";

export type ScopeName = string;

export type UserViewKey = string;

// Scopes are used to split changes between different "windows" which can be closed separately,
// dropping only changes bound to only that particular scope.
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
  touched: boolean;
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

// Added entries are bound to a particular user view.
export type AddedEntriesMap = Record<UserViewKey, IAddedEntries>;

export interface IEntityChanges {
  updated: Record<RowId, UpdatedValues>;
  // Applied to user views with FOR INSERT INTO
  added: AddedEntriesMap;
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
  added: {},
  deleted: {},
};

export interface ICombinedInsertEntityResult extends IInsertEntityOp, IInsertEntityResult {
}

export interface ICombinedUpdateEntityResult extends IUpdateEntityOp, IUpdateEntityResult {
}

export interface ICombinedDeleteEntityResult extends IDeleteEntityOp, IDeleteEntityResult {
}

export type CombinedTransactionResult = ICombinedInsertEntityResult | ICombinedUpdateEntityResult | ICombinedDeleteEntityResult;

export class CurrentChanges {
  changes: Record<SchemaName, Record<EntityName, IEntityChanges>> = {};
  // Needed for determining whether there are changes for a given scope.
  counts: Record<ScopeName, IChangesCount> = {};
  // Needed for quick checking whether any entries are added.
  addedCount = 0;

  get isEmpty() {
    return Object.entries(this.changes).length === 0;
  }

  isScopeEmpty(name: ScopeName) {
    return !(name in this.counts);
  }

  incrementCounts(scope: ScopeName, op: (counts: IChangesCount) => void) {
    let counts = this.counts[scope];
    if (counts === undefined) {
      counts = {
        added: 0,
        updated: 0,
        deleted: 0,
      };
      Vue.set(this.counts, scope, counts);
    }
    op(counts);
  }

  checkDecrementCounts(scope: ScopeName, op: (counts: IChangesCount) => void) {
    const counts = this.counts[scope];
    op(counts);
    if (counts.added === 0 && counts.deleted === 0 && counts.updated === 0) {
      Vue.delete(this.counts, scope);
    }
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
    Object.values(entry).forEach(update => Object.keys(update.scopes).forEach(scope => this.checkDecrementCounts(scope, counts => {
      counts.updated -= 1;
    })));
  }

  resetAddedEntryValue(entityChanges: IEntityChanges, userView: UserViewKey, id: AddedRowId) {
    const uvAdded = entityChanges.added[userView];
    const entry = uvAdded.entries[id];
    Vue.delete(uvAdded.entries, id);
    const position = uvAdded.positions.indexOf(id);

    if (position === -1) {
      throw new Error("Impossible");
    }
    uvAdded.positions.splice(position, 1);
    if (uvAdded.positions.length === 0) {
      Vue.delete(entityChanges.added, userView);
    }
    this.addedCount -= 1;
    Object.keys(entry.scopes).forEach(scope => this.checkDecrementCounts(scope, counts => {
      counts.added -= 1;
    }));
  }

  resetDeletedEntryValue(entityChanges: IEntityChanges, id: RowId) {
    const entry = entityChanges.deleted[id];
    Vue.delete(entityChanges.deleted, id);
    Object.keys(entry.scopes).forEach(scope => this.checkDecrementCounts(scope, counts => {
      counts.deleted -= 1;
    }));
  }

  cleanupEntity(ref: IEntityRef, entityChanges: IEntityChanges) {
    if (Object.keys(entityChanges.updated).length === 0 && Object.keys(entityChanges.added).length === 0 && Object.keys(entityChanges.deleted).length === 0) {
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

export interface IChangesCount {
  added: number;
  updated: number;
  deleted: number;
}

export interface IStagingState {
  current: CurrentChanges;
  // Current submit promise
  currentSubmit: Promise<CombinedTransactionResult[]> | null;
  // Set if changes were made during the submit to decide how to clear.
  // We allow updating and removing entries while submit is ongoing, but not adding new ones to prevent duplicate inserts.
  touched: boolean;
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
      dispatch("submit", {});
    }, state.autoSaveTimeout);
    commit("setAutoSaveHandler", timeoutId);
  }
};

const checkAutoSave = (context: ActionContext<IStagingState, {}>) => {
  const { state, commit } = context;
  if (state.current.addedCount === 0 && state.currentSubmit === null && Object.keys(state.autoSaveLocks).length === 0) {
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

const changeToParam = (fieldInfo: IColumnField, name: FieldName, change: IUpdatedValue): any => {
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

const validateValue = (info: IFieldInfo, value: any): IUpdatedValue => {
  return {
    rawValue: value,
    value: valueFromRaw(info, value),
    erroredOnce: false,
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
    const value = { value: undefined, rawValue: "", erroredOnce: false, scopes: { [scope]: null } };
    return [name, value];
  }));
};

const checkUpdatedFields = (fields: Record<FieldName, IUpdatedValue>) => {
  Object.values(fields).forEach(field => {
    field.erroredOnce = field.value === undefined;
  });
};

const resetScopeBy = ({ state, dispatch }: ActionContext<IStagingState, {}>, checkScope: (scopes: Scopes) => boolean) => {
  Object.entries(state.current.changes).forEach(([schema, schemaChanges]) => {
    Object.entries(schemaChanges).forEach(([entity, entityChanges]) => {
      Object.entries(entityChanges.added).forEach(([userView, uvAdded]) => {
        Object.entries(uvAdded.entries).forEach(([addedIdStr, addedEntry]) => {
          const addedId = Number(addedIdStr);
          if (!checkScope(addedEntry.scopes)) {
            dispatch("resetAddedEntry", { entityRef: { schema, name: entity }, userView, id: addedId });
          }
        });
      });

      Object.entries(entityChanges.updated).forEach(([updatedIdStr, updatedEntry]) => {
        const updatedId = Number(updatedIdStr);
        Object.entries(updatedEntry).forEach(([fieldName, updatedField]) => {
          if (!checkScope(updatedField.scopes)) {
            dispatch("resetUpdatedField", { fieldRef: { entity: { schema, name: entity }, name: fieldName }, id: updatedId });
          }
        });
      });

      Object.entries(entityChanges.deleted).forEach(([deletedIdStr, deletedEntry]) => {
        const deletedId = Number(deletedIdStr);
        if (!checkScope(deletedEntry.scopes)) {
          dispatch("resetDeleteEntry", { entityRef: { schema, name: entity }, id: deletedId });
        }
      });
    });
  });
};

const errorKey = "staging";

const stagingModule: Module<IStagingState, {}> = {
  namespaced: true,
  state: {
    current: new CurrentChanges(),
    currentSubmit: null,
    touched: false,
    lastAutoSaveLock: 0,
    autoSaveTimeout: null,
    autoSaveTimeoutId: null,
    autoSaveLocks: {},
  },
  mutations: {
    clear: state => {
      state.current = new CurrentChanges();
      state.touched = false;
    },
    validate: state => {
      Object.entries(state.current.changes).forEach(([schemaName, entities]) => {
        Object.entries(entities).forEach(([entityName, entityChanges]) => {
          Object.entries(entityChanges.updated).forEach(([updatedIdStr, updatedFields]) => {
            checkUpdatedFields(updatedFields);
          });
          Object.values(entityChanges.added).forEach(uvAdded => {
            Object.values(uvAdded.entries).forEach(addedFields => {
              checkUpdatedFields(addedFields.values);
            });
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
      Vue.delete(state.autoSaveLocks, lock);
    },
    startSubmit: (state, submit: Promise<CombinedTransactionResult[]>) => {
      state.touched = false;
      state.currentSubmit = submit;
    },
    finishSubmit: state => {
      state.currentSubmit = null;
    },
    updateField: (state, params: { scope: ScopeName; fieldRef: IFieldRef; id: RowId; value: any; fieldInfo: IFieldInfo }) => {
      const { scope, fieldRef, id, value, fieldInfo } = params;

      const entityChanges = state.current.getOrCreateChanges(fieldRef.entity);
      let fields = entityChanges.updated[id];
      if (fields === undefined) {
        fields = {};
        if (id in entityChanges.deleted) {
          state.current.resetDeletedEntryValue(entityChanges, id);
        }
        Vue.set(entityChanges.updated, String(id), fields);
      }
      const oldField = fields[fieldRef.name];
      const scopes = oldField === undefined ? { [scope]: null } : { [scope]: null, ...oldField.scopes };
      Vue.set(fields, fieldRef.name, { scopes, ...validateValue(fieldInfo, value) });
      if (oldField === undefined || !(scope in oldField.scopes)) {
        state.current.incrementCounts(scope, counts => {
          counts.updated += 1;
        });
      }
      state.touched = true;
    },
    addEntry: (state, params: { scope: ScopeName; entityRef: IEntityRef; userView: UserViewKey; position?: number; entityInfo: IEntity }) => {
      const { scope, entityRef, userView, position, entityInfo } = params;

      // During submit new entries aren't allowed to be added because this can result in duplicates.
      if (state.currentSubmit !== null) {
        throw new Error("Adding entries is forbidden while submitting");
      }

      const entityChanges = state.current.getOrCreateChanges(entityRef);
      let uvAdded = entityChanges.added[userView];
      if (uvAdded === undefined) {
        uvAdded = deepClone(emptyAdded);
        entityChanges.added[userView] = uvAdded;
      }
      const newEntry = {
        values: getEmptyValues(scope, entityInfo),
        scopes: { [scope]: null },
        touched: false,
      };
      const newId = uvAdded.nextId++;
      uvAdded.entries[newId] = newEntry;
      if (position === undefined) {
        uvAdded.positions.push(newId);
      } else {
        uvAdded.positions.splice(position, 0, newId);
      }
      state.current.addedCount += 1;
      state.current.incrementCounts(scope, counts => {
        counts.added += 1;
      });
      state.touched = true;
    },
    setAddedField: (
      state,
      params: {
        scope: ScopeName;
        fieldRef: IFieldRef;
        userView: UserViewKey;
        id: AddedRowId;
        value: any;
        fieldInfo: IFieldInfo;
        noTouch?: boolean;
      },
    ) => {
      const { scope, fieldRef, userView, id, value, fieldInfo, noTouch } = params;
      // During submit new entries aren't allowed to be added because this can result in duplicates.
      if (state.currentSubmit !== null) {
        throw new Error("Adding entries is forbidden while submitting");
      }

      const entityChanges = state.current.getOrCreateChanges(fieldRef.entity);
      const uvAdded = entityChanges.added[userView];
      if (uvAdded === undefined) {
        throw new Error(`New entity id ${id} is not found`);
      }
      const added = uvAdded.entries[id];
      if (added === undefined) {
        throw new Error(`New entity id ${id} is not found`);
      }
      if (!(scope in added.scopes)) {
        Vue.set(added.scopes, scope, null);
        state.current.incrementCounts(scope, counts => {
          counts.added += 1;
        });
      }
      Vue.set(added.values, fieldRef.name, validateValue(fieldInfo, value));
      added.touched = !noTouch;
      state.touched = true;
    },
    deleteEntry: (state, params: { scope: ScopeName; entityRef: IEntityRef; id: RowId }) => {
      const { scope, entityRef, id } = params;
      const entityChanges = state.current.getOrCreateChanges(entityRef);
      const deleted = entityChanges.deleted[id];
      if (deleted === undefined) {
        const entry = {
          scopes: { [scope]: null },
        };
        Vue.set(entityChanges.deleted, String(id), entry);
        if (id in entityChanges.updated) {
          state.current.resetUpdatedEntryValue(entityChanges, id);
        }
        state.current.incrementCounts(scope, counts => {
          counts.deleted += 1;
        });
        state.touched = true;
      } else {
        if (!(scope in deleted.scopes)) {
          state.current.incrementCounts(scope, counts => {
            counts.deleted += 1;
          });
        }
        Vue.set(deleted.scopes, scope, null);
      }
    },
    resetUpdatedField: (state, params: { fieldRef: IFieldRef; id: RowId }) => {
      const { fieldRef, id } = params;
      const entityChanges = state.current.getOrCreateChanges(fieldRef.entity);
      const fieldUpdates = entityChanges.updated[id];
      if (fieldUpdates === undefined) {
        return;
      }
      const update = fieldUpdates[fieldRef.name];
      if (update !== undefined) {
        Vue.delete(fieldUpdates, fieldRef.name);
        Object.keys(update.scopes).forEach(scope => state.current.checkDecrementCounts(scope, counts => {
          counts.updated -= 1;
        }));
        if (Object.keys(fieldUpdates).length === 0) {
          state.current.resetUpdatedEntryValue(entityChanges, id);
          state.current.cleanupEntity(fieldRef.entity, entityChanges);
        }
      }
    },
    resetAddedEntry: (state, params: { entityRef: IEntityRef; userView: UserViewKey; id: AddedRowId }) => {
      const { entityRef, userView, id } = params;
      const entityChanges = state.current.getOrCreateChanges(entityRef);
      const uvAdded = entityChanges.added[userView];
      if (uvAdded === undefined) {
        return;
      }
      const added = uvAdded.entries[id];
      if (added === undefined) {
        return;
      }
      state.current.resetAddedEntryValue(entityChanges, userView, id);
      state.current.cleanupEntity(entityRef, entityChanges);
    },
    resetDeleteEntry: (state, { entityRef, id }: { entityRef: IEntityRef; id: number }) => {
      const entityChanges = state.current.getOrCreateChanges(entityRef);
      if (id in entityChanges.deleted) {
        state.current.resetDeletedEntryValue(entityChanges, id);
        state.current.cleanupEntity(entityRef, entityChanges);
      }
    },
  },
  actions: {
    updateField: async (context, args: { fieldRef: IFieldRef; id: RowId; value: any }) => {
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
      const uvAdded = entityChanges.added[args.userView];
      const newId = uvAdded.nextId - 1;
      const position = args.position ?? uvAdded.positions.length - 1;

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
        defaultValues: Record<string, any>;
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
        userView: UserViewKey;
        id: AddedRowId;
        value: any;
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
          for (const [userView, uvAdded] of Object.entries(entityChanges.added)) {
            for (const [addedIdStr, addedEntry] of Object.entries(uvAdded.entries)) {
              if ((scope === undefined || scope in addedEntry.scopes)
                  && (!onlyUntouched || (!addedEntry.touched))) {
                // Not sure about safety of parallel "resetAddedEntry" dispatches
                // and they are almost instant anyway, so awaits in loop is fine.
                // eslint-disable-next-line
                await dispatch(
                  "resetAddedEntry",
                  {
                    entityRef: { schema, name: entity },
                    userView,
                    id: Number(addedIdStr),
                  },
                );
              }
            }
          }
        }
      }
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
      resetScopeBy(context, scopes => !(scope in scopes));
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
      // await dispatch("clearAdded", { onlyUntouched: true });
      commit("validate");
      const nestedOps = await Promise.all(Object.entries(state.current.changes).map(async ([schemaName, entities]) => {
        const ret = await Promise.all(Object.entries(entities).map(async ([entityName, entityChanges]) => {
          try {
            const entity = {
              schema: schemaName,
              name: entityName,
            };
            const entityInfo = await getEntityInfo(context, entity);
            const updated =
              mapMaybe(([updatedIdStr, updatedFields]) => {
                const entries =
                      mapMaybe(([name, change]) => (scope && !(scope in change.scopes)) ? undefined : [name, changeToParam(entityInfo.columnFields[name], name, change)],
                        Object.entries(updatedFields));
                if (entries.length === 0) {
                  return undefined;
                } else {
                  return {
                    type: "update",
                    entity,
                    id: Number(updatedIdStr),
                    entries: Object.fromEntries(entries),
                  } as TransactionOp;
                }
              }, Object.entries(entityChanges.updated));
            const added =
              Object.values(entityChanges.added).flatMap(uvAdded => mapMaybe(addedFields => {
                if (scope && !(scope in addedFields.scopes)) {
                  return undefined;
                } else {
                  const entries = Object.entries(addedFields.values).map(([name, value]) => [name, changeToParam(entityInfo.columnFields[name], name, value)]);
                  return {
                    type: "insert",
                    entity,
                    entries: Object.fromEntries(entries),
                  } as TransactionOp;
                }
              }, Object.values(uvAdded.entries)));
            const deleted =
              mapMaybe(([deletedIdStr, deletedEntry]) => {
                if (scope && !(scope in deletedEntry.scopes)) {
                  return undefined;
                } else {
                  return {
                    type: "delete",
                    entity,
                    id: Number(deletedIdStr),
                  } as TransactionOp;
                }
              }, Object.entries(entityChanges.deleted));
            return [...updated, ...added, ...deleted];
          } catch (e) {
            commit("errors/pushError", { key: errorKey, error: `Invalid value for ${schemaName}.${entityName}: ${e.message}` }, { root: true });
            dispatch("userView/updateErroredOnce", undefined, { root: true });
            throw e;
          }
        }));
        return ret.flat(1);
      }));
      const ops = nestedOps.flat(1);
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
      const action: ITransaction = { operations: ops };

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
          if (state.touched) {
            await dispatch("clearAdded", { scope });
          } else if (scope) {
            await dispatch("resetScoped", scope);
          } else {
            await dispatch("reset");
          }
          return map2((op, res) => ({ ...op, ...res } as CombinedTransactionResult), ops, result.results);
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

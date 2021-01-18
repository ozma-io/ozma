import { Module } from "vuex";
import { IReferenceFieldType } from "ozma-api";

import { IRef, ObjectResourceMap, ReferenceName, waitTimeout } from "@/utils";
import { IEntityRef, RowId, IViewExprResult, default as Api } from "@/api";
import { valueToText, equalEntityRef } from "@/values";

// For each entity contains array of all accessible entries (main fields) identified by id
export type Entries = Record<RowId, string>;
export type EntriesResult = Entries | Promise<Entries> | Error;

// FIXME: this is not right -- `where?` can break `ObjectResourceMap` hashing.
// We need to use `where: string | undefined` here instead, but we opt not to
// do anything since this most likely needs to be rewritten when constrained
// references are implemented.
export interface IEntriesRef {
  entity: IEntityRef;
  where?: string;
}

export const equalEntriesRef = (a: IEntriesRef, b: IEntriesRef): boolean => {
  return equalEntityRef(a.entity, b.entity) && a.where === b.where;
};

export const referenceEntriesRef = (r: IReferenceFieldType): IEntriesRef => {
  return { entity: r.entity, where: r.where };
};

export class CurrentEntries {
  entries = new ObjectResourceMap<IEntriesRef, EntriesResult>();

  getEntriesOrError(ref: IEntriesRef) {
    const entries = this.entries.get(ref);
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

export interface IEntriesState {
  current: CurrentEntries;
}

const entriesModule: Module<IEntriesState, {}> = {
  namespaced: true,
  state: {
    current: new CurrentEntries(),
  },
  mutations: {
    initEntries: (state, args: { ref: IEntriesRef; reference: ReferenceName; entries: EntriesResult }) => {
      state.current.entries.createResource(args.ref, args.reference, args.entries, undefined);
    },
    updateEntries: (state, { ref, entries }: { ref: IEntriesRef; entries: EntriesResult }) => {
      state.current.entries.updateResource(ref, entries);
    },
    addEntriesConsumer: (state, { ref, reference }: { ref: IEntriesRef; reference: ReferenceName }) => {
      state.current.entries.addReference(ref, reference, undefined);
    },
    removeEntriesConsumer: (state, { ref, reference }: { ref: IEntriesRef; reference: ReferenceName }) => {
      state.current.entries.removeReference(ref, reference);
    },
    clear: state => {
      state.current = new CurrentEntries();
    },
  },
  actions: {
    removeAuth: {
      root: true,
      handler: ({ commit }) => {
        commit("clear");
      },
    },
    reload: {
      root: true,
      handler: ({ commit }) => {
        commit("clear");
      },
    },

    getEntries: ({ state, commit, dispatch }, { reference, ref }: { reference: ReferenceName; ref: IEntriesRef }): Promise<Entries> => {
      const oldResource = state.current.entries.getResource(ref);
      if (oldResource !== undefined) {
        if (!(reference in oldResource.refs)) {
          commit("addEntriesConsumer", { ref, reference });
        }
        const data = oldResource.value;
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
        await waitTimeout(); // Delay promise so that it gets saved to `pending` first.
        try {
          const entityPromise = dispatch("entities/getEntity", ref.entity, { root: true });
          const query = `SELECT id, __main AS name FROM "${ref.entity.schema}"."${ref.entity.name}" ORDER BY __main`;
          const resPromise = dispatch("callProtectedApi", {
            func: Api.getAnonymousUserView.bind(Api),
            args: [query, {}],
          }, { root: true });
          await entityPromise;
          const res: IViewExprResult = await resPromise;
          const currPending = state.current.entries.get(ref);
          if (currPending !== pending.ref) {
            throw new Error(`Pending entries get cancelled, ref ${JSON.stringify(ref)}`);
          }
          const mainType = res.info.columns[1].valueType;
          const entries = Object.fromEntries(res.result.rows.map<[number, string]>(row => {
            const id = row.values[0].value as number;
            const main = valueToText(mainType, row.values[1].value);
            return [id, main];
          }));
          commit("updateEntries", { ref, entries });
          return entries;
        } catch (e) {
          const currPending = state.current.entries.get(ref);
          if (currPending === pending.ref) {
            commit("updateEntries", { ref, entries: e });
          }
          throw e;
        }
      })();
      commit("initEntries", { ref, reference, entries: pending.ref });
      return pending.ref;
    },
  },
};

export default entriesModule;

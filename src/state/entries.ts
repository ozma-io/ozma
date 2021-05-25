import { ActionContext, Module } from "vuex";
import { RowId, IQueryChunk, IFieldRef, IEntityRef, IChunkWhere, IDomainValuesResult, IUserViewOpts } from "ozma-api";
import Vue from "vue";
import R from "ramda";

import { IRef, ObjectResourceMap, ReferenceName, syncObject, updateObject, waitTimeout } from "@/utils";
import Api from "@/api";
import { equalFieldRef, valueToText } from "@/values";
import { CancelledError } from "@/modules";
import { ICombinedUserViewAny } from "@/user_views/combined";

// Tree of search requests, ordered by inclusivity.

export interface ISearchNodeBase {
  search: string;
}

export interface IUpdateSearchNodeOK {
  status: "ok";
  // limit is `null` if all existing entries for this request were fetched.
  limit: number | null;
}

export interface IUpdateSearchNodeError {
  status: "error";
  error: Error;
}

export interface IUpdateSearchNodePending {
  status: "pending";
  limit: number;
  // Returns `moreAvailable`.
  pending: Promise<boolean>;
}

export type UpdateSearchNode = IUpdateSearchNodeOK | IUpdateSearchNodeError | IUpdateSearchNodePending;

export interface ISearchNodeOK extends ISearchNodeBase, IUpdateSearchNodeOK {
  children: SearchNode[];
}

export interface ISearchNodeError extends ISearchNodeBase, IUpdateSearchNodeError {
}

export interface ISearchNodePending extends ISearchNodeBase, IUpdateSearchNodePending {
  children: SearchNode[];
}

export type SearchNode = ISearchNodeOK | ISearchNodeError | ISearchNodePending;

export type Entries = Record<RowId, string>;

// Add new node to the search tree.
const insertSearchNode = (node: SearchNode, search: string, limit: number, pending: Promise<boolean>): boolean => {
  if (node.search === search) {
    const newNode: ISearchNodePending = {
      search,
      status: "pending",
      limit,
      pending,
      children: "children" in node ? node.children : [],
    };
    syncObject(node, newNode);
    return true;
  } else if (search.indexOf(node.search) !== -1) {
    if (node.status !== "ok") {
      throw new Error("Parent node is not ready");
    }
    // Try to insert node into children.
    for (const subnode of node.children) {
      if (insertSearchNode(subnode, search, limit, pending)) {
        return true;
      }
    }

    // If we fail, create a new node instead, and move eligible children to the new node
    const [newSubnodeChildren, newChildren] = R.partition(subnode => search.indexOf(subnode.search) !== -1, node.children);
    const newSubnode: ISearchNodePending = {
      search,
      status: "pending",
      limit,
      pending,
      children: newSubnodeChildren,
    };
    node.children = newChildren;
    newChildren.push(newSubnode);
    return true;
  } else {
    return false;
  }
};

const getSearchNode = (node: SearchNode, search: string): SearchNode | undefined => {
  if (node.search === search) {
    return node;
  } else if (search.indexOf(node.search) !== -1) {
    if ((node.status === "ok" && node.limit === null)) {
      return node;
    }

    if ("children" in node) {
      for (const subnode of node.children) {
        const ret = getSearchNode(subnode, search);
        if (ret) {
          return ret;
        }
      }
    }

    return undefined;
  } else {
    return undefined;
  }
};

const updateSearchNode = (node: SearchNode, search: string, update: UpdateSearchNode): boolean => {
  if (node.search === search) {
    if (node.status !== "pending") {
      throw new Error("Node is not pending");
    }

    let newNode: SearchNode;
    if (update.status === "error") {
      newNode = {
        search,
        ...update,
      };
    } else {
      newNode = {
        search,
        ...update,
        children: node.children,
      };
    }
    syncObject(node, newNode);
    return true;
  } else if (search.indexOf(node.search) !== -1) {
    if (!("children" in node)) return false;
    for (const subnode of node.children) {
      if (updateSearchNode(subnode, search, update)) {
        return true;
      }
    }
    return false;
  } else {
    return false;
  }
};

type AwaitEntriesResult =
  { result: "ok"; moreAvailable: boolean } |
  { result: "error"; error: Error } |
  { result: "need_more"; offset: number } |
  { result: "missing" } |
  { result: "pending"; pending: Promise<boolean> };

const waitSearchNode = (node: SearchNode, search: string, limit: number): AwaitEntriesResult => {
  if (node.search === search) {
    if (node.status === "pending") {
      return { result: "pending", pending: node.pending };
    }

    if (node.status === "error") {
      return { result: "error", error: node.error };
    }

    if (node.limit === null || node.limit >= limit) {
      return { result: "ok", moreAvailable: node.limit !== null };
    } else {
      return { result: "need_more", offset: node.limit };
    }
  } else if (search.indexOf(node.search) !== -1) {
    if (node.status === "pending") {
      return { result: "pending", pending: node.pending };
    }

    if (node.status === "error") {
      return { result: "error", error: node.error };
    }

    if (node.limit === null) {
      return { result: "ok", moreAvailable: false };
    } else {
      for (const subnode of node.children) {
        const ret = waitSearchNode(subnode, search, limit);
        if (ret.result !== "missing") {
          return ret;
        }
      }
      return { result: "missing" };
    }
  } else {
    return { result: "missing" };
  }
};

export class PartialEntries {
  searchTree: SearchNode | null;
  pendingSingleEntries: Record<RowId, Promise<Entries> | null>;
  // Entries (main fields) identified by id.
  entries: Entries;

  constructor() {
    this.searchTree = null;
    this.entries = {};
    this.pendingSingleEntries = {};
  }

  insert(search: string, limit: number, pending: Promise<boolean>) {
    const lowerSearch = search.toLowerCase();
    if (this.searchTree === null) {
      this.searchTree = {
        status: "pending",
        search: lowerSearch,
        limit,
        pending,
        children: [],
      };
    } else if (!insertSearchNode(this.searchTree, lowerSearch, limit, pending)) {
      // Insert phantom empty node.
      const newNode: SearchNode = {
        status: "pending",
        search: lowerSearch,
        limit,
        pending,
        children: [],
      };
      this.searchTree = {
        status: "ok",
        search: "",
        limit: 0,
        children: [this.searchTree, newNode],
      };
    }
  }

  get(search: string) {
    if (this.searchTree === null) {
      return undefined;
    } else {
      return getSearchNode(this.searchTree, search.toLowerCase());
    }
  }

  wait(search: string, limit: number): AwaitEntriesResult {
    if (this.searchTree === null) {
      return { result: "missing" };
    } else {
      return waitSearchNode(this.searchTree, search.toLowerCase(), limit);
    }
  }

  update(search: string, update: UpdateSearchNode) {
    if (this.searchTree === null) {
      throw new Error("Search tree must exist");
    } else if (!updateSearchNode(this.searchTree, search.toLowerCase(), update)) {
      throw new Error("Node not found");
    }
  }

  updatePendingSingleEntry(id: number, pending: Promise<Entries> | null) {
    void Vue.set(this.pendingSingleEntries, id, pending);
  }

  removePendingSingleEntry(id: number) {
    Vue.delete(this.pendingSingleEntries, id);
  }

  addSingleEntry(id: number, main: string) {
    Vue.set(this.entries, id, main);
  }

  addEntries(entries: Entries) {
    updateObject(this.entries, entries);
  }
}

export interface IEntriesRef {
  field: IFieldRef;
  rowId: RowId | null;
}

export const equalEntriesRef = (a: IEntriesRef, b: IEntriesRef) => {
  return equalFieldRef(a.field, b.field) && a.rowId === b.rowId;
};

export class CurrentEntries {
  // We refer to entries by the field that references to them.
  entries = new ObjectResourceMap<IEntriesRef, PartialEntries>();

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

const fetchEntries123 =
  async (context: ActionContext<IEntriesState, {}>, ref: IEntityRef, search: string, offset: number, limit: number):
  Promise<{ entries: Entries; complete: boolean }> =>
{
  const likeSearch = search === "" ? "%" : "%" + search.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_") + "%";
  const where: IChunkWhere = {
    expression: "(pun :: string) ILIKE $search",
    arguments: {
      search: {
        type: "string",
        value: likeSearch,
      },
    },
  };
  const chunk: IQueryChunk = {
    offset,
    limit: limit + 1,
    where,
  };
  const req: IUserViewOpts = {
    chunk,
  };

  const res = await context.dispatch("callProtectedApi", {
    func: Api.getDomainValues.bind(Api),
    args: [ref.field, ref.rowId ?? undefined, req],
  }, { root: true }) as IDomainValuesResult;
  const entries = Object.fromEntries(res.values.map<[number, string]>(row => {
    const main = valueToText(res.punType, row.pun);
    return [Number(row.value), main];
  }));
  return {
    entries,
    complete: res.values.length <= limit,
  };
};

const fetchEntries = async (context: ActionContext<IEntriesState, {}>, ref: IEntriesRef, search: string, offset: number, limit: number): Promise<{ entries: Entries; complete: boolean }> => {
  const likeSearch = search === "" ? "%" : "%" + search.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_") + "%";
  const where: IChunkWhere = {
    expression: "(pun :: string) ILIKE $search",
    arguments: {
      search: {
        type: "string",
        value: likeSearch,
      },
    },
  };
  const chunk: IQueryChunk = {
    offset,
    limit: limit + 1,
    where,
  };
  const req: IUserViewOpts = {
    chunk,
  };

  const res = await context.dispatch("callProtectedApi", {
    func: Api.getDomainValues.bind(Api),
    args: [ref.field, ref.rowId ?? undefined, req],
  }, { root: true }) as IDomainValuesResult;
  const entries = Object.fromEntries(res.values.map<[number, string]>(row => {
    const main = valueToText(res.punType, row.pun);
    return [Number(row.value), main];
  }));
  return {
    entries,
    complete: res.values.length <= limit,
  };
};

const fetchEntriesByIds = async (context: ActionContext<IEntriesState, {}>, ref: IEntriesRef, ids: RowId[]): Promise<Record<RowId, string>> => {
  const where: IChunkWhere = {
    expression: "value = ANY ($ids)",
    arguments: {
      ids: {
        type: "array(int)",
        value: ids,
      },
    },
  };
  const chunk: IQueryChunk = {
    where,
  };
  const req: IUserViewOpts = {
    chunk,
  };

  const res = await context.dispatch("callProtectedApi", {
    func: Api.getDomainValues.bind(Api),
    args: [ref.field, ref.rowId ?? undefined, req],
  }, { root: true }) as IDomainValuesResult;
  return Object.fromEntries(res.values.map<[number, string]>(row => {
    const main = valueToText(res.punType, row.pun);
    return [Number(row.value), main];
  }));
};

export const getReferenceInfo = (uv: ICombinedUserViewAny, columnI: number, rowId: number | null): { referenceEntity: IEntityRef; entries: IEntriesRef } | null => {
  const mainField = uv.info.columns[columnI].mainField;
  if (!mainField || mainField.field.fieldType.type !== "reference") {
    return null;
  } else {
    return {
      referenceEntity: mainField.field.fieldType.entity,
      entries: {
        field: {
          entity: uv.info.mainEntity!,
          name: mainField.name,
        },
        rowId,
      },
    };
  }
};

const entriesModule: Module<IEntriesState, {}> = {
  namespaced: true,
  state: {
    current: new CurrentEntries(),
  },
  mutations: {
    initPartialEntries: (state, args: { ref: IEntriesRef; reference: ReferenceName }) => {
      const partial = new PartialEntries();
      state.current.entries.createResource(args.ref, args.reference, partial, undefined);
    },
    insertSearchNode: (state, args: { ref: IEntriesRef; search: string; limit: number; pending: Promise<boolean> }) => {
      state.current.getEntries(args.ref)!.insert(args.search, args.limit, args.pending);
    },
    updateSearchNode: (state, args: { ref: IEntriesRef; search: string; update: UpdateSearchNode }) => {
      state.current.getEntries(args.ref)!.update(args.search, args.update);
    },
    addEntries: (state, args: { ref: IEntriesRef; entries: Entries }) => {
      state.current.getEntries(args.ref)!.addEntries(args.entries);
    },
    addSingleEntry: (state, args: { ref: IEntriesRef; id: number; main: string }) => {
      state.current.getEntries(args.ref)!.addSingleEntry(args.id, args.main);
    },
    updatePendingSingleEntry: (state, args: { ref: IEntriesRef; id: number; pending: Promise<Entries> | null }) => {
      state.current.getEntries(args.ref)!.updatePendingSingleEntry(args.id, args.pending);
    },
    removePendingSingleEntry: (state, args: { ref: IEntriesRef; id: number }) => {
      state.current.getEntries(args.ref)!.removePendingSingleEntry(args.id);
    },
    addEntriesConsumer: (state, { ref, reference }: { ref: IEntriesRef; reference: ReferenceName }) => {
      const oldResource = state.current.entries.getResource(ref);
      if (oldResource) {
        state.current.entries.addReference(ref, reference, undefined);
      } else {
        const partial = new PartialEntries();
        state.current.entries.createResource(ref, reference, partial, undefined);
      }
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

    getEntriesByIds: (context, args: { reference: ReferenceName; ref: IEntriesRef; ids: RowId[] }): Promise<Entries> => {
      const { state, commit, dispatch } = context;
      const { reference, ref, ids } = args;
      const oldCurrent = state.current;
      const oldResource = oldCurrent.entries.getResource(ref);

      const result: Record<RowId, string> = {};
      const awaitedIds: [RowId, Promise<Entries>][] = [];

      let requestedIds: RowId[];
      if (oldResource !== undefined) {
        if (!(reference in oldResource.refs)) {
          commit("addEntriesConsumer", { ref, reference });
        }
        const partial = oldResource.value;
        requestedIds = [];
        for (const id of ids) {
          const existingValue = partial.entries[id];
          if (existingValue !== undefined) {
            result[id] = existingValue;
            continue;
          }
          const existingPending = partial.pendingSingleEntries[id];
          if (existingPending !== undefined) {
            if (existingPending !== null) {
              awaitedIds.push([id, existingPending]);
            }
            continue;
          }
          requestedIds.push(id);
        }
      } else {
        requestedIds = ids;
      }

      if (requestedIds.length !== 0) {
        const pending: IRef<Promise<Record<RowId, string>>> = {};
        pending.ref = (async () => {
          await waitTimeout(); // Delay promise so that it gets saved to `pending` first.
          const puns = await fetchEntriesByIds(context, ref, requestedIds);

          for (const id of requestedIds) {
            const pun = puns[id];
            const currPending = state.current.entries.get(ref)?.pendingSingleEntries[id];
            if (currPending !== pending.ref) {
              console.warn(`Pending operation cancelled, requested ids ${requestedIds}`);
              continue;
            }

            if (pun === undefined) {
              commit("updatePendingSingleEntry", { ref, reference, id, pending: null });
              continue;
            }

            commit("addSingleEntry", { ref, id, main: pun });
            commit("removePendingSingleEntry", { ref, id });
          }

          return puns;
        })();
        if (oldResource === undefined) {
          // Prefetch entity.
          void dispatch("entities/getEntity", ref.field.entity, { root: true });
          commit("initPartialEntries", { ref, reference });
        }
        for (const id of requestedIds) {
          awaitedIds.push([id, pending.ref]);
          commit("updatePendingSingleEntry", { ref, reference, id, pending: pending.ref });
        }
      }

      return Promise.all(awaitedIds.map(([id, promise]) => promise)).then(newEntries => {
        awaitedIds.forEach(([id, promise], idI) => {
          const pun = newEntries[idI][id];
          if (pun !== undefined) {
            result[id] = pun;
          }
        });
        return result;
      });
    },

    // Returns `true` if more entries can be loaded for this `ref` and `search`.
    getEntries: async (context, args: { reference: ReferenceName; ref: IEntriesRef; search: string; limit: number }): Promise<boolean> => {
      const { state, commit, dispatch } = context;
      const { reference, ref, search, limit } = args;

      let offset = 0;

      const oldCurrent = state.current;
      const oldResource = oldCurrent.entries.getResource(ref);

      if (oldResource !== undefined) {
        if (!(reference in oldResource.refs)) {
          commit("addEntriesConsumer", { ref, reference });
        }
        const partial = oldResource.value;
        let data: AwaitEntriesResult;
        while (true) {
          data = partial.wait(args.search, limit);
          if (data.result === "pending") {
            // We wait and then try again.
            // eslint-disable-next-line no-await-in-loop
            await data.pending;
          } else {
            break;
          }
        }
        if (oldCurrent !== state.current) {
          throw new CancelledError(`Pending entries got cancelled, ref ${JSON.stringify(ref)}`);
        }
        if (data.result === "error") {
          throw data.error;
        } else if (data.result === "ok") {
          return data.moreAvailable;
        } else if (data.result === "need_more") {
          offset = data.offset;
        }
      }

      const pending: IRef<Promise<boolean>> = {};
      pending.ref = (async () => {
        await waitTimeout(); // Delay promise so that it gets saved to `pending` first.
        let update: UpdateSearchNode;
        try {
          const ret = await fetchEntries(context, ref, search, offset, limit);
          commit("addEntries", { ref, entries: ret.entries });
          update = {
            status: "ok",
            limit: ret.complete ? null : limit,
          };
        } catch (error) {
          update = {
            status: "error",
            error,
          };
        }

        const currNode = state.current.entries.get(ref)?.get(args.search);
        if (currNode?.status !== "pending" || currNode.pending !== pending.ref) {
          throw new CancelledError(`Pending entries got cancelled, ref ${JSON.stringify(ref)}`);
        }
        commit("updateSearchNode", { ref, search, update });
        if (update.status === "ok") {
          return update.limit !== null;
        } else {
          throw update.error;
        }
      })();
      if (oldResource === undefined) {
        // Prefetch entity.
        void dispatch("entities/getEntity", ref.field.entity, { root: true });
        commit("initPartialEntries", { ref, reference });
      }
      commit("insertSearchNode", { ref, search, limit, pending: pending.ref });
      return pending.ref;
    },
  },
};

export default entriesModule;

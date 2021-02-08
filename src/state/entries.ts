import { ActionContext, Module } from "vuex";
import { IReferenceFieldType, RowId, IViewExprResult, IReferenceEntity, IViewChunk } from "ozma-api";
import Vue from "vue";
import R from "ramda";

import { IRef, ObjectResourceMap, ReferenceName, syncObject, updateObject, waitTimeout } from "@/utils";
import Api from "@/api";
import { valueToText, equalEntityRef } from "@/values";

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
  pending: Promise<void>;
}

type UpdateSearchNode = IUpdateSearchNodeOK | IUpdateSearchNodeError | IUpdateSearchNodePending;

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
const insertSearchNode = (node: SearchNode, search: string, limit: number, pending: Promise<void>): boolean => {
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
    if (!("children" in node)) return undefined;
    for (const subnode of node.children) {
      const ret = getSearchNode(subnode, search);
      if (ret) {
        return ret;
      }
    }
    return undefined;
  } else {
    return undefined;
  }
};

const updateSearchNode = (startNode: SearchNode, search: string, update: UpdateSearchNode) => {
  const node = getSearchNode(startNode, search);
  if (!node) {
    throw new Error("Node not found");
  }
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
};

type AwaitEntriesResult =
  { result: "ok" } |
  { result: "error"; error: Error } |
  { result: "need_more"; offset: number } |
  { result: "missing" } |
  { result: "pending"; pending: Promise<void> };

const waitSearchNode = (node: SearchNode, search: string, limit: number): AwaitEntriesResult => {
  if (node.search === search) {
    if (node.status === "pending") {
      return { result: "pending", pending: node.pending };
    }

    if (node.status === "error") {
      return { result: "error", error: node.error };
    }

    if (node.limit === null || node.limit >= limit) {
      return { result: "ok" };
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
      return { result: "ok" };
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
  pendingSingleEntries: Record<RowId, Promise<string | undefined>>;
  // Entries (main fields) identified by id.
  entries: Entries;

  constructor() {
    this.searchTree = null;
    this.entries = {};
    this.pendingSingleEntries = {};
  }

  insert(search: string, limit: number, pending: Promise<void>) {
    if (this.searchTree === null) {
      this.searchTree = {
        status: "pending",
        search,
        limit,
        pending,
        children: [],
      };
    } else if (!insertSearchNode(this.searchTree, search, limit, pending)) {
      // Insert phantom empty node.
      const newNode: SearchNode = {
        status: "pending",
        search,
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
      return getSearchNode(this.searchTree, search);
    }
  }

  wait(search: string, limit: number): AwaitEntriesResult {
    if (this.searchTree === null) {
      return { result: "missing" };
    } else {
      return waitSearchNode(this.searchTree, search, limit);
    }
  }

  update(search: string, update: UpdateSearchNode) {
    if (this.searchTree === null) {
      throw new Error("Search tree must exist");
    } else {
      updateSearchNode(this.searchTree, search, update);
    }
  }

  addPendingSingleEntry(id: number, pending: Promise<string | void>) {
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

export type IEntriesRef = IReferenceEntity;

export const equalEntriesRef = (a: IEntriesRef, b: IEntriesRef): boolean => {
  return equalEntityRef(a.entity, b.entity) && a.where === b.where;
};

export const referenceEntriesRef = (r: IReferenceFieldType): IEntriesRef => {
  return { entity: r.entity, where: r.where };
};

export class CurrentEntries {
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

const fetchEntries = async (context: ActionContext<IEntriesState, {}>, ref: IEntriesRef, search: string, offset: number, limit: number): Promise<{ entries: Entries; complete: boolean }> => {
  const query = `{ $search string }: SELECT id, __main FROM "${ref.entity.schema}"."${ref.entity.name}" WHERE __main ILIKE $search ORDER BY __main, id`;
  const likeSearch = search === "" ? "%" : "%" + search.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_") + "%";
  const chunk: IViewChunk = { offset, limit: limit + 1 };
  const res = await context.dispatch("callProtectedApi", {
    func: Api.getAnonymousUserView.bind(Api),
    args: [query, { search: likeSearch }, chunk],
  }, { root: true }) as IViewExprResult;
  const mainType = res.info.columns[1].valueType;
  const entries = Object.fromEntries(res.result.rows.map<[number, string]>(row => {
    const id = row.values[0].value as number;
    const main = valueToText(mainType, row.values[1].value);
    return [id, main];
  }));
  return {
    entries,
    complete: res.result.rows.length <= limit,
  };
};

const fetchSingleEntry = async (context: ActionContext<IEntriesState, {}>, ref: IEntriesRef, id: number): Promise<string | undefined> => {
  const query = `{ $id int }: SELECT __main FROM "${ref.entity.schema}"."${ref.entity.name}" WHERE id = $id`;
  const res = await context.dispatch("callProtectedApi", {
    func: Api.getAnonymousUserView.bind(Api),
    args: [query, { id }],
  }, { root: true }) as IViewExprResult;
  const mainType = res.info.columns[0].valueType;
  const row = res.result.rows[0];
  if (!row) {
    return undefined;
  } else {
    const main = valueToText(mainType, row.values[0].value);
    return main;
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
    insertSearchNode: (state, args: { ref: IEntriesRef; search: string; limit: number; pending: Promise<void> }) => {
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
    addPendingSingleEntry: (state, args: { ref: IEntriesRef; id: number; pending: Promise<string | undefined> }) => {
      state.current.getEntries(args.ref)!.addPendingSingleEntry(args.id, args.pending);
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

    getSingleEntry: (context, args: { reference: ReferenceName; ref: IEntriesRef; id: number }): Promise<string | undefined> => {
      const { state, commit, dispatch } = context;
      const { reference, ref, id } = args;
      const oldCurrent = state.current;
      const oldResource = oldCurrent.entries.getResource(ref);

      if (oldResource !== undefined) {
        if (!(reference in oldResource.refs)) {
          commit("addEntriesConsumer", { ref, reference });
        }
        const partial = oldResource.value;
        const existingValue = partial.entries[id];
        if (existingValue !== undefined) {
          return Promise.resolve(existingValue);
        }
        const existingPending = partial.pendingSingleEntries[id];
        if (existingPending !== undefined) {
          return existingPending;
        }
      }

      const pending: IRef<Promise<string | undefined>> = {};
      pending.ref = (async () => {
        await waitTimeout(); // Delay promise so that it gets saved to `pending` first.
        const ret = await fetchSingleEntry(context, ref, id);

        const currPending = state.current.entries.get(ref)?.pendingSingleEntries[id];
        if (currPending !== pending.ref) {
          throw new Error(`Pending single entry got cancelled, ref ${JSON.stringify(ref)}`);
        }

        if (ret === undefined) {
          // We don't remove ourselves from pending single entries, so that we won't try to fetch it anymore.
          return undefined;
        }

        commit("addSingleEntry", { ref, id, main: ret });
        commit("removePendingSingleEntry", { ref, id });
        return ret;
      })();
      if (oldResource === undefined) {
        // Prefetch entity.
        void dispatch("entities/getEntity", ref.entity, { root: true });
        commit("initPartialEntries", { ref, reference });
      }
      commit("addPendingSingleEntry", { ref, reference, id, pending: pending.ref });
      return pending.ref;
    },

    getEntries: async (context, args: { reference: ReferenceName; ref: IEntriesRef; search: string; limit: number }): Promise<void> => {
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
          throw new Error(`Pending entries got cancelled, ref ${JSON.stringify(ref)}`);
        }
        if (data.result === "error") {
          throw data.error;
        } else if (data.result === "ok") {
          return;
        } else if (data.result === "need_more") {
          offset = data.offset;
        }
      }

      const pending: IRef<Promise<void>> = {};
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
          throw new Error(`Pending entries got cancelled, ref ${JSON.stringify(ref)}`);
        }
        commit("updateSearchNode", { ref, search, update });
      })();
      if (oldResource === undefined) {
        // Prefetch entity.
        void dispatch("entities/getEntity", ref.entity, { root: true });
        commit("initPartialEntries", { ref, reference });
      }
      commit("insertSearchNode", { ref, search, limit, pending: pending.ref });
      await pending.ref;
    },
  },
};

export default entriesModule;

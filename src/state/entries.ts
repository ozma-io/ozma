import { ActionContext, Module } from "vuex";
import { RowId, IQueryChunk, IFieldRef, IEntityRef, IChunkWhere, IDomainValuesResult, IViewExprResult, IEntriesRequestOpts, ValueType } from "ozma-api";
import Vue from "vue";
import R from "ramda";

import { app } from "@/main";
import { IRef, NeverError, ObjectResourceMap, ReferenceName, syncObject, updateObject, waitTimeout, shortLanguage } from "@/utils";
import Api from "@/api";
import { valueToText } from "@/values";
import { CancelledError } from "@/modules";
import { ICombinedUserViewAny } from "@/user_views/combined";
import { IQuery } from "./query";

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

const punToText = (pun: unknown, id: unknown, punType: ValueType) => pun === null ? `${id}` : valueToText(punType, pun);

const messages: Record<string, Record<string, string>> = {
  en: {
    "not_all_values_found_in_options": "Not all references were found in `options_view` or `referenced_entity`",
    "not_found": "Not found",
  },
  ru: {
    "not_all_values_found_in_options": "Не все значения-отношения были найдены в `options_view` или `referenced_entity`",
    "not_found": "Не найдены",
  },
};
const funI18n = (key: string) => messages[shortLanguage]?.[key]; // TODO: can't access VueI18n here, but this solution looks stupid too.

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
  | { result: "ok"; moreAvailable: boolean }
  | { result: "error"; error: Error }
  | { result: "need_more"; offset: number }
  | { result: "missing" }
  | { result: "pending"; pending: Promise<boolean> };

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

export interface IReferencedField {
  field: IFieldRef;
  rowId: RowId | null;
}

export interface IEntriesRefByDomain {
  fetchBy: "domain";
  entity: IEntityRef;
  referencedBy: IReferencedField;
}
export interface IEntriesRefByEntity {
  fetchBy: "entity";
  entity: IEntityRef;
}
export interface IEntriesRefByOptionsView {
  fetchBy: "options_view";
  optionsView: IQuery;
  referencedTo: IEntityRef | null;
}
export type EntriesRef =
  | IEntriesRefByDomain
  | IEntriesRefByEntity
  | IEntriesRefByOptionsView;

export class CurrentEntries {
  entries = new ObjectResourceMap<EntriesRef, PartialEntries>();

  getEntriesOrError(ref: EntriesRef) {
    const entries = this.entries.get(ref);
    if (entries === undefined || entries instanceof Promise) {
      return undefined;
    } else {
      return entries;
    }
  }

  getEntries(ref: EntriesRef) {
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

const fetchEntriesByEntity = async (context: ActionContext<IEntriesState, {}>, ref: IEntityRef, search: string, offset: number, limit: number): Promise<{ entries: Entries; complete: boolean }> => {
  const likeSearch = search === "" ? "%" : `%${search.replaceAll(/\\|%|_/g, "\\$&")}%`; // Escape characters.
  const where: IChunkWhere | undefined =
    search === ""
      ? undefined
      : {
        expression: "main ILIKE $search",
        arguments: {
          search: {
            type: "string",
            value: likeSearch,
          },
        },
      };
  const view = `"${ref.schema}"."${ref.name}"`;
  const query = `SELECT id, __main :: string AS main FROM ${view}`;
  const chunk: IQueryChunk = { offset, limit: limit + 1, where };
  const res = await context.dispatch("callProtectedApi", {
    func: Api.getAnonymousUserView.bind(Api),
    args: [query, { search: likeSearch }, { chunk }],
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

const fetchEntriesByDomain = async (context: ActionContext<IEntriesState, {}>, referencedBy: IReferencedField, search: string, offset: number, limit: number): Promise<{ entries: Entries; complete: boolean }> => {
  const likeSearch = search === "" ? "%" : `%${search.replaceAll(/\\|%|_/g, "\\$&")}%`; // Escape characters.
  const where: IChunkWhere | undefined =
    search === ""
      ? undefined
      : {
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
  const opts: IEntriesRequestOpts = {
    chunk,
  };

  const res = await context.dispatch("callProtectedApi", {
    func: Api.getDomainValues.bind(Api),
    args: [referencedBy.field, referencedBy.rowId ?? undefined, opts],
  }, { root: true }) as IDomainValuesResult;
  const entries = Object.fromEntries(res.values.map<[number, string]>(row => {
    const main = punToText(row.pun, row.value, res.punType);
    return [Number(row.value), main];
  }));

  return {
    entries,
    complete: res.values.length <= limit,
  };
};

const fetchEntriesByOptionsView = async (context: ActionContext<IEntriesState, {}>, optionsView: IQuery, search: string, offset: number, limit: number): Promise<{ entries: Entries; complete: boolean }> => {
  if (optionsView.args.source.type !== "named") {
    throw new Error("Unnamed user views aren't supported");
  }
  const likeSearch = search === "" ? "%" : `%${search.replaceAll(/\\|%|_/g, "\\$&")}%`; // Escape characters.
  const where: IChunkWhere | undefined =
    search === ""
      ? undefined
      : {
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
  const opts: IEntriesRequestOpts = {
    chunk,
  };

  const res = await context.dispatch("callProtectedApi", {
    func: Api.getNamedUserView.bind(Api),
    args: [optionsView.args.source.ref, optionsView.args.args, opts],
  }, { root: true }) as IViewExprResult;

  const idColumnIndex = res.info.columns.findIndex(column => column.name === "value" || column.name === "id"); // "id" is deprecated.
  const nameColumnIndex = res.info.columns.findIndex(column => column.name === "pun" || column.name === "name"); // "name" is deprecated.
  if (idColumnIndex === -1 || nameColumnIndex === -1) {
    throw new Error("User view for reference constraint must have columns `value` and `pun`");
  }
  const mainType = res.info.columns[nameColumnIndex].valueType;
  const entries = Object.fromEntries(res.result.rows.map<[number, string]>(row => {
    const id = row.values[idColumnIndex].value as number;
    const main = valueToText(mainType, row.values[nameColumnIndex].value);
    return [id, main];
  }));
  return {
    entries,
    complete: res.result.rows.length <= limit,
  };
};

const fetchEntries = async (context: ActionContext<IEntriesState, {}>, ref: EntriesRef, search: string, offset: number, limit: number): Promise<{ entries: Entries; complete: boolean }> => {
  switch (ref.fetchBy) {
    case "domain":
      return fetchEntriesByDomain(context, ref.referencedBy, search, offset, limit);
    case "entity":
      return fetchEntriesByEntity(context, ref.entity, search, offset, limit);
    case "options_view":
      return fetchEntriesByOptionsView(context, ref.optionsView, search, offset, limit);
    default:
      throw new NeverError(ref);
  }
};

const fetchEntriesByDomainByIds = async (context: ActionContext<IEntriesState, {}>, referencedBy: IReferencedField, ids: RowId[]): Promise<Record<string, string>> => {
  const where: IChunkWhere = {
    expression: "value = ANY ($ids)",
    arguments: {
      ids: {
        type: "array(int)",
        value: ids,
      },
    },
  };
  const req: IEntriesRequestOpts = {
    chunk: { where },
  };

  const res = await context.dispatch("callProtectedApi", {
    func: Api.getDomainValues.bind(Api),
    args: [referencedBy.field, referencedBy.rowId ?? undefined, req],
  }, { root: true }) as IDomainValuesResult;

  return Object.fromEntries(res.values.map<[number, string]>(row => {
    const main = valueToText(res.punType, row.pun);
    return [Number(row.value), main];
  }));
};

const fetchEntriesByEntityByIds = async (context: ActionContext<IEntriesState, {}>, entity: IEntityRef, ids: RowId[]): Promise<Record<string, string>> => {
  const { schema, name } = entity;
  const view = `"${schema}"."${name}"`;
  const query = `{ $ids array(int) }: SELECT id, __main AS main FROM ${view} WHERE id = ANY ($ids)`;
  const res = await context.dispatch("callProtectedApi", {
    func: Api.getAnonymousUserView.bind(Api),
    args: [query, { ids }],
  }, { root: true }) as IViewExprResult;
  const mainType = res.info.columns[0].valueType;

  return Object.fromEntries(res.result.rows.map(row => {
    const id = row.values[0].value;
    const pun = row.values[1].value;
    return [id, valueToText(mainType, pun)];
  }));
};

const fetchEntriesByOptionsViewByIds = async (context: ActionContext<IEntriesState, {}>, optionsView: IQuery, ids: RowId[]): Promise<Record<string, string>> => {
  if (optionsView.args.source.type === "anonymous") {
    throw new Error("Anonymous options_view is not supported");
  }
  const where: IChunkWhere = {
    expression: "value = ANY ($ids)",
    arguments: {
      ids: {
        type: "array(int)",
        value: ids,
      },
    },
  };
  const req: IEntriesRequestOpts = {
    chunk: { where },
  };

  const res = await context.dispatch("callProtectedApi", {
    func: Api.getNamedUserView.bind(Api),
    args: [optionsView.args.source.ref, optionsView.args.args, req],
  }, { root: true }) as IViewExprResult;
  const idColumnIndex = res.info.columns.findIndex(column => column.name === "value" || column.name === "id"); // "id" is deprecated.
  const nameColumnIndex = res.info.columns.findIndex(column => column.name === "pun" || column.name === "name"); // "name" is deprecated.
  if (idColumnIndex === -1 || nameColumnIndex === -1) {
    throw new Error("User view for reference constraint must have columns `value` and `pun`");
  }
  const mainType = res.info.columns[nameColumnIndex].valueType;
  return Object.fromEntries(res.result.rows.map<[number, string]>(row => {
    const id = row.values[idColumnIndex].value as number;
    const main = valueToText(mainType, row.values[nameColumnIndex].value);
    return [id, main];
  }));
};

const showNotFoundIdsError = (notFoundIds: number[]) => {
  const message = `${funI18n("not_found")}: ${notFoundIds}`;
  app.$bvToast.toast(message, {
    title: funI18n("not_all_values_found_in_options"),
    variant: "danger",
    solid: true,
  });
};

// `ids` may contain ids which are not presented in options_view now, so we may fallback to entity to get at least something.
const fetchEntriesByOptionsViewOrEntityByIds = async (context: ActionContext<IEntriesState, {}>, optionsView: IQuery, entity: IEntityRef | null, ids: RowId[]) => {
  const optionsViewEntries = await fetchEntriesByOptionsViewByIds(context, optionsView, ids);
  const optionsViewEntriesIds = Object.keys(optionsViewEntries).map(key => Number.parseInt(key, 10));
  if (ids.length === optionsViewEntriesIds.length) {
    return optionsViewEntries;
  } else {
    let entityEntries: Record<string, string> = {};
    if (entity) {
      const notFoundInOptionsViewIds = R.difference(ids, optionsViewEntriesIds);
      entityEntries = await fetchEntriesByEntityByIds(context, entity, notFoundInOptionsViewIds);
    }

    if (optionsViewEntriesIds.length + Object.keys(entityEntries).length === ids.length) {
      return { ...optionsViewEntries, ...entityEntries };
    } else {
      const foundIds = [...optionsViewEntriesIds, ...Object.keys(entityEntries).map(key => Number.parseInt(key, 10))];
      const notFoundIds = R.difference(ids, foundIds);
      // TODO: In-place error would be better than toast.
      showNotFoundIdsError(notFoundIds);

      const notFoundEntries = Object.fromEntries(notFoundIds.map(id => [id, String(id)]));
      return { ...optionsViewEntries, ...entityEntries, ...notFoundEntries };
    }
  }
};

const fetchEntriesByIds = async (context: ActionContext<IEntriesState, {}>, ref: EntriesRef, ids: RowId[]): Promise<Record<RowId, string>> => {
  switch (ref.fetchBy) {
    case "domain":
      return fetchEntriesByDomainByIds(context, ref.referencedBy, ids);
    case "entity":
      return fetchEntriesByEntityByIds(context, ref.entity, ids);
    case "options_view":
      return fetchEntriesByOptionsViewOrEntityByIds(context, ref.optionsView, ref.referencedTo, ids);
    default:
      throw new NeverError(ref);
  }
};

export const getReferenceInfo = (uv: ICombinedUserViewAny, columnI: number, rowId: number | null): { referenceEntity: IEntityRef; entries: IEntriesRefByDomain } | null => {
  const mainField = uv.info.columns[columnI].mainField;
  if (!mainField || mainField.field.fieldType.type !== "reference") {
    return null;
  } else {
    return {
      referenceEntity: mainField.field.fieldType.entity,
      entries: {
        fetchBy: "domain",
        entity: mainField.field.fieldType.entity,
        referencedBy: {
          field: {
            entity: uv.info.mainEntity!,
            name: mainField.name,
          },
          rowId,
        },
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
    initPartialEntries: (state, args: { ref: EntriesRef; reference: ReferenceName }) => {
      const partial = new PartialEntries();
      state.current.entries.createResource(args.ref, args.reference, partial, undefined);
    },
    insertSearchNode: (state, args: { ref: EntriesRef; search: string; limit: number; pending: Promise<boolean> }) => {
      state.current.getEntries(args.ref)!.insert(args.search, args.limit, args.pending);
    },
    updateSearchNode: (state, args: { ref: EntriesRef; search: string; update: UpdateSearchNode }) => {
      state.current.getEntries(args.ref)!.update(args.search, args.update);
    },
    addEntries: (state, args: { ref: EntriesRef; entries: Entries }) => {
      state.current.getEntries(args.ref)!.addEntries(args.entries);
    },
    addSingleEntry: (state, args: { ref: EntriesRef; id: number; main: string }) => {
      state.current.getEntries(args.ref)!.addSingleEntry(args.id, args.main);
    },
    updatePendingSingleEntry: (state, args: { ref: EntriesRef; id: number; pending: Promise<Entries> | null }) => {
      state.current.getEntries(args.ref)!.updatePendingSingleEntry(args.id, args.pending);
    },
    removePendingSingleEntry: (state, args: { ref: EntriesRef; id: number }) => {
      state.current.getEntries(args.ref)!.removePendingSingleEntry(args.id);
    },
    addEntriesConsumer: (state, { ref, reference }: { ref: EntriesRef; reference: ReferenceName }) => {
      const oldResource = state.current.entries.getResource(ref);
      if (oldResource) {
        state.current.entries.addReference(ref, reference, undefined);
      } else {
        const partial = new PartialEntries();
        state.current.entries.createResource(ref, reference, partial, undefined);
      }
    },
    removeEntriesConsumer: (state, { ref, reference }: { ref: EntriesRef; reference: ReferenceName }) => {
      state.current.entries.removeReference(ref, reference);
    },
    clear: state => {
      state.current = new CurrentEntries();
    },
  },
  actions: {
    onAuthRemoved: {
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

    getEntriesByIds: (context, args: { reference: ReferenceName; ref: EntriesRef; ids: RowId[] }): Promise<Entries> => {
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
          if (ref.fetchBy === "domain" && ref.referencedBy !== null) {
            void dispatch("entities/getEntity", ref.referencedBy.field.entity, { root: true });
          }
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
    getEntries: async (context, args: { reference: ReferenceName; ref: EntriesRef; search: string; limit: number }): Promise<boolean> => {
      const { state, commit, dispatch } = context;
      const { reference, ref, limit } = args;

      // Trigram indexes don't work for search strings shorter than three symbols, so we just load all entries in that case.
      const search = args.search.length >= 3 ? args.search : "";
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
          data = partial.wait(search, limit);
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

        const currNode = state.current.entries.get(ref)?.get(search);
        if (currNode?.status !== "pending" || currNode.pending !== pending.ref) {
          throw new CancelledError("Pending entries got cancelled, ref " + JSON.stringify(ref));
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
        if (ref.fetchBy === "domain" && ref.referencedBy !== null) {
          void dispatch("entities/getEntity", ref.referencedBy.field.entity, { root: true });
        }
        commit("initPartialEntries", { ref, reference });
      }
      commit("insertSearchNode", { ref, search, limit, pending: pending.ref });
      return pending.ref;
    },
  },
};

export default entriesModule;

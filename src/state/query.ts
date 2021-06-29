import { Module } from "vuex";
import { Location, Route } from "vue-router";
import { UserViewSource, SchemaName, IUserViewRef } from "ozma-api";

import { deepSyncObject, mapMaybe, deepClone } from "@/utils";
import { router } from "@/modules";
import { IUserViewArguments, IValueInfo } from "@/user_views/combined";

export interface IQuery {
  args: IUserViewArguments;
  defaultValues: Record<string, unknown>;
  search: string;
}

export interface IAttrToQueryOpts {
  homeSchema?: SchemaName;
  infoByDefault?: boolean; // Whether to create new entries by default
}

export const attrToRef = (ref: unknown, opts?: IAttrToQueryOpts): { schema: string; name: string } | null => {
  if (typeof ref !== "object" || ref === null) {
    return null;
  }
  const refObj = ref as Record<string, unknown>;
  const name = refObj["name"];
  const schema = refObj["schema"];
  if (typeof name !== "string") {
    return null;
  }
  if (schema === undefined) {
    if (opts?.homeSchema !== undefined) {
      return { schema: opts.homeSchema, name };
    } else {
      return null;
    }
  } else if (typeof schema === "string") {
    return { schema, name };
  } else {
    return null;
  }
};

export const attrToRecord = (rawArgs: unknown): Record<string, unknown> | null => {
  if (rawArgs === undefined) {
    return {};
  } else if (typeof rawArgs !== "object") {
    return null;
  } else {
    return rawArgs as Record<string, unknown> | null;
  }
};

export const attrObjectToQuery = (linkedAttr: unknown, opts?: IAttrToQueryOpts): IQuery | null => {
  if (typeof linkedAttr !== "object" || linkedAttr === null) {
    return null;
  }
  const linkedAttrObj = linkedAttr as Record<string, unknown>;
  let ref: IUserViewRef | null;
  if (typeof linkedAttrObj["ref"] === "object" && linkedAttrObj["ref"] !== null) {
    ref = attrToRef(linkedAttrObj["ref"]);
  } else {
    ref = attrToRef(linkedAttrObj);
  }
  if (ref === null) {
    return null;
  }

  let args: Record<string, unknown> | null;
  const newAttr = linkedAttrObj["new"];
  if (newAttr || (newAttr === undefined && opts?.infoByDefault)) {
    args = null;
  } else {
    args = attrToRecord(linkedAttrObj["args"]);
    if (args === null) {
      return null;
    }
  }

  let defaultValues: Record<string, unknown>;
  if (linkedAttrObj["default_values"]) {
    const def = attrToRecord(linkedAttrObj["default_values"]);
    if (def === null) {
      return null;
    }
    defaultValues = def;
  } else {
    defaultValues = {};
  }

  return {
    defaultValues,
    args: {
      source: {
        type: "named",
        ref: {
          schema: ref.schema,
          name: ref.name,
        },
      },
      args,
    },
    search: "",
  };
};

export const attrToQuery = (linkedAttr: unknown, opts?: IAttrToQueryOpts): IQuery | null => {
  if (typeof linkedAttr === "object") {
    return attrObjectToQuery(linkedAttr, opts);
  } else {
    return null;
  }
};

export const addQueryDefaultArgs = (query: IQuery, args: Record<string, unknown>) => {
  if (query.args.args !== null) {
    query.args.args = { ...args, ...query.args.args };
  }
};

// Set 'id' argument to the value id.
export const selfIdArgs = (update: IValueInfo | undefined): Record<string, unknown> => {
  return update ? { id: update.id } : {};
};

// Set 'id' argument to the id of the referenced value.
export const refIdArgs = (value: unknown): Record<string, unknown> => {
  const id = Number(value);
  return !Number.isNaN(id) ? { id } : {};
};

// Set 'id' argument to the value id.
export const attrToQuerySelf = (linkedAttr: unknown, update?: IValueInfo, opts?: IAttrToQueryOpts): IQuery | null => {
  const ret = attrToQuery(linkedAttr, opts);
  if (ret !== null) {
    addQueryDefaultArgs(ret, selfIdArgs(update));
  }
  return ret;
};

export const attrToQueryRef = (linkedAttr: unknown, value: unknown, opts?: IAttrToQueryOpts): IQuery | null => {
  const ret = attrToQuery(linkedAttr, opts);
  if (ret !== null) {
    addQueryDefaultArgs(ret, refIdArgs(value));
  }
  return ret;
};

export const queryLocation = (query: IQuery): Location => {
  if (query.args.source.type !== "named") {
    throw new Error("Unnamed user views aren't supported now");
  }

  const search: Record<string, string> = {};
  if (query.args.args !== null) {
    Object.entries(query.args.args).forEach(([name, value]) => {
      search[name] = JSON.stringify(value);
    });
  }
  Object.entries(query.defaultValues).forEach(([name, value]) => {
    search[`__def_${name}`] = JSON.stringify(value);
  });
  if (query.search !== "") {
    search["__q"] = query.search;
  }

  return {
    name: query.args.args !== null ? "view" : "view_create",
    params: query.args.source.ref as any,
    query: search,
  };
};

let windowKey = 0;
const getWindowKey = () => {
  return windowKey++;
};

export interface IGenericWindow<T> {
  key: number;
  query: T;
}

export interface IGenericCurrentQuery<T> {
  root: T;
  windows: IGenericWindow<T>[];
  selectedWindow: number | null;
}

export type ICurrentQuery = IGenericCurrentQuery<IQuery>;

interface IWindowPartialQuery {
  source?: UserViewSource;
  args: Record<string, unknown> | null;
  defaultValues: Record<string, unknown>;
  search: string;
}

const rootToCurrentQuery = (source: UserViewSource, createNew: boolean, search: Record<string, string | (string | null)[]>): ICurrentQueryHistory => {
  const args: Record<string, unknown> | null = createNew ? null : {};
  const defaultValues: Record<string, unknown> = {};
  let searchString = "";
  const windows: Record<string, IWindowPartialQuery> = {};
  let selectedWindowId: number | null = null;

  const getWindow = (id: string) => {
    let windowQuery = windows[id];
    if (windowQuery === undefined) {
      windowQuery = {
        args: {},
        defaultValues: {},
        search: "",
      };
      windows[id] = windowQuery;
    }
    return windowQuery;
  };

  Object.entries(search).forEach(([name, rawVal]) => {
    let val: string;
    if (typeof rawVal === "string") {
      val = rawVal;
    } else if (rawVal === null) {
      val = "";
    } else {
      const filtered = rawVal.filter(x => x !== null);
      if (filtered.length === 0) {
        return;
      } else {
        val = filtered[filtered.length - 1] as string;
      }
    }

    if (name === "__q") {
      searchString = val;
      return;
    }

    if (name === "__w") {
      selectedWindowId = Number(val);
      return;
    }

    const defaultMatch = /^__def_(.+)$/.exec(name);
    if (defaultMatch !== null) {
      defaultValues[defaultMatch[1]] = JSON.parse(val);
      return;
    }

    const windowMatch = /^__([0-9]+)$/.exec(name);
    if (windowMatch !== null) {
      const windowId = windowMatch[1];
      const refMatch = /^([^/]+)\/([^/]+)(\/new)?$/.exec(val);
      if (refMatch !== null) {
        const window = getWindow(windowId);
        if (refMatch[3] !== undefined) {
          window.args = null;
        }
        window.source = {
          type: "named",
          ref: {
            schema: refMatch[1],
            name: refMatch[2],
          },
        };
      }
      return;
    }

    const windowArgMatch = /^__([0-9]+)_(.+)$/.exec(name);
    if (windowArgMatch !== null) {
      const windowId = windowArgMatch[1];
      const windowName = windowArgMatch[2];
      const window = getWindow(windowId);
      let windowArgs = window.args;
      if (windowArgs === undefined) {
        windowArgs = {};
        window.args = windowArgs;
      }
      if (windowArgs !== null) {
        windowArgs[windowName] = JSON.parse(val);
      }
      return;
    }

    const windowSearchMatch = /^__q([0-9]+)$/.exec(name);
    if (windowSearchMatch !== null) {
      const windowId = windowSearchMatch[1];
      const window = getWindow(windowId);
      window.search = val;
      return;
    }

    const windowDefMatch = /^__def([0-9]+)_(.+)$/.exec(name);
    if (windowDefMatch !== null) {
      const windowId = windowDefMatch[1];
      const windowDef = windowDefMatch[2];
      const window = getWindow(windowId);
      window.defaultValues[windowDef] = JSON.parse(val);
      return;
    }

    if (args !== null && !name.includes("__")) {
      try {
        args[name] = JSON.parse(val);
      } catch {
        console.warn(`Unparsed query argument: ${name}=${val}`);
      }
    }
  });

  const root = {
    args: {
      source,
      args,
    },
    defaultValues,
    search: searchString,
    previous: null,
  };

  const rawWindowsArray = mapMaybe(([rawId, rawWindow]): [number, IQueryHistory] | undefined => {
    if (rawWindow.source === undefined) {
      return undefined;
    }

    const id = Number(rawId);
    const query = {
      args: {
        source: rawWindow.source,
        args: rawWindow.args,
      },
      defaultValues: rawWindow.defaultValues,
      search: rawWindow.search,
      previous: null,
    };
    return [id, query];
  }, Object.entries(windows));
  rawWindowsArray.sort(([id1, query1], [id2, query2]) => id1 - id2);
  let selectedWindowIndex = rawWindowsArray.length > 0 ? rawWindowsArray.length - 1 : null;
  const windowsArray = rawWindowsArray.map(([id, query], i) => {
    if (selectedWindowId === id) {
      selectedWindowIndex = i;
    }
    return { key: getWindowKey(), query };
  });
  return {
    root,
    windows: windowsArray,
    selectedWindow: selectedWindowIndex,
  };
};

export const currentQueryLocation = (query: ICurrentQuery): Location => {
  const ret = queryLocation(query.root);
  const search = ret.query as Record<string, string>;

  query.windows.forEach(({ query: windowQuery }, i) => {
    const args = windowQuery.args;
    if (args.source.type !== "named") {
      throw new Error("Anonymous views are not supported");
    }
    if (args.args !== null) {
      search[`__${i}`] = `${args.source.ref.schema}/${args.source.ref.name}`;
      Object.entries(args.args).forEach(([name, value]) => {
        search[`__${i}_${name}`] = JSON.stringify(value);
      });
    } else {
      search[`__${i}`] = args.source.ref.schema + "/" + args.source.ref.name + "/new";
    }
    Object.entries(windowQuery.defaultValues).forEach(([name, value]) => {
      search[`__def${i}_${name}`] = JSON.stringify(value);
    });
    if (windowQuery.search !== "") {
      search[`__q${i}`] = windowQuery.search;
    }
  });

  if (query.windows.length > 1) {
    search["__w"] = String(query.selectedWindow!);
  }

  return ret;
};

export interface IQueryHistory extends IQuery {
  previous: IQueryHistory | null;
}

// We first make a shallow copy with "previous" updated, and then deep clone.
// This is because sometimes `newCurrent` is actually `IQueryHistory`, and we
// don't want to clone the whole linked list.
const pushHistory = (current: IQueryHistory, newCurrent: IQuery): IQueryHistory => {
  return deepClone({ ...newCurrent, previous: current });
};

const replaceHistory = (current: IQueryHistory, newCurrent: IQuery): IQueryHistory => {
  return deepClone({ ...newCurrent, previous: current.previous });
};

const goBackHistory = (current: IQueryHistory): IQueryHistory => {
  return current.previous
    ? deepClone({ ...current.previous })
    : deepClone(current);
};

const queryWithHistory = (query: IQuery): IQueryHistory => {
  return deepClone({ ...query, previous: null });
};

export type ICurrentQueryHistory = IGenericCurrentQuery<IQueryHistory>;

export interface IQueryState {
  current: ICurrentQueryHistory | null;
  resetLocks: number; // Used to skip resetting routes when we cause a reset by ourselves.
}

const updateCurrent = (state: IQueryState, current: ICurrentQueryHistory) => {
  if (state.current === null) {
    state.current = current;
  } else {
    deepSyncObject(state.current, current);
  }
};

// While in user_view views we use this module to reduce complete page reloads.
// Route updates are parsed and existing query is granularly updated.
// We assume that $router.push/replace are never used outside of this module.
const queryModule: Module<IQueryState, {}> = {
  namespaced: true,
  state: {
    current: null,
    resetLocks: 0,
  },
  mutations: {
    resetRoute: (state, route: Route) => {
      let createNew = false;
      switch (route.name) {
        case "view":
          createNew = false;
          break;
        case "view_create":
          createNew = true;
          break;
        default:
          state.current = null;
          return;
      }

      const source: UserViewSource = {
        type: "named",
        ref: {
          schema: route.params.schema,
          name: route.params.name,
        },
      };

      const newCurrent = rootToCurrentQuery(source, createNew, route.query);
      updateCurrent(state, newCurrent);
    },
    removeResetLock: state => {
      state.resetLocks -= 1;
    },
    pushRoot: (state, query: IQuery) => {
      const newCurrent: ICurrentQueryHistory = {
        root: state.current ? pushHistory(state.current.root, query) : queryWithHistory(query),
        windows: [],
        selectedWindow: null,
      };
      updateCurrent(state, newCurrent);
      state.resetLocks += 1;
    },
    replaceRoot: (state, query: IQuery) => {
      const newCurrent: ICurrentQueryHistory = {
        root: state.current ? replaceHistory(state.current.root, query) : queryWithHistory(query),
        windows: [],
        selectedWindow: null,
      };
      updateCurrent(state, newCurrent);
      state.resetLocks += 1;
    },
    replaceRootSearch: (state, search: string) => {
      state.current!.root.search = search;
      state.resetLocks += 1;
    },
    goBackRoot: state => {
      const newCurrent: ICurrentQueryHistory = {
        root: goBackHistory(state.current!.root),
        windows: [],
        selectedWindow: null,
      };
      updateCurrent(state, newCurrent);
      state.resetLocks += 1;
    },
    goBackWindow: (state, windowIndex: number) => {
      if (state.current === null) {
        throw new Error("No current query");
      }
      const window = state.current.windows[windowIndex];
      if (!window) {
        throw new Error("Invalid window");
      }
      state.resetLocks += 1;
    },
    addWindow: (state, query: IQuery) => {
      if (state.current === null) {
        throw new Error("No current query");
      }
      state.current.windows.push({ key: getWindowKey(), query: queryWithHistory(query) });
      state.current.selectedWindow = state.current.windows.length - 1;
      state.resetLocks += 1;
    },
    closeWindow: (state, windowIndex: number) => {
      if (state.current === null) {
        throw new Error("No current query");
      }
      if (state.current.windows.splice(windowIndex, 1).length > 0) {
        if (state.current.windows.length === 0) {
          state.current.selectedWindow = null;
        } else if (state.current.selectedWindow! > windowIndex) {
          state.current.selectedWindow! -= 1;
        }
      }
      state.resetLocks += 1;
    },
    selectWindow: (state, windowIndex: number) => {
      if (state.current === null) {
        throw new Error("No current query");
      }
      const window = state.current.windows[windowIndex];
      if (!window) {
        throw new Error("Invalid window");
      }
      state.current.selectedWindow = windowIndex;
      state.resetLocks += 1;
    },
    replaceWindow: (state, { index, query }: { index: number; query: IQuery }) => {
      if (state.current === null) {
        throw new Error("No current query");
      }
      const window = state.current.windows[index];
      const newQuery = replaceHistory(window.query, query);
      deepSyncObject(window.query, newQuery);
      state.resetLocks += 1;
    },
    pushWindow: (state, { index, query }: { index: number; query: IQuery }) => {
      if (state.current === null) {
        throw new Error("No current query");
      }
      const window = state.current.windows[index];
      const newQuery = pushHistory(window.query, query);
      deepSyncObject(window.query, newQuery);
      state.resetLocks += 1;
    },
    replaceWindowSearch: (state, { index, search }: { index: number; search: string }) => {
      const window = state.current!.windows[index];
      window.query.search = search;
      state.resetLocks += 1;
    },
  },
  actions: {
    resetRoute: ({ state, commit }, route: Route) => {
      if (state.resetLocks > 0) {
        return;
      }
      commit("resetRoute", route);
    },
    pushRoot: async ({ state, commit, dispatch }, query: IQuery) => {
      await dispatch("staging/submitIfNeeded", { errorOnIncomplete: true }, { root: true });

      commit("pushRoot", query);
      try {
        await router.push(currentQueryLocation(state.current!));
      } finally {
        commit("removeResetLock");
      }
    },
    replaceRoot: async ({ state, commit, dispatch }, query: IQuery) => {
      await dispatch("staging/submitIfNeeded", { errorOnIncomplete: true }, { root: true });

      commit("replaceRoot", query);
      try {
        await router.replace(currentQueryLocation(state.current!));
      } finally {
        commit("removeResetLock");
      }
    },
    replaceRootSearch: async ({ state, commit }, search: string) => {
      if (state.current === null) {
        throw new Error("No current query");
      }
      if (state.current.root.search !== search) {
        commit("replaceRootSearch", search);
        try {
          await router.replace(currentQueryLocation(state.current));
        } finally {
          commit("removeResetLock");
        }
      }
    },
    goBackRoot: async ({ commit, dispatch }) => {
      await dispatch("staging/submitIfNeeded", { errorOnIncomplete: true }, { root: true });

      commit("goBackRoot");
      try {
        router.go(-1);
      } finally {
        commit("removeResetLock");
      }
    },
    goBackWindow: async ({ commit, dispatch }, windowIndex: number) => {
      await dispatch("staging/submitIfNeeded", { errorOnIncomplete: true }, { root: true });

      commit("goBackWindow", windowIndex);
      try {
        router.go(-1);
      } finally {
        commit("removeResetLock");
      }
    },
    addWindow: async ({ state, commit, dispatch }, query: IQuery) => {
      await dispatch("staging/submitIfNeeded", { errorOnIncomplete: true }, { root: true });

      commit("addWindow", query);
      try {
        await router.push(currentQueryLocation(state.current!));
      } finally {
        commit("removeResetLock");
      }
    },
    closeWindow: async ({ state, commit, dispatch }, windowIndex: number) => {
      await dispatch("staging/submitIfNeeded", { errorOnIncomplete: true }, { root: true });

      commit("closeWindow", windowIndex);
      try {
        await router.replace(currentQueryLocation(state.current!));
      } finally {
        commit("removeResetLock");
      }
    },
    selectWindow: async ({ state, commit }, windowIndex: number) => {
      commit("selectWindow", windowIndex);
      try {
        await router.replace(currentQueryLocation(state.current!));
      } finally {
        commit("removeResetLock");
      }
    },
    pushWindow: async ({ state, commit, dispatch }, args: { index: number; query: IQuery }) => {
      await dispatch("staging/submitIfNeeded", { errorOnIncomplete: true }, { root: true });

      commit("pushWindow", args);
      try {
        await router.push(currentQueryLocation(state.current!));
      } finally {
        commit("removeResetLock");
      }
    },
    replaceWindow: async ({ state, commit, dispatch }, args: { index: number; query: IQuery }) => {
      await dispatch("staging/submitIfNeeded", { errorOnIncomplete: true }, { root: true });

      commit("replaceWindow", args);
      try {
        await router.replace(currentQueryLocation(state.current!));
      } finally {
        commit("removeResetLock");
      }
    },
    replaceWindowSearch: async ({ state, commit }, args: { index: number; search: string }) => {
      if (state.current === null) {
        throw new Error("No current query");
      }
      const window = state.current.windows[args.index];
      if (window.query.search !== args.search) {
        commit("replaceWindowSearch", args);
        try {
          await router.replace(currentQueryLocation(state.current));
        } finally {
          commit("removeResetLock");
        }
      }
    },
  },
};

export default queryModule;

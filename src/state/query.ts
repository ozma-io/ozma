import { Module } from "vuex";
import { RawLocation, Route } from "vue-router";

import { UserViewSource, IUserViewRef, SchemaName } from "@/api";
import { deepUpdateObject, mapMaybe, deepClone } from "@/utils";
import { router } from "@/modules";
import { IUserViewArguments, IValueInfo } from "@/state/user_view";

export interface IQuery {
  args: IUserViewArguments;
  defaultValues: Record<string, any>;
  search: string;
}

export const queryLocation = (query: IQuery): RawLocation => {
  if (query.args.source.type !== "named") {
    throw new Error("Unnamed user views aren't supported now");
  }

  const search: Record<string, any> = {};
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

export interface IAttrToQueryOpts {
  homeSchema?: SchemaName;
  infoByDefault?: boolean;
  makeDefaultValues?: () => Record<string, any>;
}

export const attrToQuery = (linkedAttr: any, opts?: IAttrToQueryOpts): IQuery | null => {
  if (typeof linkedAttr === "object" && linkedAttr !== null) {
    let ref: IUserViewRef;
    if (typeof linkedAttr["ref"] === "object" && linkedAttr["ref"] !== null) {
      ref = linkedAttr["ref"];
    } else {
      ref = linkedAttr;
    }
    if (typeof ref.name !== "string") {
      return null;
    }
    if (typeof ref.schema !== "string") {
      if (opts && opts.homeSchema !== undefined) {
        ref.schema = opts.homeSchema;
      } else {
        return null;
      }
    }

    let args: Record<string, any> | null;
    if (linkedAttr["new"] || (opts && opts.infoByDefault)) {
      args = null;
    } else if (typeof linkedAttr["args"] === "object" && linkedAttr["args"] !== null) {
      args = linkedAttr["args"];
    } else {
      args = {};
    }

    let defaultValues: Record<string, any>;
    if (typeof linkedAttr["default_values"] === "object" && linkedAttr["default_values"] !== null) {
      defaultValues = linkedAttr["default_values"];
    } else if (typeof linkedAttr["defaultValues"] === "object" && linkedAttr["defaultValues"] !== null) {
      defaultValues = linkedAttr["defaultValues"];
    } else if (opts && opts.makeDefaultValues !== undefined) {
      defaultValues = opts.makeDefaultValues();
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
  } else {
    return null;
  }
};

// Set 'id' argument to the value id.
export const attrToQuerySelf = (linkedAttr: any, update?: IValueInfo, opts?: IAttrToQueryOpts): IQuery | null => {
  const ret = attrToQuery(linkedAttr, opts);
  if (ret !== null) {
    const args = ret.args.args;
    if (args !== null) {
      if (!("id" in args) && update) {
        args.id = update.id;
      }
    }
  }
  return ret;
};

// Set 'id' argument to the id of the referenced value.
export const attrToQueryRef = (linkedAttr: any, value: any, opts?: IAttrToQueryOpts): IQuery | null => {
  const ret = attrToQuery(linkedAttr, opts);
  if (ret !== null) {
    const args = ret.args.args;
    if (args !== null) {
      if (!("id" in args) && value !== null && value !== undefined) {
        const id = Number(value);
        if (!Number.isNaN(id)) {
          args.id = id;
        }
      }
    }
  }
  return ret;
};

let windowKey = 0;
const getWindowKey = () => {
  return windowKey++;
}

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
  args: Record<string, any> | null;
  defaultValues: Record<string, any>;
  search: string;
}

const rootToCurrentQuery = (source: UserViewSource, createNew: boolean, search: Record<string, string | (string | null)[]>): ICurrentQuery => {
  const args: Record<string, any> | null = createNew ? null : {};
  const defaultValues: Record<string, any> = {};
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
  }

  Object.entries(search).forEach(([name, rawVal]) => {
    let val: string;
    if (typeof rawVal === "string") {
      val = rawVal;
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
          }
        }
      }
      return;
    }

    const windowArgMatch = /^__([0-9]+)_(.+)$/.exec(name);
    if (windowArgMatch !== null) {
      const windowId = windowArgMatch[1];
      const windowName = windowArgMatch[2];
      const window = getWindow(windowId);
      let args = window.args;
      if (args === undefined) {
        args = {};
        window.args = args;
      }
      if (args !== null) {
        args[windowName] = JSON.parse(val);
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
      args[name] = JSON.parse(val);
    }
  });

  const root = {
    args: {
      source,
      args,
    },
    defaultValues,
    search: searchString,
  };

  const rawWindowsArray = mapMaybe(([rawId, rawWindow]): [number, IQuery] | undefined => {
    if (rawWindow.source === undefined) {
      return;
    }

    const id = Number(rawId);
    const query = {
      args: {
        source: rawWindow.source,
        args: rawWindow.args,
      },
      defaultValues: rawWindow.defaultValues,
      search: rawWindow.search,
    }
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
  }
}

export const currentQueryLocation = (query: ICurrentQuery): RawLocation => {
  const ret = queryLocation(query.root);
  const search: Record<string, any> = (ret as any).query;

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
      search[`__${i}`] = `${args.source.ref.schema}/${args.source.ref.name}/new`;
    }
    Object.entries(windowQuery.defaultValues).forEach(([name, value]) => {
      search[`__def${i}_${name}`] = JSON.stringify(value);
    });
    if (windowQuery.search !== "") {
      search[`__q${i}`] = windowQuery.search;
    }
  });

  if (query.windows.length > 1) {
    search["__w"] = query.selectedWindow!;
  }

  return ret;
};

export interface IQueryHistory extends IQuery {
  previous?: IQueryHistory;
}

const pushHistory = (current: IQueryHistory, newCurrent: IQuery): IQueryHistory => {
  return {...newCurrent, previous: current};
};

const replaceHistory = (current: IQueryHistory, newCurrent: IQuery): IQueryHistory => {
  return {...newCurrent, previous: current.previous};
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
    deepUpdateObject(state.current, current);
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
      if (state.resetLocks > 0) {
        return;
      }

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
        root: state.current ? pushHistory(state.current.root, query) : deepClone(query),
        windows: [],
        selectedWindow: null,
      }
      updateCurrent(state, newCurrent);
      state.resetLocks += 1;
    },
    replaceRoot: (state, query: IQuery) => {
      const newCurrent: ICurrentQueryHistory = {
        root: state.current ? replaceHistory(state.current.root, query) : deepClone(query),
        windows: [],
        selectedWindow: null,
      }
      updateCurrent(state, newCurrent);
      state.resetLocks += 1;
    },
    replaceRootSearch: (state, search: string) => {
      state.current!.root.search = search;
      state.resetLocks += 1;
    },
    addWindow: (state, query: IQuery) => {
      if (state.current === null) {
        throw new Error("No current query");
      }
      state.current.windows.push({ key: getWindowKey(), query });
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
      replaceHistory(window.query, query);
      state.resetLocks += 1;
    },
    replaceWindowSearch: (state, { index, search }: { index: number; search: string }) => {
      const window = state.current!.windows[index];
      window.query.search = search;
      state.resetLocks += 1;
    },
  },
  actions: {
    pushRoot: async ({ state, commit }, query: IQuery) => {
      commit("pushRoot", query);
      try {
        await router.push(currentQueryLocation(state.current!));
      } finally {
        commit("removeResetLock");
      }
    },
    replaceRoot: async ({ state, commit }, query: IQuery) => {
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
    addWindow: async ({ state, commit }, query: IQuery) => {
      commit("addWindow", query);
      try {
        await router.replace(currentQueryLocation(state.current!));
      } finally {
        commit("removeResetLock");
      }
    },
    closeWindow: async ({ state, commit }, windowIndex: number) => {
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
    replaceWindow: async ({ state, commit }, args: { index: number; query: IQuery }) => {
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

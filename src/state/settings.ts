import { Module } from "vuex";
import { IViewExprResult, IEntity } from "ozma-api";

import { IRef, convertString, waitTimeout } from "@/utils";
import { funappSchema, default as Api } from "@/api";
import { CancelledError } from "@/modules";
import { ThemesMap, loadThemes, getPreferredTheme, IThemeRef } from "@/utils_colors";

const errorKey = "settings";

export class CurrentSettings {
  settings: Partial<Record<string, string>>;
  themes: ThemesMap;
  userCanEditUserViews: boolean;

  constructor(
    settings: Record<string, string>,
    themes: ThemesMap,
    userCanEditUserViews: boolean,
  ) {
    this.settings = settings;
    this.themes = themes;
    this.userCanEditUserViews = userCanEditUserViews;
  }

  getEntry<T>(name: string, constructor: (_: string) => T, defValue: T): T {
    const ret = this.settings[name];
    if (ret === undefined) {
      return defValue;
    } else {
      return convertString(ret, constructor, defValue);
    }
  }
}

const emptySettings = new CurrentSettings({}, {}, false);

export interface ISettingsState {
  current: CurrentSettings;
  pending: Promise<CurrentSettings> | null;
  currentThemeRef: IThemeRef | null;
}

const settingsModule: Module<ISettingsState, {}> = {
  namespaced: true,
  state: {
    current: emptySettings,
    pending: null,
    currentThemeRef: null,
  },
  mutations: {
    setSettings: (state, settings: CurrentSettings) => {
      state.current = settings;
      state.pending = null;
    },
    setPending: (state, pending: Promise<CurrentSettings> | null) => {
      state.pending = pending;
    },
    clearSettings: state => {
      state.current = emptySettings;
      state.pending = null;
    },
    setCurrentTheme: (state, theme: IThemeRef | null) => {
      state.currentThemeRef = theme;
    },
  },
  actions: {
    removeAuth: {
      root: true,
      handler: async ({ dispatch }) => {
        await dispatch("getSettings");
      },
    },
    setAuth: {
      root: true,
      handler: async ({ dispatch }) => {
        await dispatch("getSettings");
      },
    },
    setCurrentTheme: ({ commit }, ref: IThemeRef) => {
      localStorage.setItem("preferredTheme", JSON.stringify(ref));
      commit("setCurrentTheme", ref);
    },
    setError: ({ commit }, error: string) => {
      commit("errors/setError", { key: errorKey, error }, { root: true });
      commit("setPending", null);
    },
    getSettings: ({ state, commit, dispatch }) => {
      if (state.pending !== null) {
        return state.pending;
      }
      const pending: IRef<Promise<CurrentSettings>> = {};
      pending.ref = (async () => {
        await waitTimeout(); // Delay promise so that it gets saved to `pending` first.
        try {
          const ref = {
            schema: funappSchema,
            name: "settings",
          };
          const res: IViewExprResult = await dispatch("callProtectedApi", {
            func: Api.getNamedUserView,
            args: [ref, {}],
          }, { root: true });
          if (state.pending !== pending.ref) {
            throw new CancelledError();
          }
          const values = Object.fromEntries(res.result.rows.map(row => {
            const key = row.values[0].value;
            const value = row.values[1].value;
            return [key, value];
          }));
          const themes = await loadThemes();
          const currentThemeName = getPreferredTheme(themes);

          const userViewsEntityRef = { schema: "public", name: "user_views" };
          const userViewsInfo = await dispatch("entities/getEntity", userViewsEntityRef, { root: true }) as IEntity | undefined;
          const userCanEditUserViews = userViewsInfo?.columnFields["query"]?.access.update ?? false;

          const settings = new CurrentSettings(values, themes, userCanEditUserViews);
          commit("setSettings", settings);
          commit("setCurrentTheme", currentThemeName);
          commit("errors/resetErrors", errorKey, { root: true });

          return settings;
        } catch (e) {
          if (state.pending === pending.ref) {
            void dispatch("setError", e.message);
          }
          throw e;
        }
      })();
      commit("setPending", pending.ref);
      return pending.ref;
    },
  },
};

export default settingsModule;

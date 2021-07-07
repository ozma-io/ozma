import { Module } from "vuex";
import { IViewExprResult } from "ozma-api";

import { IRef, convertString, waitTimeout } from "@/utils";
import { funappSchema, default as Api } from "@/api";
import { CancelledError } from "@/modules";
import { loadColorVariants, loadThemes, NamedColorVariant, getPreferredTheme, Theme } from "@/utils_colors";

const errorKey = "settings";

export class CurrentSettings {
  settings: Partial<Record<string, string>>;
  themes: Theme[];
  colorVariants: NamedColorVariant[];

  constructor(
    settings: Record<string, string>,
    themes: Theme[] = [],
    colorVariants: NamedColorVariant[] = [],
  ) {
    this.settings = settings;
    this.themes = themes;
    this.colorVariants = colorVariants;
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

export interface ISettingsState {
  current: CurrentSettings;
  pending: Promise<CurrentSettings> | null;
  currentTheme: Theme;
}

const settingsModule: Module<ISettingsState, {}> = {
  namespaced: true,
  state: {
    current: new CurrentSettings({}),
    pending: null,
    currentTheme: { name: "light", localized: null },
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
      state.current = new CurrentSettings({});
      state.pending = null;
    },
    setTheme: (state, theme: Theme) => {
      state.currentTheme = theme;
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
    setTheme: ({ commit }, theme: Theme) => {
      localStorage.setItem("preferredTheme", theme.name);
      commit("setTheme", theme);
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
          const colorVariants = await loadColorVariants();
          const currentTheme = getPreferredTheme(themes);
          const settings = new CurrentSettings(values, themes, colorVariants);
          commit("setSettings", settings);
          commit("setTheme", currentTheme);
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

import { Module } from "vuex";
import { IViewExprResult } from "ozma-api";

import { IRef, convertString, waitTimeout } from "@/utils";
import { funappSchema, default as Api } from "@/api";
import { CancelledError } from "@/modules";
import { ThemesMap, loadThemes, getPreferredTheme, IThemeRef } from "@/utils_colors";

const errorKey = "settings";

export interface ICommunicationLinks {
  email: string | null;
  whatsapp: string | null;
  telegram: string | null;
}

const getCommunicationButtons = (settings: CurrentSettings): ICommunicationLinks => {
  const emailLink = settings.getEntry("instance_help_email", String, "sales@ozma.io");
  const whatsappLink = settings.getEntry("instance_help_whatsapp", String, "https://api.whatsapp.com/send?phone=74953748820");
  const telegramLink = settings.getEntry("instance_help_telegram", String, "https://t.me/kirmark");

  return {
    email: emailLink === "" ? null : emailLink,
    whatsapp: whatsappLink === "" ? null : whatsappLink,
    telegram: telegramLink === "" ? null : telegramLink,
  };
};

export class CurrentSettings {
  settings: Record<string, string>;
  communicationLinks: ICommunicationLinks;
  themes: ThemesMap;

  constructor(
    settings: Record<string, string>,
    themes: ThemesMap,
  ) {
    this.settings = settings;
    this.themes = themes;
    this.communicationLinks = getCommunicationButtons(this);
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

export type DisplayMode = "development" | "business";
const emptySettings = new CurrentSettings({}, {});

export interface ISettingsState {
  current: CurrentSettings;
  pending: Promise<CurrentSettings> | null;
  currentThemeRef: IThemeRef | null;
  userIsRoot: boolean;
  displayMode: DisplayMode;
}

const settingsModule: Module<ISettingsState, {}> = {
  namespaced: true,
  state: {
    current: emptySettings,
    pending: null,
    currentThemeRef: null,
    userIsRoot: false,
    displayMode: "business",
  },
  getters: {
    developmentModeEnabled: state => state.displayMode === "development",

    businessModeEnabled: state => state.displayMode === "business",
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
    setUserIsRoot: (state, isRoot: boolean) => {
      state.userIsRoot = isRoot;
    },
    setDisplayMode: (state, mode: DisplayMode) => {
      state.displayMode = mode;
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
    setUserIsRoot: ({ commit }, isRoot: boolean) => {
      commit("setUserIsRoot", isRoot);
    },
    setDisplayMode: ({ commit }, mode: DisplayMode) => {
      localStorage.setItem("display-mode", mode);
      commit("setDisplayMode", mode);
    },
    setError: ({ commit }, error: string) => {
      commit("errors/setError", { key: errorKey, error }, { root: true });
      commit("setPending", null);
    },
    getSettings: ({ state, commit, dispatch, rootState }) => {
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
            const key = String(row.values[0].value);
            const value = String(row.values[1].value);
            return [key, value];
          }));
          const themes = await loadThemes();
          const currentThemeName = getPreferredTheme(themes);

          const settings = new CurrentSettings(values, themes);
          commit("setSettings", settings);

          if (settings.getEntry("allow_business_mode", Boolean, false)) {
            const currentUserEmail = (rootState as any).auth.current.email;
            const usersEntityRef = {
              schema: funappSchema,
              name: "table-public-users",
            };
            const usersTable: IViewExprResult = await dispatch("callProtectedApi", {
              func: Api.getNamedUserView,
              args: [usersEntityRef, {}],
            }, { root: true });
            const emailColumnIndex = usersTable.info.columns.findIndex(column => column.name === "name");
            const isRootColumnIndex = usersTable.info.columns.findIndex(column => column.name === "is_root");
            const currentUserRow = usersTable.result.rows.find(row => row.values[emailColumnIndex].value === currentUserEmail);
            const currentUserIsRoot = Boolean(currentUserRow?.values[isRootColumnIndex].value);
            const savedDisplayMode = localStorage.getItem("display-mode");

            await dispatch("setUserIsRoot", currentUserIsRoot);
            await dispatch("setDisplayMode", savedDisplayMode ?? "business");
          } else {
            await dispatch("setDisplayMode", "development");
          }

          commit("setCurrentTheme", currentThemeName);
          commit("errors/resetErrors", errorKey, { root: true });

          return settings;
        } catch (e) {
          if (state.pending === pending.ref) {
            void dispatch("setError", String(e));
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

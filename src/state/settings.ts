import { Module } from "vuex";
import { FunDBError, IEntityRef, IPermissionsInfo, ITransaction, IViewExprResult, RowKey } from "ozma-api";

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
  userId: number | null;
  currentThemeRef: IThemeRef | null;
  userIsRoot: boolean;
  displayMode: DisplayMode;
}

const settingsModule: Module<ISettingsState, {}> = {
  namespaced: true,
  state: {
    current: emptySettings,
    pending: null,
    userId: null,
    currentThemeRef: null,
    userIsRoot: false,
    displayMode: "business",
  },
  getters: {
    developmentModeEnabled: state => state.displayMode === "development",
    businessModeEnabled: state => state.displayMode === "business",
    language: state => {
      const browserLocale = navigator.languages[0].split("-")[0];
      return state.current.getEntry("language", String, browserLocale);
    },
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
    setUserId: (state, userId: number | null) => {
      state.userId = userId;
    },
  },
  actions: {
    onAuthRemoved: {
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
    writeUserSettings: async ({ state, dispatch, commit }, { name, value }: { name: string; value: string }) => {
      const values = { ...state.current.settings, [name]: value };
      const settings = new CurrentSettings(values, state.current.themes);
      commit("setSettings", settings);

      if (state.userId === null) return; // We can't write settings to the serever if user isn't signed in.

      const entity: IEntityRef = { schema: funappSchema, name: "user_settings" };
      const id: RowKey = { alt: "name", keys: { "user_id": state.userId, name } };

      const updateTransaction: ITransaction = {
        operations: [{
          type: "update",
          entity,
          id,
          entries: { "user_id": state.userId, name, value },
        }],
      };
      const insertTransaction: ITransaction = {
        operations: [{
          type: "insert",
          entity,
          entries: { "user_id": state.userId, name, value },
        }],
      };

      try {
        await dispatch("callProtectedApi", {
          func: Api.runTransaction,
          args: [updateTransaction],
        }, { root: true });
      } catch (e) { // If we can't update entry because it doesn't exist, we insert it.
        if (!(e instanceof FunDBError) || e.body.error !== "transaction" || (e.body as any)?.details.error !== "notFound") throw e;

        await dispatch("callProtectedApi", {
          func: Api.runTransaction,
          args: [insertTransaction],
        }, { root: true });
      }
    },
    getSettings: ({ state, commit, dispatch }) => {
      if (state.pending !== null) {
        return state.pending;
      }
      const pending: IRef<Promise<CurrentSettings>> = {};
      pending.ref = (async () => {
        await waitTimeout(); // Delay promise so that it gets saved to `pending` first.
        try {
          const promises =
            ["settings", "my_user_id"]
              .map(name =>
                dispatch("callProtectedApi", {
                  func: Api.getNamedUserView,
                  args: [{ schema: funappSchema, name }, {}],
                }, { root: true }));
          const [settingsRes, userIdRes] = await Promise.all(promises) as [IViewExprResult, IViewExprResult];

          const userId = userIdRes.result.rows[0]?.values[0]?.value ?? null;
          commit("setUserId", userId);

          if (state.pending !== pending.ref) {
            throw new CancelledError();
          }
          const values = Object.fromEntries(settingsRes.result.rows.map(row => {
            const key = String(row.values[0].value);
            const value = String(row.values[1].value);
            return [key, value];
          }));
          const themes = await loadThemes();
          const currentThemeName = getPreferredTheme(themes, values["themes_schema"]);

          const settings = new CurrentSettings(values, themes);
          commit("setSettings", settings);

          if (settings.getEntry("allow_business_mode", Boolean, false)) {
            const userPermissions: IPermissionsInfo = await dispatch("callProtectedApi", {
              func: Api.getPermissions,
            }, { root: true });
            const savedDisplayMode = localStorage.getItem("display-mode");

            await dispatch("setUserIsRoot", userPermissions.isRoot);
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

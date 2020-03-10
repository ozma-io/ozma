import { Module } from "vuex";

import { IRef, convertString } from "@/utils";
import * as Api from "@/api";

const errorKey = "settings";

export class CurrentSettings {
    settings: Record<string, string>;

    constructor(settings: Record<string, string>) {
        this.settings = settings;
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
}

const settingsModule: Module<ISettingsState, {}> = {
    namespaced: true,
    state: {
        current: new CurrentSettings({}),
        pending: null,
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
    },
    actions: {
        removeAuth: {
            root: true,
            handler: ({ commit }) => {
                commit("clearSettings");
            },
        },
        setAuth: {
            root: true,
            handler: ({ dispatch }) => {
                dispatch("getSettings");
            },
        },
        setError: ({ commit }, error: string) => {
            commit("errors/setError", { key: errorKey, error }, { root: true });
            commit("setPending", null);
        },
        getSettings: ({ state, commit, dispatch }) => {
            const pending: IRef<Promise<CurrentSettings>> = {};
            pending.ref = (async () => {
                try {
                    const ref = {
                        schema: Api.funappSchema,
                        name: "settings",
                    };
                    const res: Api.IViewExprResult = await dispatch("callProtectedApi", {
                        func: Api.fetchNamedView,
                        args: [ref, {}],
                    }, { root: true });
                    if (state.pending !== pending.ref) {
                        throw new Error("Pending operation cancelled");
                    }
                    const values = Object.fromEntries(res.result.rows.map(row => [row.values[0].value, row.values[1].value]));
                    const settings = new CurrentSettings(values);
                    commit("setSettings", settings);
                    commit("errors/resetErrors", errorKey, { root: true });
                    return settings;
                } catch (e) {
                    if (state.pending === pending.ref) {
                        dispatch("setError", e.message);
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

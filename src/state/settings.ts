import { Module } from "vuex"

import { IRef, convertString } from "@/utils"
import * as Api from "@/api"

export class CurrentSettings {
    settings: Record<string, string>

    constructor(settings: Record<string, string>) {
        this.settings = settings
    }

    getEntry<T>(name: string, constructor: (_: string) => T, defValue: T): T {
        const ret = this.settings[name]
        if (ret === undefined) {
            return defValue
        } else {
            return convertString(ret, constructor, defValue)
        }
    }
}

export interface ISettingsState {
    current: CurrentSettings
    pending: Promise<CurrentSettings> | null
    lastError: string | null
}

const settingsModule: Module<ISettingsState, {}> = {
    namespaced: true,
    state: {
        current: new CurrentSettings({}),
        pending: null,
        lastError: null,
    },
    mutations: {
        setError: (state, lastError: string) => {
            state.lastError = lastError
            state.pending = null
        },
        clearError: state => {
            state.lastError = null
        },
        setSettings: (state, settings: CurrentSettings) => {
            state.current = settings
            state.lastError = null
            state.pending = null
        },
        setPending: (state, pending: Promise<CurrentSettings>) => {
            state.pending = pending
        },
        clearSettings: state => {
            state.current = new CurrentSettings({})
            state.pending = null
        },
    },
    actions: {
        removeAuth: {
            root: true,
            handler: ({ commit }) => {
                commit("clearSettings")
            },
        },
        setAuth: {
            root: true,
            handler: ({ dispatch }) => {
                dispatch("getSettings")
            },
        },
        getSettings: ({ state, commit, dispatch }) => {
            const pending: IRef<Promise<CurrentSettings>> = {}
            pending.ref = (async () => {
                try {
                    const ref = {
                        schema: Api.funappSchema,
                        name: "Settings",
                    }
                    const res: Api.IViewExprResult = await dispatch("callProtectedApi", {
                        func: Api.fetchNamedView,
                        args: [ref, {}],
                    }, { root: true })
                    if (state.pending !== pending.ref) {
                        throw Error("Pending operation cancelled")
                    }
                    const values = Object.fromEntries(res.result.rows.map(row => [row.values[0].value, row.values[1].value]))
                    const settings = new CurrentSettings(values)
                    commit("setSettings", settings)
                    return settings
                } catch (e) {
                    if (state.pending === pending.ref) {
                        commit("setError", e.message)
                    }
                    throw e
                }
            })()
            commit("setPending", pending.ref)
            return pending.ref
        },
    },
}

export default settingsModule

import { Module } from "vuex"

import { IRef } from "@/utils"
import seq from "@/sequences"
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
            if (constructor === Number as any) {
                const conv = Number(ret)
                if (Number.isNaN(conv)) {
                    return defValue
                } else {
                    return conv as any
                }
            } else if (constructor === String as any) {
                return ret as any
            } else {
                const conv = constructor(ret)
                if (conv instanceof constructor) {
                    return conv
                } else {
                    return defValue
                }
            }
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
                    const res: Api.IViewExprResult = await dispatch("callProtectedApi", {
                        func: Api.fetchNamedView,
                        args: ["__Settings", new URLSearchParams()],
                    }, { root: true })
                    if (state.pending !== pending.ref) {
                        throw Error("Pending operation cancelled")
                    }
                    const values = seq(res.result.rows).map<[string, string]>(row => [row.values[0].value, row.values[1].value]).toObject()
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

import { Module } from "vuex"

import { IRef } from "@/utils"
import * as Api from "@/api"

export class CurrentSettings {
    settings: Record<string, string>

    constructor(settings: Record<string, string>) {
        this.settings = settings
    }
}

export interface ISettingsState {
    current: CurrentSettings | null
    pending: Promise<CurrentSettings> | null
    lastError: string | null
}

const settingsModule: Module<ISettingsState, {}> = {
    namespaced: true,
    state: {
        current: null,
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
            state.current = null
            state.pending = null
        },
    },
    getters: {
        entry: state => (name: string, defValue: string): string => {
            if (state.current === null) {
                return defValue
            } else {
                const ret = state.current.settings[name]
                return (ret === undefined) ? defValue : ret
            }
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
                    const values = res.result.rows.reduce((currSettings: Record<string, string>, row) => {
                        const key = row.values[0].value
                        const value = row.values[1].value
                        currSettings[key] = value
                        return currSettings
                    }, {})
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
            return pending
        },
    },
}

export default settingsModule

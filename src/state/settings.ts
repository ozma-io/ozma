import { Module } from "vuex"

import * as Api from "@/api"

export class CurrentSettings {
    settings: Record<string, string>

    constructor(settings: Record<string, string>) {
        this.settings = settings
    }
}

export interface ISettingsState {
    current: CurrentSettings | null
    lastError: string | null
}

const settingsModule: Module<ISettingsState, {}> = {
    namespaced: true,
    state: {
        current: null,
        lastError: null,
    },
    mutations: {
        setError: (state, lastError: string) => {
            state.lastError = lastError
        },
        clearError: state => {
            state.lastError = null
        },
        setSettings: (state, settings: CurrentSettings) => {
            state.current = settings
            state.lastError = null
        },
        clearSettings: state => {
            state.current = null
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
        getSettings: async ({ commit, dispatch }) => {
            try {
                const select = "SELECT \"Name\", \"Value\" FROM funapp.\"Settings\""
                const res: Api.IViewExprResult = await dispatch("callProtectedApi", {
                    func: Api.fetchAnonymousView,
                    args: [select, new URLSearchParams()],
                }, { root: true })
                const values = res.result.rows.reduce((currSettings: Record<string, string>, row) => {
                    const key = row.values[0].value
                    const value = row.values[1].value
                    currSettings[key] = value
                    return currSettings
                }, {})
                const settings = new CurrentSettings(values)
                commit("setSettings", settings)
            } catch (e) {
                commit("setError", e.message)
                throw e
            }
        },
    },
}

export default settingsModule

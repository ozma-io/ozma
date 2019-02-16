import { Module } from "vuex"

import * as Api from "@/api"

export class CurrentTranslations {
    columns: Record<string, string>

    constructor(columns: Record<string, string>) {
        this.columns = columns
    }
}

export interface ITranslationsState {
    current: CurrentTranslations | null
    pending: Promise<CurrentTranslations> | null
    lastError: string | null
}

const translationsModule: Module<ITranslationsState, {}> = {
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
        setTranslations: (state, translations: CurrentTranslations) => {
            state.current = translations
            state.lastError = null
            state.pending = null
        },
        setPending: (state, pending: Promise<CurrentTranslations> | null) => {
            state.pending = pending
        },
        clearTranslations: state => {
            state.current = null
        },
    },
    getters: {
        field: state => (schema: string, entity: string, field: string, defValue: string): string => {
            if (state.current === null) {
                return defValue
            } else {
                const translation = state.current.columns[`${schema}__${entity}__${field}`]
                return translation === undefined ? defValue : translation
            }
        },
    },
    actions: {
        removeAuth: {
            root: true,
            handler: ({ commit }) => {
                commit("clearTranslations")
            },
        },
        setAuth: {
            root: true,
            handler: ({ dispatch }) => {
                dispatch("getTranslations")
            },
        },
        getTranslations: ({ state, commit, dispatch }) => {
            if (state.pending !== null) {
                return state.pending
            }
            commit("setPending", (async () => {
                try {
                    const res: Api.IViewExprResult = await dispatch("callProtectedApi", {
                        func: Api.fetchNamedView,
                        args: ["__FieldTranslations", new URLSearchParams()],
                    }, { root: true })
                    if (state.pending === null) {
                        throw Error("Pending operation cancelled")
                    }
                    const values = res.result.rows.reduce((currTranslations: Record<string, string>, row) => {
                        const schema = row.values[0].value
                        const entity = row.values[1].value
                        const field = row.values[2].value
                        const translation = row.values[3].value
                        currTranslations[`${schema}__${entity}__${field}`] = translation
                        return currTranslations
                    }, {})
                    const translations = new CurrentTranslations(values)
                    commit("setTranslations", translations)
                } catch (e) {
                    commit("setError", e.message)
                    throw e
                }
            })())
        },
    },
}

export default translationsModule

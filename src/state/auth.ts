import { Module } from "vuex"
import * as Api from "@/api"
import * as Utils from "@/utils"

const renewInterval = 120000

export class CurrentAuth {
    token: string
    header: Api.IAuthToken

    constructor(token: string) {
        this.token = token
        this.header = Api.parseToken(token)
    }
}

export interface IAuthState {
    current: CurrentAuth | null
    lastError: string | null
    renewIntervalId: number | null
}

const clearAuth = (store: IAuthState) => {
    if (store.renewIntervalId !== null) {
        clearInterval(store.renewIntervalId)
        store.renewIntervalId = null
    }
    store.current = null
}

export const authModule: Module<IAuthState, {}> = {
    namespaced: true,
    state: {
        current: null,
        lastError: null,
        renewIntervalId: null,
    },
    mutations: {
        setError: (state, lastError: string) => {
            state.lastError = lastError
        },
        clearError: state => {
            state.lastError = null
        },
        setAuth: (state, { auth, renewFunc }: { auth: CurrentAuth, renewFunc: () => void }) => {
            clearAuth(state)
            state.current = auth
            state.renewIntervalId = setInterval(renewFunc, renewInterval)
        },
        clearAuth,
    },
    actions: {
        removeAuth: {
            root: true,
            handler: ({ commit }, lastError?: string) => {
                commit("clearAuth")
                if (lastError !== undefined) {
                    commit("setError", lastError)
                }
            },
        },
        setAuth: ({ dispatch, commit }, auth: CurrentAuth) => {
            commit("setAuth", {
                auth,
                renewFunc: () => {
                    dispatch("renewAuth")
                },
            })
        },
        requestAuth: async ({ commit, dispatch }, { username, password }: { username: string, password: string }) => {
            try {
                const token = await Api.requestAuth(username, password)
                const auth = new CurrentAuth(token)
                dispatch("setAuth", auth)
            } catch (e) {
                commit("clearAuth", e.message)
                throw e
            }
        },
        callProtectedApi: {
            root: true,
            handler: async ({ state, commit }, { func, args }: { func: ((_1: string, ..._2: any[]) => Promise<any>), args?: any[] }): Promise<any> => {
                if (state.current === null) {
                    throw new Error("No authentication token to renew")
                }

                try {
                    const argsArray = args === undefined ? [] : args
                    return await func(state.current.token, ...argsArray)
                } catch (e) {
                    if (e instanceof Utils.FetchError) {
                        if (e.response.status === 401) {
                            commit("clearAuth", e.message)
                        }
                    }
                    throw e
                }
            },
        },
        renewAuth: async ({ dispatch }): Promise<void> => {
            const token: string = await dispatch("callProtectedApi", { func: Api.renewAuth }, { root: true })
            const auth = new CurrentAuth(token)
            dispatch("setAuth", auth)
        },
    },
}

export default authModule

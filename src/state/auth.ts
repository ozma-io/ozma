import { Module, ActionContext } from "vuex"
import * as Api from "@/api"
import * as Utils from "@/utils"
import * as Modules from "@/modules"

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

const authTokenKey = "authToken"

const setCurrentAuth = (context: ActionContext<IAuthState, {}>, auth: CurrentAuth) => {
    const { state, dispatch, commit } = context
    const hadAuth = state.current
    if (!hadAuth) {
        const renewIntervalId = setInterval(() => {
            dispatch("renewAuth")
        }, renewInterval)
        commit("setAuthHandler", renewIntervalId)
    }

    commit("setAuth", auth)
    if (localStorage.getItem(authTokenKey) !== auth.token) {
        localStorage.setItem(authTokenKey, auth.token)
    }

    if (!hadAuth) {
        dispatch("setAuth", undefined, { root: true })
    }
}

const callProtectedApi = async ({ state, dispatch }: ActionContext<IAuthState, {}>, { func, args }: { func: ((_1: string, ..._2: any[]) => Promise<any>), args?: any[] }): Promise<any> => {
    if (state.current === null) {
        throw new Error("No authentication token to renew")
    }

    try {
        const argsArray = args === undefined ? [] : args
        return await func(state.current.token, ...argsArray)
    } catch (e) {
        if (e instanceof Utils.FetchError) {
            if (e.response.status === 401) {
                dispatch("removeAuth", e.message, { root: true })
            }
        }
        throw e
    }
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
        setAuth: (state, auth: CurrentAuth) => {
            state.current = auth
        },
        setAuthHandler: (state, renewIntervalId: number) => {
            state.renewIntervalId = renewIntervalId
        },
        clearAuth: state => {
            state.current = null
            state.renewIntervalId = null
        },
    },
    actions: {
        removeAuth: {
            root: true,
            handler: ({ state, commit }, lastError?: string) => {
                if (state.current !== null) {
                    clearInterval(state.renewIntervalId as number)

                    commit("clearAuth")

                    if (localStorage.getItem(authTokenKey) !== null) {
                        localStorage.removeItem(authTokenKey)
                    }
                    if (lastError !== undefined) {
                        commit("setError", lastError)
                    }
                    Modules.router.push({
                        name: "login",
                        query: { redirect: Modules.router.currentRoute.fullPath },
                    })
                }

            },
        },
        setAuth: {
            root: true,
            handler: () => {
                return
            },
        },
        startAuth: context => {
            const { state, dispatch } = context
            const oldStoredKey = localStorage.getItem(authTokenKey)
            if (oldStoredKey !== null) {
                setCurrentAuth(context, new CurrentAuth(oldStoredKey))
                dispatch("renewAuth")
            }

            const authStorageHandler = (e: StorageEvent) => {
                if (e.key === authTokenKey) {
                    const storedKey = localStorage.getItem(authTokenKey)

                    if (storedKey !== null && (state.current === null || state.current.token !== storedKey)) {
                        setCurrentAuth(context, new CurrentAuth(storedKey))
                    } else if (storedKey === null) {
                        dispatch("removeAuth", undefined, { root: true })
                    }
                }
            }
            window.addEventListener("storage", authStorageHandler)
        },
        requestAuth: async (context, { username, password }: { username: string, password: string }) => {
            const { dispatch } = context
            try {
                const token = await Api.requestAuth(username, password)
                const auth = new CurrentAuth(token)
                setCurrentAuth(context, auth)
            } catch (e) {
                dispatch("removeAuth", e.message, { root: true })
                throw e
            }
        },
        callProtectedApi: {
            root: true,
            handler: async ({ state, dispatch }, { func, args }: { func: ((_1: string, ..._2: any[]) => Promise<any>), args?: any[] }): Promise<any> => {
                if (state.current === null) {
                    throw new Error("No authentication token to renew")
                }

                try {
                    const argsArray = args === undefined ? [] : args
                    return await func(state.current.token, ...argsArray)
                } catch (e) {
                    if (e instanceof Utils.FetchError) {
                        if (e.response.status === 401) {
                            dispatch("removeAuth", e.message, { root: true })
                        }
                    }
                    throw e
                }
            },
        },
        renewAuth: async (context): Promise<void> => {
            const token: string = await callProtectedApi(context, { func: Api.renewAuth })
            const auth = new CurrentAuth(token)
            setCurrentAuth(context, auth)
        },
    },
}

export default authModule

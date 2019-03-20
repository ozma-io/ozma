import { Module, ActionContext } from "vuex"
import uuidv4 from "uuid/v4"
import jwtDecode from "jwt-decode"

import { IRef } from "@/utils"
import * as Api from "@/api"
import * as Utils from "@/utils"
import { router } from "@/modules"

export class CurrentAuth {
    createdTime: number
    token: string
    refreshToken: string
    idToken: string
    decodedToken: any
    decodedRefreshToken: any
    decodedIdToken: any

    constructor(token: string, refreshToken: string, idToken: string, createdTime?: number) {
        this.createdTime = (createdTime !== undefined) ? createdTime : Utils.sse()
        this.token = token
        this.refreshToken = refreshToken
        this.idToken = idToken
        this.decodedToken = jwtDecode(this.token)
        this.decodedRefreshToken = jwtDecode(this.refreshToken)
        this.decodedIdToken = jwtDecode(this.idToken)
    }

    get username() {
        return this.decodedIdToken.preferred_username
    }

    get refreshValidFor(): number {
        return this.decodedToken.exp - this.decodedToken.iat
    }

    get validFor(): number {
        return this.decodedRefreshToken.exp - this.decodedRefreshToken.iat
    }
}

export interface IAuthState {
    current: CurrentAuth | null
    lastError: string | null
    renewalIntervalId: number | null
    pending: Promise<CurrentAuth> | null
    secret: string
}

interface IOIDCState {
    path: string
    secret: string
}

const initialSecret = () => {
    const stored = localStorage.getItem("authStateSecret")
    if (stored === null) {
        return uuidv4()
    } else {
        return stored
    }
}

const redirectUri = () => {
    const returnPath = router.resolve({ name: "auth_response" }).href
    return `${window.location.protocol}//${window.location.host}${returnPath}`
}

interface IAuthPersistedState {
    token: string
    refreshToken: string
    idToken: string
    createdTime: number
}

const persistCurrentAuth = (auth: CurrentAuth) => {
    const dump: IAuthPersistedState = {
        token: auth.token,
        refreshToken: auth.refreshToken,
        idToken: auth.idToken,
        createdTime: auth.createdTime,
    }
    localStorage.setItem("auth", JSON.stringify(dump))
}

const dropCurrentAuth = () => {
    localStorage.removeItem("auth")
}

const loadCurrentAuth = () => {
    const dumpStr = localStorage.getItem("auth")

    if (dumpStr !== null) {
        const dump = JSON.parse(dumpStr)
        const auth = new CurrentAuth(dump.token, dump.refreshToken, dump.idToken, dump.createdTime)
        const timestamp = Utils.sse()
        if (auth.createdTime + auth.refreshValidFor > timestamp) {
            return auth
        } else {
            return null
        }
    } else {
        return null
    }
}

const getToken = (context: ActionContext<IAuthState, {}>, params: Record<string, string>) => {
    const { state, commit, dispatch } = context
    const pending: IRef<Promise<CurrentAuth>> = {}
    pending.ref = (async () => {
        try {
            const headers: Record<string, string> = {
                "Content-Type": "application/x-www-form-urlencoded",
            }

            if (Api.authClientSecret === undefined) {
                params.client_id = Api.authClientId
            } else {
                const basicAuth = `${Api.authClientId}:${Api.authClientSecret}`
                headers.Authorization = `Basic ${btoa(basicAuth)}`
            }
            const paramsString = new URLSearchParams(params).toString()

            const ret = await Utils.fetchJson(`${Api.authUrl}/token`, {
                method: "POST",
                headers,
                body: paramsString,
            })
            if (state.pending !== pending.ref) {
                throw Error("Pending operation cancelled")
            }
            const auth = new CurrentAuth(ret.access_token, ret.refresh_token, ret.id_token)
            updateAuth(context, auth)
            startRenewalInterval(context)
            return auth
        } catch (e) {
            if (state.pending === pending.ref) {
                commit("setError", e.message)
            }
            throw e
        }
    })()
    commit("setPending", pending.ref)
    return pending.ref
}

const updateAuth = ({ state, commit, dispatch }: ActionContext<IAuthState, {}>, auth: CurrentAuth) => {
    const oldAuth = state.current
    commit("setAuth", auth)
    persistCurrentAuth(auth)
    if (oldAuth === null) {
        dispatch("setAuth", undefined, { root: true })
    }
}

const startRenewalInterval = ({ state, commit, dispatch }: ActionContext<IAuthState, {}>) => {
    if (state.renewalIntervalId !== null) {
        clearInterval(state.renewalIntervalId)
    }
    if (state.current === null) {
        throw new Error("Cannot start renewal interval with no tokens")
    }

    const constantFactor = 0.6
    const validFor = state.current.validFor
    // Random timeouts for different tabs not to overload the server.
    const timeout = (validFor * constantFactor + Math.random() * validFor * (1 - 1.1 * constantFactor)) * 1000

    const renewIntervalId = setInterval(() => {
        dispatch("renewAuth")
    }, timeout)
    commit("setAuthHandler", renewIntervalId)
}

export const authModule: Module<IAuthState, {}> = {
    namespaced: true,
    state: {
        current: null,
        pending: null,
        lastError: null,
        renewalIntervalId: null,
        secret: initialSecret(),
    },
    mutations: {
        setError: (state, lastError: string) => {
            state.lastError = lastError
            state.pending = null
        },
        clearError: state => {
            state.lastError = null
        },
        setAuth: (state, auth: CurrentAuth) => {
            state.current = auth
            state.lastError = null
            state.pending = null
        },
        setAuthHandler: (state, renewIntervalId: number) => {
            state.renewalIntervalId = renewIntervalId
        },
        clearAuth: state => {
            state.current = null
            state.renewalIntervalId = null
            state.pending = null
        },
        setPending: (state, pending: Promise<CurrentAuth>) => {
            state.pending = pending
        },
    },
    actions: {
        removeAuth: {
            root: true,
            handler: ({ state, commit, dispatch }, lastError?: string) => {
                if (state.renewalIntervalId !== null) {
                    clearInterval(state.renewalIntervalId)
                }
                if (state.current !== null) {
                    commit("clearAuth")
                    dropCurrentAuth()
                }
            },
        },
        setAuth: {
            root: true,
            handler: () => { return },
        },
        startAuth: context => {
            const { state, commit, dispatch } = context

            if (router.currentRoute.name === "auth_response") {
                dropCurrentAuth()

                const urlParams = new URLSearchParams(window.location.search)
                const stateString = urlParams.get("state")
                const code = urlParams.get("code")
                if (stateString !== null && code !== null) {
                    const savedState = JSON.parse(atob(stateString))
                    const params: Record<string, string> = {
                        grant_type: "authorization_code",
                        code,
                        redirect_uri: redirectUri(),
                    }
                    getToken(context, params)
                    router.push(savedState.path)
                } else {
                    const error = urlParams.get("error")
                    const errorDescription = urlParams.get("errorDescription")
                    commit(`setError", "Invalid auth response query parameters, error ${error} ${errorDescription}`)
                }
            } else {
                const oldAuth = loadCurrentAuth()
                if (oldAuth !== null) {
                    updateAuth(context, oldAuth)
                    dispatch("renewAuth")
                }
            }

            const authStorageHandler = (e: StorageEvent) => {
                if (e.key === "auth") {
                    if (e.newValue === null) {
                        dispatch("removeAuth", undefined, { root: true })
                    } else {
                        const newAuth = loadCurrentAuth()
                        if (newAuth !== null && (state.current === null || newAuth.token !== state.current.token)) {
                            updateAuth(context, newAuth)
                            startRenewalInterval(context)
                        }
                    }
                }
            }
            window.addEventListener("storage", authStorageHandler)

            if (state.current === null && state.pending === null) {
                return dispatch("requestLogin")
            } else if (state.pending !== null) {
                return state.pending
            }
        },
        requestLogin: ({ state, commit }) => {
            const redirectParams = new URLSearchParams({ url: window.location.href })
            const savedState: IOIDCState = {
                secret: state.secret,
                path: router.currentRoute.fullPath,
            }
            const params = {
                client_id: Api.authClientId,
                redirect_uri: redirectUri(),
                state: btoa(JSON.stringify(savedState)),
                scope: "openid",
                response_mode: "query",
                response_type: "code",
                prompt: "login",
            }
            const paramsString = new URLSearchParams(params).toString()

            window.location.href = `${Api.authUrl}/auth?${paramsString}`
            const waitForLoad = new Promise((resolve, reject) => {
                addEventListener("load", () => {
                    reject()
                })
            })
            commit("setPending", waitForLoad)
            return waitForLoad
        },
        callProtectedApi: {
            root: true,
            handler: async ({ state, commit, dispatch }, { func, args }: { func: ((_1: string, ..._2: any[]) => Promise<any>), args?: any[] }): Promise<any> => {
                if (state.current === null) {
                    if (state.pending !== null) {
                        await state.pending
                    }
                    if (state.current === null) {
                        throw new Error("No authentication token")
                    }
                }

                try {
                    const argsArray = args === undefined ? [] : args
                    return await func(state.current.token, ...argsArray)
                } catch (e) {
                    if (e instanceof Utils.FetchError) {
                        if (e.response.status === 401) {
                            dispatch("removeAuth", undefined, { root: true })
                            commit("setError", e.message)
                        }
                    }
                    throw e
                }
            },
        },
        renewAuth: async context => {
            const { state } = context
            if (state.current === null) {
                throw Error("Cannot renew without an existing token")
            }
            const params: Record<string, string> = {
                grant_type: "refresh_token",
                refresh_token: state.current.refreshToken,
            }
            return getToken(context, params)
        },
    },
}

export default authModule

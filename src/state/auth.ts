import { Module, VuexModule, Mutation, Action } from "vuex-module-decorators"

import * as Api from "@/api"
import * as Store from "@/state/store"

const renewInterval = 120000

export class CurrentAuth {
    token: string
    header: Api.IAuthToken

    constructor(token: string) {
        this.token = token
        this.header = Api.parseToken(token)
    }
}

const removeAuth = (store: AuthState, lastError?: string) => {
    if (store.renewIntervalId !== null) {
        clearInterval(store.renewIntervalId)
        store.renewIntervalId = null
    }
    store.current = null
    if (lastError !== undefined) {
        store.lastError = lastError
    }
}

@Module({ namespaced: true, dynamic: true, store: Store.store, name: "auth" })
export default class AuthState extends VuexModule {
    current: CurrentAuth | null = null
    lastError: string | null = null
    renewIntervalId: number | null = null

    @Mutation
    removeAuth(lastError?: string) {
        removeAuth(this, lastError)
    }

    @Mutation
    failAuth(lastError: string) {
        removeAuth(this)
        this.lastError = lastError
    }

    @Mutation
    clearError() {
        this.lastError = null
    }

    @Mutation
    setAuth(auth: CurrentAuth) {
        removeAuth(this)
        this.current = auth
        this.renewIntervalId = setInterval(() => {
            Store.store.dispatch("auth/renewAuth")
        }, renewInterval)
        this.lastError = null
    }

    @Action
    async requestAuth({ username, password }: { username: string, password: string }): Promise<void> {
        try {
            const token = await Api.requestAuth(username, password)
            const auth = new CurrentAuth(token)
            this.setAuth(auth)
        } catch (e) {
            this.failAuth(e.message)
            throw e
        }
    }

    @Action
    async renewAuth(): Promise<void> {
        const token: string = await Store.callSecretApi(Api.renewAuth)
        const auth = new CurrentAuth(token)
        this.setAuth(auth)
    }
}

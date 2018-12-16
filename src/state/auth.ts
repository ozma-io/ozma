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

const clear = (store: AuthState, lastError?: string) => {
    if (store.renewIntervalId !== null) {
        clearInterval(store.renewIntervalId)
        store.renewIntervalId = null
    }
    store.current = null
    if (lastError !== undefined) {
        store.lastError = lastError
    } else {
        store.lastError = null
    }
}

@Module({ namespaced: true, dynamic: true, store: Store.store, name: "auth" })
export default class AuthState extends VuexModule {
    current: CurrentAuth | null = null
    lastError: string | null = null
    renewIntervalId: number | null = null

    @Mutation
    removeAuth(lastError?: string) {
        clear(this, lastError)
    }

    @Mutation
    clearError() {
        this.lastError = null
    }

    @Mutation
    setAuth(auth: CurrentAuth) {
        clear(this)
        this.current = auth
        this.renewIntervalId = setInterval(() => {
            Store.store.dispatch("auth/renewAuth")
        }, renewInterval)
    }

    @Action
    async requestAuth({ username, password }: { username: string, password: string }): Promise<void> {
        try {
            const token = await Api.requestAuth(username, password)
            const auth = new CurrentAuth(token)
            this.setAuth(auth)
        } catch (e) {
            this.removeAuth(e.message)
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

import { Module, VuexModule, Mutation, Action } from "vuex-module-decorators"

import * as Api from "../api"
import * as Store from "./store"

export class CurrentAuth {
    token: string
    header: Api.AuthToken

    constructor(token: string) {
        this.token = token
        this.header = Api.parseToken(token)
    }
}

@Module({ namespaced: true, dynamic: true, store: Store.store, name: "auth" })
export default class AuthState extends VuexModule {
    current: CurrentAuth | null = null
    lastError: string | null = null

    @Mutation
    removeAuth(lastError?: string) {
        this.current = null
        if (lastError !== undefined) {
            this.lastError = lastError
        }
    }

    @Mutation
    failAuth(lastError: string) {
        this.lastError = lastError
    }

    @Mutation
    clearError() {
        this.lastError = null
    }

    @Mutation
    setAuth(auth: CurrentAuth) {
        this.current = auth
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
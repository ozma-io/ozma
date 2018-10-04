import { Module, VuexModule, Mutation, Action } from "vuex-module-decorators"

import * as Api from "../api"
import * as Store from "./store"

export class CurrentUserView {
    name: string
    args: URLSearchParams
    result: Api.ViewExprResult

    constructor(name: string, args: URLSearchParams, result: Api.ViewExprResult) {
        this.name = name
        this.args = args
        this.result = result
    }
}

@Module({ namespaced: true, dynamic: true, store: Store.store, name: "userView" })
export default class MainMenuState extends VuexModule {
    current: CurrentUserView | null = null
    lastError: string | null = null

    @Mutation
    removeAuth(lastError?: string) {
        this.current = null
        if (lastError !== undefined) {
            this.lastError = lastError
        }
    }

    @Mutation
    clear() {
        this.current = null
    }

    @Mutation
    failGet(lastError: string) {
        this.lastError = lastError
    }

    @Mutation
    clearError() {
        this.lastError = null
    }

    @Mutation
    setCurrent(userView: CurrentUserView) {
        this.current = userView
        this.lastError = null
    }

    @Action
    getUserView({ name, args }: { name: string, args: URLSearchParams }): Promise<void> {
        if (this.current !== null && this.current.name !== name) {
            this.clear()
        }

        console.log(args)

        return (async () => {
            try {
                const res: Api.ViewExprResult = await Store.callSecretApi(Api.fetchNamedView, name, args)
                let userView = {
                    name: name,
                    args: args,
                    result: res
                }
                this.setCurrent(userView)
            } catch (e) {
                this.failGet(e.message)
                throw e
            }
        })()
    }
}
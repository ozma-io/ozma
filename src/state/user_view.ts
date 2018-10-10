import { Module, VuexModule, Mutation, Action } from "vuex-module-decorators"

import * as Api from "../api"
import * as Store from "./store"

export interface IUserViewData {
    info: Api.IResultViewInfo
    attributes: Record<string, any>
    columnAttributes: Array<Record<string, any>>
    rows: Api.IExecutedRow[] | null
}

export class CurrentUserView {
    name: string
    args: URLSearchParams
    uv: IUserViewData

    constructor(name: string, args: URLSearchParams, uv: IUserViewData) {
        this.name = name
        this.args = args
        this.uv = uv
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

        return (async () => {
            try {
                const res: Api.IViewExprResult = await Store.callSecretApi(Api.fetchNamedView, name, args)
                const data = {
                    info: res.info,
                    attributes: res.result.attributes,
                    columnAttributes: res.result.columnAttributes,
                    rows: res.result.rows,
                }
                const current = new CurrentUserView(name, args, data)
                this.setCurrent(current)
            } catch (e) {
                this.failGet(e.message)
                throw e
            }
        })()
    }

    @Action
    getUserViewInfo(name: string): Promise<void> {
        if (this.current !== null && this.current.name !== name) {
            this.clear()
        }

        return (async () => {
            try {
                const res: Api.IViewInfoResult = await Store.callSecretApi(Api.fetchNamedViewInfo, name)
                const data = {
                    info: res.info,
                    attributes: res.pureAttributes,
                    columnAttributes: res.pureColumnAttributes,
                    rows: null,
                }
                const current = new CurrentUserView(name, new URLSearchParams(), data)
                this.setCurrent(current)
            } catch (e) {
                this.failGet(e.message)
                throw e
            }
        })()
    }
}

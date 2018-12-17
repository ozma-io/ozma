import { Module, VuexModule, Mutation, Action } from "vuex-module-decorators"

import * as Api from "@/api"
import { IResultViewInfo, IExecutedRow } from "@/api"
import * as Store from "@/state/store"

export type UserViewType = "named" | "anonymous"

export class UserViewResult {
    type: UserViewType
    source: string
    args: URLSearchParams | null
    info: IResultViewInfo
    attributes: Record<string, any>
    columnAttributes: Array<Record<string, any>>
    rows: IExecutedRow[] | null
    // Row ids to row positions, actual key is Api.RowId
    updateRowIds: Record<string, number> = {}
    // Column names to column positions
    updateColumnIds: Record<string, number> = {}

    constructor(type: UserViewType, source: string, args: URLSearchParams | null, info: IResultViewInfo, attributes: Record<string, any>, columnAttributes: Array<Record<string, any>>, rows: IExecutedRow[] | null) {
        this.type = type
        this.source = source
        this.args = args
        this.info = info
        this.attributes = attributes
        this.columnAttributes = columnAttributes
        this.rows = rows

        if (rows !== null) {
            this.updateRowIds = rows.reduce((rowIds: Record<string, number>, row, rowI) => {
                if (row.id !== undefined) {
                    rowIds[row.id] = rowI
                }
                return rowIds
            }, {})
        }

        if (info.updateEntity !== null) {
            this.updateColumnIds = info.columns.reduce((colIds: Record<string, number>, col, colI) => {
                if (col.updateField !== null) {
                    colIds[col.updateField.name] = colI
                }
                return colIds
            }, {})
        }
    }
}

@Module({ namespaced: true, dynamic: true, store: Store.store, name: "userView" })
export default class MainMenuState extends VuexModule {
    current: UserViewResult | null = null
    lastError: string | null = null

    @Mutation
    removeAuth(lastError?: string) {
        this.current = null
        if (lastError !== undefined) {
            this.lastError = lastError
        }
    }

    @Mutation
    setError(lastError: string) {
        this.lastError = lastError
    }

    @Mutation
    clearError() {
        this.lastError = null
    }

    @Mutation
    setCurrent(userView: UserViewResult) {
        this.current = userView
        this.lastError = null
    }

    @Mutation
    clearCurrent() {
        this.current = null
    }

    @Mutation
    clear() {
        this.current = null
        this.lastError = null
    }

    @Action
    async getNamed({ name, args }: { name: string, args: URLSearchParams }): Promise<void> {
        try {
            const res: Api.IViewExprResult = await Store.callSecretApi(Api.fetchNamedView, name, args)
            const current = new UserViewResult("named", name, args, res.info, res.result.attributes, res.result.columnAttributes, res.result.rows)
            this.setCurrent(current)
        } catch (e) {
            this.setError(e.message)
            throw e
        }
    }

    @Action
    async getNamedInfo(name: string): Promise<void> {
        try {
            const res: Api.IViewInfoResult = await Store.callSecretApi(Api.fetchNamedViewInfo, name)
            const current = new UserViewResult("named", name, null, res.info, res.pureAttributes, res.pureColumnAttributes, null)
            this.setCurrent(current)
        } catch (e) {
            this.setError(e.message)
            throw e
        }
    }

    // Simple reload; we keep old data if it fails.
    @Action
    async reload(): Promise<void> {
        const current: UserViewResult = this.context.getters["current"]

        if (current === null) {
            return
        }

        if (current.type === "named") {
            if (current.args !== null) {
                await this.context.dispatch("getNamed", { name: current.source, args: current.args })
            } else {
                await this.context.dispatch("getNamedInfo", current.source)
            }
        }
    }

    // Forced reload; clear existing data if it fails.
    @Action
    async forceReload(): Promise<void> {
        try {
            await this.context.dispatch("reload")
        } catch (e) {
            this.clearCurrent()
            throw e
        }
    }
}

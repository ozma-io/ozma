import { Module } from "vuex"

import * as Api from "@/api"
import { IResultViewInfo, IExecutedRow } from "@/api"

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

export interface IUserViewState {
    current: UserViewResult | null
    lastError: string | null
}

const userViewModule: Module<IUserViewState, {}> = {
    namespaced: true,
    state: {
        current: null,
        lastError: null,
    },
    mutations: {
        setError: (state, lastError: string) => {
            state.lastError = lastError
        },
        clearError: state => {
            state.lastError = null
        },
        setUserView: (state, userView: UserViewResult) => {
            state.current = userView
            state.lastError = null
        },
        clearUserView: state => {
            state.current = null
        },
        clear: state => {
            state.current = null
            state.lastError = null
        },
    },
    actions: {
        getNamed: async ({ commit, dispatch }, { name, args }: { name: string, args: URLSearchParams }) => {
            try {
                const res: Api.IViewExprResult = await dispatch("callProtectedApi", {
                    func: Api.fetchNamedView,
                    args: [name, args],
                }, { root: true })
                const current = new UserViewResult("named", name, args, res.info, res.result.attributes, res.result.columnAttributes, res.result.rows)
                commit("setUserView", current)
            } catch (e) {
                commit("setError", e.message)
                throw e
            }
        },
        getNamedInfo: async ({ commit, dispatch }, name: string) => {
            try {
                const res: Api.IViewInfoResult = await dispatch("callProtectedApi", {
                    func: Api.fetchNamedViewInfo,
                    args: [name],
                }, { root: true })
                const current = new UserViewResult("named", name, null, res.info, res.pureAttributes, res.pureColumnAttributes, null)
                commit("setUserView", current)
            } catch (e) {
                commit("setError", e.message)
                throw e
            }
        },
        // Simple reload; we keep old data if it fails.
        reload: async ({ state, dispatch }) => {
            if (state.current === null) {
                return
            }

            if (state.current.type === "named") {
                if (state.current.args !== null) {
                    await dispatch("getNamed", { name: state.current.source, args: state.current.args })
                } else {
                    await dispatch("getNamedInfo", state.current.source)
                }
            }
        },
        // Forced reload; clear existing data if it fails.
        forceReload: async ({ commit, dispatch }) => {
            try {
                await dispatch("reload")
            } catch (e) {
                commit("clearUserView")
                throw e
            }
        },
    },
}

export default userViewModule

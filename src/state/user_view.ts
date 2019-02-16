import Vue from "vue"
import { Module } from "vuex"

import * as Api from "@/api"
import { IResultViewInfo, IExecutedRow, SchemaName, EntityName } from "@/api"

export type UserViewType = "named" | "anonymous"

export interface IUserViewArguments {
    type: UserViewType
    source: string
    args: URLSearchParams | null
}

export class UserViewResult {
    args: IUserViewArguments
    info: IResultViewInfo
    attributes: Record<string, any>
    columnAttributes: Array<Record<string, any>>
    rows: IExecutedRow[] | null
    // Row ids to row positions, actual key is Api.RowId
    updateRowIds: Record<string, number> = {}
    // Column names to column positions
    updateColumnIds: Record<string, number> = {}

    constructor(args: IUserViewArguments, info: IResultViewInfo, attributes: Record<string, any>, columnAttributes: Array<Record<string, any>>, rows: IExecutedRow[] | null) {
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

// For each entity contains array of all accessible entries identified by main field
export type Entries = Record<string, number>
export type EntriesMap = Record<SchemaName, Record<EntityName, Entries | Promise<Entries>>>

export interface IUserViewState {
    current: UserViewResult | null
    pending: Promise<UserViewResult> | null
    entries: EntriesMap
    lastError: string | null
}

const userViewModule: Module<IUserViewState, {}> = {
    namespaced: true,
    state: {
        current: null,
        pending: null,
        entries: {},
        lastError: null,
    },
    mutations: {
        setError: (state, lastError: string) => {
            state.lastError = lastError
            state.pending = null
        },
        clearError: state => {
            state.lastError = null
        },
        setUserView: (state, userView: UserViewResult) => {
            state.current = userView
            state.pending = null
            state.entries = {}
            state.lastError = null
        },
        clearUserView: state => {
            state.current = null
            state.pending = null
            state.entries = {}
        },
        clear: state => {
            state.current = null
            state.pending = null
            state.entries = {}
            state.lastError = null
        },
        setPending: (state, pending: Promise<UserViewResult>) => {
            state.pending = pending
        },
        setEntries: (state, { schemaName, entityName, entries }: { schemaName: string, entityName: string, entries: Entries | Promise<Entries> }) => {
            let entities = state.entries[schemaName]
            if (entities === undefined) {
                entities = {}
                Vue.set(state.entries, schemaName, entities)
            }

            Vue.set(entities, entityName, entries)
        },
        clearEntries: (state, { schemaName, entityName }: { schemaName: string, entityName: string }) => {
            const entities = state.entries[schemaName]
            if (entities === undefined) {
                return
            }

            Vue.delete(entities, entityName)
        },
    },
    actions: {
        getEntries: ({ state, commit, dispatch }, { schemaName, entityName }: { schemaName: string, entityName: string }) => {
            const currentSchema = state.entries[schemaName]
            if (currentSchema !== undefined) {
                const current = currentSchema[entityName]
                if (current instanceof Promise) {
                    return current
                } else if (current !== undefined) {
                    return Promise.resolve(current)
                }
            }

            commit("setEntries", { schemaName, entityName, entries: (async () => {
                try {
                    const name = `__Summary__${schemaName}__${entityName}`
                    const res: Api.IViewExprResult = await dispatch("callProtectedApi", {
                        func: Api.fetchNamedView,
                        args: [name, new URLSearchParams()],
                    }, { root: true })
                    if (!(schemaName in state.entries && state.entries[schemaName][entityName] instanceof Promise)) {
                        throw Error("Pending operation cancelled")
                    }
                    const entries = res.result.rows.reduce((currEntries: Record<string, number>, row) => {
                        const id = row.values[0].value
                        const main = row.values[1].value
                        currEntries[main] = id
                        return currEntries
                    }, {})
                    commit("setEntries", { schemaName, entityName, entries })
                    return entries
                } catch (e) {
                    commit("clearEntries", { schemaName, entityName })
                    throw e
                }
            })() })
        },
        getView: ({ state, commit, dispatch }, args: IUserViewArguments) => {
            if (state.pending !== null) {
                return state.pending
            }
            commit("setPending", (async () => {
                try {
                    let current: UserViewResult
                    if (args.type === "named") {
                        if (args.args === null) {
                            const res: Api.IViewInfoResult = await dispatch("callProtectedApi", {
                                func: Api.fetchNamedViewInfo,
                                args: [args.source],
                            }, { root: true })
                            current = new UserViewResult(args, res.info, res.pureAttributes, res.pureColumnAttributes, null)
                        } else {
                            const res: Api.IViewExprResult = await dispatch("callProtectedApi", {
                                func: Api.fetchNamedView,
                                args: [args.source, args.args],
                            }, { root: true })
                            current = new UserViewResult(args, res.info, res.result.attributes, res.result.columnAttributes, res.result.rows)
                        }
                    } else {
                        if (args.args === null) {
                            throw Error("Getting information about anonymous views is not supported")
                        } else {
                            const res: Api.IViewExprResult = await dispatch("callProtectedApi", {
                                func: Api.fetchAnonymousView,
                                args: [args.source, args.args],
                            }, { root: true })
                            current = new UserViewResult(args, res.info, res.result.attributes, res.result.columnAttributes, res.result.rows)
                        }
                    }
                    if (state.pending === null) {
                        throw Error("Pending operation cancelled")
                    }
                    commit("setUserView", current)
                    return current
                } catch (e) {
                    commit("setError", e.message)
                    throw e
                }
             })())
        },
        // Forced reload; clear existing data if it fails.
        forceReload: async ({ state, commit, dispatch }) => {
            if (state.current === null) {
                return
            }
            try {
                await dispatch("getView", state.current.args)
            } catch (e) {
                commit("clearUserView")
                throw e
            }
        },
    },
}

export default userViewModule

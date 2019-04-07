import Vue from "vue"
import { Module, ActionContext } from "vuex"
import { Moment } from "moment"
import moment from "moment"

import { IRef, FetchError, momentLocale, deepFreeze } from "@/utils"
import * as Api from "@/api"
import {
    AttributesMap, IColumnField, IFieldRef, IResultViewInfo, IExecutedRow,
    SchemaName, ColumnName, EntityName, RowId, RowIdString, DomainId, FieldName, ValueType,
} from "@/api"

export type UserViewType = "named" | "anonymous"

export interface IUserViewArguments {
    type: UserViewType
    source: string
    args: URLSearchParams | null
}

export interface IUpdateMapping {
    // Entity IDs to row positions
    idsToRows: Record<RowIdString, number[]>
    // Column names to column positions
    fieldsToColumns: Record<FieldName, number[]>
}

export interface IUpdatableField {
    field: IColumnField | null
    fieldRef: IFieldRef
    id: RowId
}

export interface IProcessedValue {
    value: any
    attributes?: AttributesMap
    pun?: any
    update?: IUpdatableField
}

export interface IProcessedRow {
    values: IProcessedValue[]
    attributes?: AttributesMap
    domainId: DomainId
    entityIds?: Record<ColumnName, RowId>
}

export type IUpdateMappings = Record<SchemaName, Record<EntityName, IUpdateMapping>>

export class UserViewResult {
    args: IUserViewArguments
    info: IResultViewInfo
    attributes: Record<string, any>
    columnAttributes: Array<Record<string, any>>
    rows: IProcessedRow[] | null
    // Row ids to row positions, actual key is Api.RowId
    updateMappings: IUpdateMappings = {}

    constructor(args: IUserViewArguments, info: IResultViewInfo, attributes: Record<string, any>, columnAttributes: Array<Record<string, any>>, rows: IExecutedRow[] | null) {
        const newRows = rows as IProcessedRow[] | null
        this.args = args
        this.info = info
        this.attributes = attributes
        this.columnAttributes = columnAttributes
        this.rows = rows

        if (newRows !== null) {
            info.columns.forEach((columnInfo, colI) => {
                if (columnInfo.valueType.type === "datetime" || columnInfo.valueType.type === "date") {
                    newRows.forEach(row => {
                        const cell = row.values[colI]
                        if (typeof cell.value === "number") {
                            const str = cell.value
                            cell.value = moment(cell.value * 1000)
                        }
                    })
                }
            })

            this.updateMappings = newRows.reduce((mappings: IUpdateMappings, row, rowI) => {
                const domain = this.info.domains[row.domainId]

                if (row.entityIds !== undefined) {
                    const entityIds = row.entityIds
                    info.columns.forEach((columnInfo, colI) => {
                        const field = domain[columnInfo.name]
                        if (field !== undefined) {
                            const cell = row.values[colI]
                            const id = entityIds[field.idColumn]
                            const updateInfo = {
                                field: field.field,
                                fieldRef: field.ref,
                                id,
                            }
                            cell.update = updateInfo

                            const ref = field.ref.entity
                            let entityMappings = mappings[ref.schema]
                            if (entityMappings === undefined) {
                                entityMappings = {}
                                mappings[ref.schema] = entityMappings
                            }
                            let mapping = entityMappings[ref.name]
                            if (mapping === undefined) {
                                mapping = {
                                    idsToRows: {},
                                    fieldsToColumns: {},
                                }
                                entityMappings[ref.name] = mapping
                            }

                            const mappedRows = mapping.idsToRows[id]
                            if (mappedRows === undefined) {
                                mapping.idsToRows[id] = [rowI]
                            } else {
                                mappedRows.push(rowI)
                            }

                            const mappedCols = mapping.fieldsToColumns[field.ref.name]
                            if (mappedCols === undefined) {
                                mapping.fieldsToColumns[field.ref.name] = [colI]
                            } else {
                                mappedCols.push(colI)
                            }
                        }
                    })
                }

                return mappings
            }, {})
        }
    }

    mappingForEntity(schemaName: string, entityName: string): IUpdateMapping | null {
        const entities = this.updateMappings[schemaName]
        if (entities === undefined) {
            return null
        }
        const mapping = entities[entityName]
        if (mapping === undefined) {
            return null
        }
        return mapping
    }

    get name() {
        if (this.args.type === "named") {
            return this.args.source
        } else {
            return "unnamed"
        }
    }
}

// For each entity contains array of all accessible entries identified by main field
export type Entries = Record<string, number>
export type EntriesMap = Record<SchemaName, Record<EntityName, Entries | Promise<Entries>>>

export type UserViewErrorType = "forbidden" | "not_found" | "bad_request" | "unknown"

export class UserViewError extends Error {
    type: UserViewErrorType
    description: string
    args: IUserViewArguments

    constructor(type: UserViewErrorType, description: string, args: IUserViewArguments) {
        super(type)
        this.type = type
        this.description = description
        this.args = args
    }

    get message() {
        if (this.description !== "") {
            return this.description
        } else {
            return this.type
        }
    }
}

export class CurrentUserViews {
    userViews: Record<string, UserViewResult | UserViewError | Promise<UserViewResult>> = {}

    get rootView() {
        const uv = this.userViews[""]
        if (uv === null || uv instanceof Promise) {
            return null
        } else {
            return uv
        }
    }

    setUserView(args: IUserViewArguments | null, uv: UserViewResult | UserViewError | Promise<UserViewResult>) {
        Vue.set(this.userViews, args === null ? "" : userViewHash(args), uv)
    }

    getUserView(args: IUserViewArguments) {
        const uv = this.userViews[userViewHash(args)]
        if (uv === null || uv instanceof Promise) {
            return null
        } else {
            return uv
        }
    }
}

export interface IUserViewState {
    current: CurrentUserViews
    pending: Promise<UserViewResult> | null
    entries: EntriesMap
    errors: string[]
}

export const dateFormat = "L"
export const dateTimeFormat = "L LTS"

// Should be in sync with staging_changes.validateValue
export const printValue = (valueType: ValueType, value: any): string => {
    if (value === null) {
        return ""
    } else if (valueType.type === "date") {
        return (value as Moment).format(dateFormat)
    } else if (valueType.type === "datetime") {
        return (value as Moment).format(dateTimeFormat)
    } else {
        return String(value)
    }
}

const userViewHash = (args: IUserViewArguments) => `${args.type}__${args.source}__${args.args}`

const getUserView = async ({ dispatch }: ActionContext<IUserViewState, {}>, args: IUserViewArguments): Promise<UserViewResult | UserViewError> => {
    try {
        let current: UserViewResult
        if (args.type === "named") {
            if (args.args === null) {
                const res: Api.IViewInfoResult = await dispatch("callProtectedApi", {
                    func: Api.fetchNamedViewInfo,
                    args: [args.source],
                }, { root: true })
                await momentLocale
                current = new UserViewResult(args, res.info, res.pureAttributes, res.pureColumnAttributes, null)
            } else {
                const res: Api.IViewExprResult = await dispatch("callProtectedApi", {
                    func: Api.fetchNamedView,
                    args: [args.source, args.args],
                }, { root: true })
                await momentLocale
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
                await momentLocale
                current = new UserViewResult(args, res.info, res.result.attributes, res.result.columnAttributes, res.result.rows)
            }
        }
        return deepFreeze(current)
    } catch (e) {
        if (e instanceof FetchError) {
            if (e.response.status === 403) {
                return new UserViewError("forbidden", "", args)
            } else if (e.response.status === 404) {
                return new UserViewError("not_found", "", args)
            } else if (e.response.status === 400) {
                return new UserViewError("bad_request", e.message, args)
            } else {
                return new UserViewError("unknown", e.message, args)
            }
        }

        throw e
    }
}

const userViewModule: Module<IUserViewState, {}> = {
    namespaced: true,
    state: {
        current: new CurrentUserViews(),
        pending: null,
        entries: {},
        errors: [],
    },
    mutations: {
        addError: (state, lastError: string) => {
            state.errors.push(lastError)
        },
        removeError: (state, errorIndex: number) => {
            state.errors.splice(errorIndex, 1)
        },
        setUserView: (state, { args, userView }: { args: IUserViewArguments | null, userView: UserViewResult | Promise<UserViewResult> }) => {
            state.current.setUserView(args, userView)
        },
        setPending: (state, pending: Promise<UserViewResult>) => {
            state.pending = pending
        },
        clear: state => {
            state.pending = null
            state.current = new CurrentUserViews()
            state.entries = {}
            state.errors = []
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
                if (entityName in  currentSchema) {
                    return
                }
            }

            const pending: IRef<Promise<Entries>> = {}
            pending.ref = (async () => {
                try {
                    const name = `__Summary__${schemaName}__${entityName}`
                    const res: Api.IViewExprResult = await dispatch("callProtectedApi", {
                        func: Api.fetchNamedView,
                        args: [name, new URLSearchParams()],
                    }, { root: true })
                    if (!(schemaName in state.entries && state.entries[schemaName][entityName] === pending.ref)) {
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
                    if (schemaName in state.entries && state.entries[schemaName][entityName] === pending.ref) {
                        commit("clearEntries", { schemaName, entityName })
                    }
                    throw e
                }
            })()
            commit("setEntries", { schemaName, entityName, entries: pending.ref })
        },
        getRootView: (store, args: IUserViewArguments) => {
            const { state, commit } = store
            const pending: IRef<Promise<UserViewResult>> = {}
            pending.ref = (async () => {
                let current: UserViewError | UserViewResult
                try {
                    current = await getUserView(store, args)
                    if (state.pending !== pending.ref) {
                        throw Error("Pending operation cancelled")
                    }
                    commit("clear")
                    commit("setUserView", { args: null, userView: current })
                } catch (e) {
                    if (state.pending === pending.ref) {
                        commit("clear")
                        commit("addError", e.message)
                    }
                    throw e
                }
                if (current instanceof UserViewError) {
                    throw current
                } else {
                    return current
                }
            })()
            commit("setPending", pending.ref)
            return pending.ref
        },
        getNestedView: (store, args: IUserViewArguments) => {
            const { state, commit } = store
            const uvHash = userViewHash(args)
            if (uvHash in state.current.userViews) {
                return
            }

            const pending: IRef<Promise<UserViewResult>> = {}
            pending.ref = (async () => {
                let current: UserViewError | UserViewResult
                try {
                    current = await getUserView(store, args)
                    if (state.current.userViews[uvHash] !== pending.ref) {
                        throw Error("Pending operation cancelled")
                    }
                    commit("setUserView", { args, userView: current })
                } catch (e) {
                    if (state.current.userViews[uvHash] === pending.ref) {
                        commit("addError", e.message)
                    }
                    throw e
                }
                if (current instanceof UserViewError) {
                    throw current
                } else {
                    return current
                }
            })()
            commit("setUserView", { args, userView: pending.ref })
            return pending.ref
        },
        reload: async ({ state, commit, dispatch }) => {
            if (state.current.rootView === null) {
                return
            }
            await dispatch("getRootView", state.current.rootView.args)
        },
    },
}

export default userViewModule

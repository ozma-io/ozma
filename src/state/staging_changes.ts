import Vue from "vue"
import { Module, ActionContext } from "vuex"
import { Moment } from "moment"
import moment from "moment"

import { RecordSet, deepClone } from "@/utils"
import { RowId, SchemaName, FieldName, EntityName } from "@/api"
import { IUpdatedValue, IFieldInfo, EntityFieldsInfo, valueFromRaw, FieldsInfo } from "@/values"
import * as Api from "@/api"
import { i18n } from "@/modules"

export type UpdatedValues = Record<FieldName, IUpdatedValue>

export type AddedRowId = number

export interface IAddedEntry {
    values: UpdatedValues,
}

export interface IAddedEntries {
    lastId: number
    // Actual updated values, indexed by unique id
    entries: Record<AddedRowId, IAddedEntry>
    // Value positions
    positions: AddedRowId[]
}

export type AutoSaveLock = number

export interface IEntityChanges {
    updated: Record<RowId, UpdatedValues>
    // Applied to user views with FOR INSERT INTO
    added: IAddedEntries
    // Applied to user views with FOR UPDATE OF (or FOR INSERT INTO)
    deleted: RecordSet<RowId>
}

const emptyAdded: IAddedEntries = {
    lastId: 0,
    entries: {},
    positions: [],
}

const emptyUpdates: IEntityChanges = {
    updated: {},
    added: emptyAdded,
    deleted: {},
}

export class CurrentChanges {
    changes: Record<SchemaName, Record<EntityName, IEntityChanges>> = {}

    get isEmpty() {
        return Object.entries(this.changes).length === 0
    }

    getOrCreateChanges(schemaName: string, entityName: string): IEntityChanges {
        let entities = this.changes[schemaName]
        if (entities === undefined) {
            entities = {}
            Vue.set(this.changes, schemaName, entities)
        }

        let entity = entities[entityName]
        if (entity === undefined) {
            entity = deepClone(emptyUpdates)
            Vue.set(entities, entityName, entity)
        }

        return entity
    }

    changesForEntity(schemaName: string, entityName: string): IEntityChanges {
        const entities = this.changes[schemaName]
        if (entities === undefined) {
            return emptyUpdates
        }
        const changes = entities[entityName]
        if (changes === undefined) {
            return emptyUpdates
        }
        return changes
    }
}

export interface IStagingState {
    current: CurrentChanges
    addedCount: number
    updatedCount: number
    deletedCount: number
    // Current submit promise
    currentSubmit: Promise<void> | null
    // Set if changes were made during the submit to decide how to clear.
    // We allow updating and removing entries while submit is ongoing, but not adding new ones to prevent duplicate inserts.
    touched: boolean
    // FIXME: instead set errors for each change -- this requires transactions and per-change errors support in FunDB.
    errors: string[]
    autoSaveTimeout: number | null
    autoSaveTimeoutId: NodeJS.Timeout | null
    lastAutoSaveLock: AutoSaveLock
    autoSaveLocks: Record<AutoSaveLock, null>
}

const askOnClose = (e: BeforeUnloadEvent) => {
    e.preventDefault()
    const msg = i18n.tc("confirm_close")
    e.returnValue = msg
    return msg
}

const stopAutoSave = ({ state, commit }: ActionContext<IStagingState, {}>) => {
    if (state.autoSaveTimeoutId !== null) {
        clearTimeout(state.autoSaveTimeoutId)
        commit("clearAutoSaveHandler")
    }
}

const startAutoSave = (context: ActionContext<IStagingState, {}>) => {
    const { state, commit, dispatch } = context
    stopAutoSave(context)

    if (state.autoSaveTimeout !== null) {
        const timeoutId = setTimeout(() => {
            dispatch("submit")
        }, state.autoSaveTimeout)
        commit("setAutoSaveHandler", timeoutId)
    }
}

const checkAutoSave = (context: ActionContext<IStagingState, {}>) => {
    const { state, commit } = context
    if (state.addedCount === 0 && state.currentSubmit === null && Object.entries(state.autoSaveLocks).length === 0) {
        startAutoSave(context)
    } else {
        stopAutoSave(context)
    }
}

const checkCounters = async (context: ActionContext<IStagingState, {}>) => {
    const { state, commit } = context
    if (state.updatedCount === 0 && state.addedCount === 0 && state.deletedCount === 0) {
        await context.dispatch("userView/resetChanges", undefined, { root: true })
    } else {
        window.addEventListener("beforeunload", askOnClose)
        checkAutoSave(context)
    }
}

const changesToParams = (changes: UpdatedValues): Record<string, any> | null => {
    return Object.fromEntries(Object.entries(changes).map<[string, any]>(([name, change]) => {
        if (change.value === undefined) {
            change.erroredOnce = true
            throw new Error("Value didn't pass validation")
        }
        change.erroredOnce = false
        let arg
        if (change.value instanceof moment) {
            arg = Math.floor((change.value as Moment).unix())
        } else {
            arg = change.value
        }
        return [ name, arg ]
    }))
}

const validateValue = (info: IFieldInfo, value: any): IUpdatedValue => {
    return {
        rawValue: value,
        value: valueFromRaw(info, value),
        erroredOnce: false,
    }
}

const getEntityFieldsInfo = (context: ActionContext<IStagingState, {}>, schema: SchemaName, entity: EntityName): EntityFieldsInfo => {
    const fieldsInfo: FieldsInfo = (context.rootState as any).userView.fieldsInfo
    const schemaInfo = fieldsInfo[schema]
    if (schemaInfo === undefined) {
        throw new Error(`No schema info for schema ${schema}`)
    }
    const entityInfo = schemaInfo[entity]
    if (entityInfo === undefined) {
        throw new Error(`No entity info for entity ${schema}.${entity}`)
    }
    return entityInfo
}

const getFieldInfo = (context: ActionContext<IStagingState, {}>, schema: SchemaName, entity: EntityName, field: FieldName): IFieldInfo => {
    const entityInfo = getEntityFieldsInfo(context, schema, entity)
    const fieldInfo = entityInfo[field]
    if (fieldInfo === undefined) {
        throw new Error(`No field info for field ${schema}.${entity}.${field}`)
    }
    return fieldInfo
}

const getEmptyValues = (entityInfo: EntityFieldsInfo): UpdatedValues => {
    return Object.fromEntries(Object.entries(entityInfo).filter(([name, info]) => !info.isNullable).map(([name, info]) => {
        const value = { value: undefined, rawValue: "", erroredOnce: false }
        return [name, value]
    }))
}

const checkUpdatedFields = (fields: UpdatedValues) => {
    Object.values(fields).forEach(field => {
        if (field.value === undefined) {
            field.erroredOnce = true
        }
    })
}

const stagingModule: Module<IStagingState, {}> = {
    namespaced: true,
    state: {
        current: new CurrentChanges(),
        addedCount: 0,
        updatedCount: 0,
        deletedCount: 0,
        currentSubmit: null,
        touched: false,
        errors: [],
        lastAutoSaveLock: 0,
        autoSaveTimeout: null,
        autoSaveTimeoutId: null,
        autoSaveLocks: {},
    },
    mutations: {
        clear: state => {
            state.current = new CurrentChanges()
            state.addedCount = 0
            state.updatedCount = 0
            state.deletedCount = 0
            state.touched = false
        },
        validate: state => {
            Object.entries(state.current.changes).forEach(([schemaName, entities]) => {
                Object.entries(entities).forEach(([entityName, entityChanges]) => {
                    Object.entries(entityChanges.updated).forEach(([updatedIdStr, updatedFields]) => {
                        checkUpdatedFields(updatedFields)
                    })
                    Object.values(entityChanges.added.entries).forEach(addedFields => {
                        checkUpdatedFields(addedFields.values)
                    })
                })
            })
        },
        setAutoSaveHandler: (state, timeoutId: NodeJS.Timeout) => {
            state.autoSaveTimeoutId = timeoutId
        },
        clearAutoSaveHandler: state => {
            state.autoSaveTimeoutId = null
        },
        setAutoSaveTimeout: (state, timeout: number | null) => {
            state.autoSaveTimeout = timeout
        },
        addAutoSaveLock: state => {
            state.autoSaveLocks[state.lastAutoSaveLock] = null
            state.lastAutoSaveLock++
        },
        removeAutoSaveLock: (state, lock: AutoSaveLock) => {
            delete state.autoSaveLocks[lock]
        },
        startSubmit: (state, submit: Promise<void>) => {
            state.touched = false
            state.currentSubmit = submit
        },
        finishSubmit: state => {
            state.currentSubmit = null
            state.errors = []
        },
        clearAdded: state => {
            Object.entries(state.current.changes).forEach(([schemaName, entities]) => {
                Object.entries(entities).forEach(([entityName, entityChanges]) => {
                    entityChanges.added = deepClone(emptyAdded)
                })
            })
            state.addedCount = 0
        },
        addError: (state, lastError: string) => {
            state.errors.push(lastError)
        },
        removeError: (state, errorIndex: number) => {
            state.errors.splice(errorIndex, 1)
        },
        updateField: (state, params: { schema: SchemaName, entity: EntityName, id: number, field: FieldName, value: any, fieldInfo: IFieldInfo }) => {
            const { schema, entity, id, field, value, fieldInfo } = params

            const entityChanges = state.current.getOrCreateChanges(schema, entity)
            let fields = entityChanges.updated[id]
            if (fields === undefined) {
                fields = {}
                state.updatedCount += 1
                if (id in entityChanges.deleted) {
                    Vue.delete(entityChanges.deleted, id)
                    state.deletedCount -= 1
                }
                Vue.set(entityChanges.updated, String(id), fields)
            }
            Vue.set(fields, field, validateValue(fieldInfo, value))
            state.touched = true
        },
        addEntry: (state, params: { schema: SchemaName, entity: EntityName, position?: number, entityInfo: EntityFieldsInfo }) => {
            const { schema, entity, position, entityInfo } = params

            // During submit new entries aren't allowed to be added because this can result in duplicates.
            if (state.currentSubmit !== null) {
                throw Error("Adding entries are forbidden while submitting")
            }

            const entityChanges = state.current.getOrCreateChanges(schema, entity)
            const newEntry = {
                position: position === undefined ? entityChanges.added.positions.length : position,
                values: getEmptyValues(entityInfo),
            }
            const newId = entityChanges.added.lastId++
            entityChanges.added.entries[newId] = newEntry
            if (position === undefined) {
                entityChanges.added.positions.push(newId)
            } else {
                entityChanges.added.positions.splice(position, 0, newId)
            }
            state.addedCount += 1
            state.touched = true
        },
        setAddedField: (state, params: { schema: SchemaName, entity: EntityName, id: number, field: FieldName, value: any, fieldInfo: IFieldInfo }) => {
            const { schema, entity, id, field, value, fieldInfo } = params
            // During submit new entries aren't allowed to be added because this can result in duplicates.
            if (state.currentSubmit !== null) {
                throw Error("Adding entries are forbidden while submitting")
            }

            const entityChanges = state.current.getOrCreateChanges(schema, entity)
            const added = entityChanges.added.entries[id]
            if (added === undefined) {
                throw new Error(`New entity id ${id} is not found`)
            }
            Vue.set(added.values, field, validateValue(fieldInfo, value))
            state.touched = true
        },
        deleteEntry: (state, { schema, entity, id }: { schema: SchemaName, entity: FieldName, id: number }) => {
            const entityChanges = state.current.getOrCreateChanges(schema, entity)
            const deleted = entityChanges.deleted[id]
            if (deleted === undefined) {
                Vue.set(entityChanges.deleted, String(id), null)
                state.deletedCount += 1
                if (id in entityChanges.updated) {
                    Vue.delete(entityChanges.updated, id)
                    state.updatedCount -= 1
                }
                state.touched = true
            }
        },
        resetUpdatedEntry: (state, { schema, entity, id }: { schema: SchemaName, entity: EntityName, id: number }) => {
            const entityChanges = state.current.getOrCreateChanges(schema, entity)
            if (id in entityChanges.updated) {
                Vue.delete(entityChanges.updated, id)
                state.updatedCount -= 1
            }
        },
        resetAddedEntry: (state, { schema, entity, id }: { schema: SchemaName, entity: EntityName, id: number }) => {
            const entityChanges = state.current.getOrCreateChanges(schema, entity)
            // During submit new entries aren't allowed to be added because this can result in duplicates.
            if (state.currentSubmit !== null) {
                throw Error("Adding entries are forbidden while submitting")
            }

            const added = entityChanges.added.entries[id]
            if (added !== undefined) {
                Vue.delete(entityChanges.added.entries, id)
                const position = entityChanges.added.positions.indexOf(id)

                if (position === -1) {
                    throw Error("Impossible")
                }
                entityChanges.added.positions.splice(position, 1)
                state.addedCount -= 1
                return
            }
        },
        resetDeleteEntry: (state, { schema, entity, id }: { schema: SchemaName, entity: EntityName, id: number }) => {
            const entityChanges = state.current.getOrCreateChanges(schema, entity)
            if (id in entityChanges.deleted) {
                Vue.delete(entityChanges.deleted, id)
                state.deletedCount -= 1
            }
        },
    },
    actions: {
        // Be careful; each operation there should be wrapped by corresponding call in userView state which also updates
        // current user views. DO NOT call these directly, even in staging module itself!
        updateField: async (context, args: { schema: SchemaName, entity: EntityName, id: number, field: FieldName, value: any }) => {
            (args as any).fieldInfo = getFieldInfo(context, args.schema, args.entity, args.field)
            context.commit("updateField", args)
            await checkCounters(context)
        },
        addEntry: async (context, args: { schema: SchemaName, entity: EntityName, position?: number }) => {
            (args as any).entityInfo = getEntityFieldsInfo(context, args.schema, args.entity)
            context.commit("addEntry", args)
            await checkCounters(context)
        },
        setAddedField: async (context, args: { schema: SchemaName, entity: EntityName, id: number, field: FieldName, value: any }) => {
            (args as any).fieldInfo = getFieldInfo(context, args.schema, args.entity, args.field)
            context.commit("setAddedField", args)
            await checkCounters(context)
        },
        deleteEntry: async (context, args: { schema: SchemaName, entity: EntityName, id: number }) => {
            context.commit("deleteEntry", args)
            await checkCounters(context)
        },
        reset: context => {
            const { commit } = context
            commit("clear")
            stopAutoSave(context)
            window.removeEventListener("beforeunload", askOnClose)
        },
        resetUpdatedEntry: async (context, args: { schema: SchemaName, entity: EntityName, id: number }) => {
            context.commit("resetUpdatedEntry", args)
            await checkCounters(context)
        },
        resetAddedEntry: async (context, args: { schema: SchemaName, entity: EntityName, id: number }) => {
            context.commit("resetAddedEntry", args)
            await checkCounters(context)
        },
        resetDeleteEntry: async (context, args: { schema: SchemaName, entity: EntityName, id: number }) => {
            context.commit("resetDeleteEntry", args)
            await checkCounters(context)
        },
        clearAdded: async context => {
            context.commit("clearAdded")
            await checkCounters(context)
        },

        addAutoSaveLock: context => {
            const id = context.state.lastAutoSaveLock
            context.commit("addAutoSaveLock")
            checkAutoSave(context)
            return id
        },
        removeAutoSaveLock: (context, id: AutoSaveLock) => {
            context.commit("removeAutoSaveLock", id)
            checkAutoSave(context)
        },
        submit: context => {
            const { state, commit, dispatch } = context
            if (state.currentSubmit !== null) {
                return state.currentSubmit
            }
            commit("validate")

            const ops = Object.entries(state.current.changes).flatMap(([schemaName, entities]) => {
                return Object.entries(entities).flatMap(([entityName, entityChanges]) => {
                    try {
                        const entity = {
                            schema: schemaName,
                            name: entityName,
                        }
                        const updated =
                            Object.entries(entityChanges.updated)
                            .map(([updatedIdStr, updatedFields]) => {
                                return {
                                    type: "update",
                                    entity,
                                    id: Number(updatedIdStr),
                                    entries: changesToParams(updatedFields),
                                }
                            }) as Api.TransactionOp[]
                        const added =
                            Object.values(entityChanges.added.entries)
                            .map(addedFields => {
                                return {
                                    type: "insert",
                                    entity,
                                    entries: changesToParams(addedFields.values),
                                }
                            }) as Api.TransactionOp[]
                        const deleted =
                            Object.keys(entityChanges.deleted)
                            .map(deletedIdStr => {
                                return {
                                    type: "delete",
                                    entity,
                                    id: Number(deletedIdStr),
                                }
                            }) as Api.TransactionOp[]
                        return updated.concat(added, deleted)
                    } catch (e) {
                        commit("addError", `Invalid value for ${schemaName}.${entityName}`)
                        throw e
                    }
                })
            })

            commit("startSubmit", (async () => {
                let failed: Error | null = null
                try {
                    await dispatch("callProtectedApi", {
                        func: Api.runTransaction,
                        args: [ops],
                    }, { root: true })
                } catch (e) {
                    failed = e
                }
                if (failed === null) {
                    try {
                        await dispatch("userView/reload", undefined, { root: true })
                    } catch (e) {
                        console.error("Error while commiting", e)
                        // Ignore errors; they've been already handled for userView
                    }
                }

                commit("finishSubmit")
                if (failed === null) {
                    if (state.touched) {
                        await dispatch("userView/clearAdded", undefined, { root: true })
                    } else {
                        await dispatch("userView/resetChanges", undefined, { root: true })
                    }
                } else {
                    commit("addError", failed.message)
                    throw failed
                }
            })())
        },
    },
}

export default stagingModule

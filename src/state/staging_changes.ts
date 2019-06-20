import Vue from "vue"
import { Module, ActionContext } from "vuex"
import { Moment } from "moment"
import moment from "moment"

import seq from "@/sequences"
import { RowIdString, SchemaName, FieldName, EntityName, FieldType } from "@/api"
import * as Api from "@/api"
import { dateFormat, dateTimeFormat } from "@/state/user_view"

export interface IUpdatedCell {
    rawValue: any
    value: any
    erroredOnce: boolean // failed on submit
}

export type UpdatedCells = Record<FieldName, IUpdatedCell>

export type AutoSaveLock = number

export interface IEntityChanges {
    updated: Record<RowIdString, UpdatedCells | null>
    // Applied to user views with FOR INSERT INTO
    added: Array<UpdatedCells | null>
    // Applied to user views with FOR UPDATE OF (or FOR INSERT INTO)
    deleted: Record<RowIdString, boolean>
}

const emptyUpdates: IEntityChanges = {
    updated: {},
    added: [],
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
            entity = {
                updated: {},
                added: [],
                deleted: {},
            }
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

export interface IFieldInfo {
    fieldType: Api.FieldType
    isNullable: boolean
}

export type EntityFieldsInfo = Record<FieldName, IFieldInfo>
export type FieldsInfo = Record<SchemaName, Record<EntityName, EntityFieldsInfo>>

export interface IStagingState {
    current: CurrentChanges
    fieldsInfo: FieldsInfo
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
    e.returnValue = ""
}

const stopAutoSave = ({ state, commit }: ActionContext<IStagingState, {}>) => {
    if (state.autoSaveTimeoutId !== null) {
        window.removeEventListener("beforeunload", askOnClose)
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
        window.addEventListener("beforeunload", askOnClose)
        commit("setAutoSaveHandler", timeoutId)
    }
}

const reset = (context: ActionContext<IStagingState, {}>) => {
    const { commit } = context
    commit("clear")
    stopAutoSave(context)
}

const checkAutoSave = (context: ActionContext<IStagingState, {}>) => {
    const { state, commit } = context
    if (state.addedCount === 0 && state.currentSubmit === null && Object.entries(state.autoSaveLocks).length === 0) {
        startAutoSave(context)
    } else {
        stopAutoSave(context)
    }
}

const checkCounters = (context: ActionContext<IStagingState, {}>) => {
    const { state, commit } = context
    if (state.updatedCount === 0 && state.addedCount === 0 && state.deletedCount === 0) {
        reset(context)
    } else {
        checkAutoSave(context)
    }
}

const changesToParams = (changes: UpdatedCells): Record<string, any> | null => {
    return seq(changes).map<[string, any]>(([name, change]) => {
        if (change.value === undefined) {
            throw new Error("Value didn't pass validation")
        }
        let arg
        if (change.value instanceof moment) {
            arg = Math.floor((change.value as Moment).unix())
        } else {
            arg = change.value
        }
        return [ name, arg ]
    }).toObject()
}

const convertArray = (entryType: FieldType, value: any[]): any[] | undefined => {
    const converted = value.map(entry => convertValue({ fieldType: entryType, isNullable: false }, entry))
    if (converted.some(entry => entry === undefined)) {
        return undefined
    } else {
        return converted
    }
}

export const convertValue = ({ fieldType, isNullable }: IFieldInfo, value: any): any => {
    if (value === null || value === undefined || value === "") {
        return isNullable ? null : undefined
    } else if (fieldType.type === "string" || fieldType.type === "enum") {
        return typeof value === "string" ? value : undefined
    } else if (fieldType.type === "bool") {
        if (typeof value === "boolean") {
            return value
        } else {
            const str = String(value).toLowerCase()
            if (str === "false") {
                return false
            } else if (str === "true") {
                return true
            } else {
                return undefined
            }
        }
    } else if (fieldType.type === "array") {
        if (value instanceof Array) {
            return convertArray({ type: fieldType.subtype }, value)
        } else if (typeof value === "string") {
            return convertArray({ type: fieldType.subtype }, value.split(","))
        } else {
            return undefined
        }
    } else if (fieldType.type === "date") {
        const date = moment.utc(value, dateFormat)
        if (!date.isValid()) {
            return undefined
        } else {
            return date
        }
    } else if (fieldType.type === "datetime") {
        const date = moment(value, dateTimeFormat)
        if (!date.isValid()) {
            return undefined
        } else {
            return date
        }
    } else if (fieldType.type === "decimal") {
        const f = Number(value)
        if (Number.isFinite(f)) {
            return f
        } else {
            return undefined
        }
    } else if (fieldType.type === "int" || fieldType.type === "reference") {
        const f = Number(value)
        if (Number.isInteger(f)) {
            return f
        } else {
            return undefined
        }
    } else if (fieldType.type === "json") {
        try {
            return JSON.parse(value)
        } catch (e) {
            return undefined
        }
    } else {
        console.assert(false, "Invalid field type")
    }
}

const validateValue = (info: IFieldInfo, value: any): IUpdatedCell => {
    return {
        rawValue: value,
        value: convertValue(info, value),
        erroredOnce: false,
    }
}

const getFieldInfo = (state: IStagingState, schema: SchemaName, entity: EntityName, field: FieldName): IFieldInfo => {
    const schemaInfo = state.fieldsInfo[schema]
    if (schemaInfo === undefined) {
        throw new Error(`No schema info for schema ${schema}`)
    }
    const entityInfo = schemaInfo[entity]
    if (entityInfo === undefined) {
        throw new Error(`No entity info for entity ${schema}.${entity}`)
    }
    const fieldInfo = entityInfo[field]
    if (fieldInfo === undefined) {
        throw new Error(`No field info for field ${schema}.${entity}.${field}`)
    }
    return fieldInfo
}

const getEmptyCells = (entityInfo: EntityFieldsInfo): UpdatedCells => {
    return seq(entityInfo).filter(([name, info]) => !info.isNullable).map<[string, IUpdatedCell]>(([name, info]) => {
        const cell = { value: undefined, rawValue: "", erroredOnce: false }
        return [name, cell]
    }).toObject()
}

const checkUpdatedFields = (fields: Record<string, IUpdatedCell>) => {
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
        fieldsInfo: {},
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
                    const entity = {
                        schema: schemaName,
                        name: entityName,
                    }
                    Object.entries(entityChanges.updated).forEach(([updatedIdStr, updatedFields]) => {
                        if (updatedFields !== null) {
                            checkUpdatedFields(updatedFields)
                        }
                    })
                    entityChanges.added.forEach(addedFields => {
                        if (addedFields !== null) {
                            checkUpdatedFields(addedFields)
                        }
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
                    entityChanges.added = new Array(entityChanges.added.length).fill(null)
                })
            })
        },
        addError: (state, lastError: string) => {
            state.errors.push(lastError)
        },
        removeError: (state, errorIndex: number) => {
            state.errors.splice(errorIndex, 1)
        },
        clearFieldsInfo: state => {
            state.fieldsInfo = {}
        },
        addFieldsInfo: (state, fieldsInfo: FieldsInfo) => {
            Object.entries(fieldsInfo).forEach(([schema, newSchema]) => {
                Object.entries(newSchema).forEach(([entity, newEntity]) => {
                    Object.entries(newEntity).forEach(([field, newInfo]) => {
                        let schemaInfo = state.fieldsInfo[schema]
                        if (schemaInfo === undefined) {
                            schemaInfo = {}
                            state.fieldsInfo[schema] = schemaInfo
                        }
                        let oldInfo = schemaInfo[entity]
                        if (oldInfo === undefined) {
                            oldInfo = {}
                            schemaInfo[entity] = oldInfo
                        }
                        oldInfo[field] = newInfo
                    })
                })
            })
        },
        updateField: (state, { schema, entity, id, field, value }: { schema: SchemaName, entity: EntityName, id: number, field: FieldName, value: any }) => {
            const entityChanges = state.current.getOrCreateChanges(schema, entity)
            let fields = entityChanges.updated[id]
            const fieldInfo = getFieldInfo(state, schema, entity, field)
            if (fields === undefined || fields === null) {
                fields = {}
                Vue.set(entityChanges.updated, String(id), fields)
                state.updatedCount += 1
                const deleted = entityChanges.deleted[id]
                if (deleted !== undefined && deleted) {
                    entityChanges.deleted[id] = false
                    state.deletedCount -= 1
                }
            }
            Vue.set(fields, field, validateValue(fieldInfo, value))
            state.touched = true
        },
        addEntry: (state, { schema, entity, position }: { schema: SchemaName, entity: EntityName, position?: number }) => {
            // During submit new entries aren't allowed to be added because this can result in duplicates.
            if (state.currentSubmit !== null) {
                return
            }

            const entityChanges = state.current.getOrCreateChanges(schema, entity)
            const schemaInfo = state.fieldsInfo[schema]
            if (schemaInfo === undefined) {
                throw new Error(`No schema info for schema ${schema}`)
            }
            const entityInfo = schemaInfo[entity]
            if (entityInfo === undefined) {
                throw new Error(`No entity info for schema ${schema}.${entity}`)
            }
            const newEntry = getEmptyCells(entityInfo)
            if (position === undefined) {
                entityChanges.added.push(newEntry)
            } else {
                entityChanges.added.splice(position, 0, newEntry)
            }
            state.addedCount += 1
            state.touched = true
        },
        setAddedField: (state, { schema, entity, newId, field, value }: { schema: SchemaName, entity: EntityName, newId: number, field: FieldName, value: any }) => {
            // During submit new entries aren't allowed to be added because this can result in duplicates.
            if (state.currentSubmit !== null) {
                return
            }

            const entityChanges = state.current.getOrCreateChanges(schema, entity)
            const fieldInfo = getFieldInfo(state, schema, entity, field)
            const added = entityChanges.added[newId]
            if (added === undefined || added === null) {
                throw new Error(`New entity id ${newId} is not found`)
            }
            Vue.set(added, field, validateValue(fieldInfo, value))
            state.touched = true
        },
        deleteEntry: (state, { schema, entity, id }: { schema: SchemaName, entity: FieldName, id: number }) => {
            const entityChanges = state.current.getOrCreateChanges(schema, entity)
            const deleted = entityChanges.deleted[id]
            if (deleted === undefined || !deleted) {
                Vue.set(entityChanges.deleted, String(id), true)
                state.deletedCount += 1
                const updated = entityChanges.updated[id]
                if (updated !== undefined && updated !== null) {
                    entityChanges.updated[id] = null
                    state.updatedCount -= 1
                }
                state.touched = true
            }
        },
        resetUpdatedEntry: (state, { schema, entity, id }: { schema: SchemaName, entity: EntityName, id: number }) => {
            const entityChanges = state.current.getOrCreateChanges(schema, entity)
            const fields = entityChanges.updated[id]
            if (fields !== undefined && fields !== null) {
                entityChanges.updated[id] = null
                state.updatedCount -= 1
            }
        },
        resetAddedEntry: (state, { schema, entity, newId }: { schema: SchemaName, entity: EntityName, newId: number }) => {
            const entityChanges = state.current.getOrCreateChanges(schema, entity)
            if (newId < entityChanges.added.length) {
                entityChanges.added[newId] = null
                state.addedCount -= 1
            }
        },
        resetDeleteEntry: (state, { schema, entity, id }: { schema: SchemaName, entity: EntityName, id: number }) => {
            const entityChanges = state.current.getOrCreateChanges(schema, entity)
            const deleted = entityChanges.deleted[id]
            if (deleted !== undefined && deleted) {
                entityChanges.deleted[id] = false
                state.deletedCount -= 1
            }
        },
    },
    actions: {
        updateField: (context, args: { schema: SchemaName, entity: EntityName, id: number, field: FieldName, value: any }) => {
            context.commit("updateField", args)
            checkCounters(context)
        },
        addEntry: (context, args: { schema: SchemaName, entity: EntityName }) => {
            context.commit("addEntry", args)
            checkCounters(context)
        },
        setAddedField: (context, args: { schema: SchemaName, entity: EntityName, newId: number, field: FieldName, value: any }) => {
            context.commit("setAddedField", args)
            checkCounters(context)
        },
        deleteEntry: (context, args: { schema: SchemaName, entity: EntityName, id: number }) => {
            context.commit("deleteEntry", args)
            checkCounters(context)
        },
        reset,
        resetUpdatedEntry: (context, args: { schema: SchemaName, entity: EntityName, id: number }) => {
            context.commit("resetUpdatedEntry", args)
            checkCounters(context)
        },
        resetAddedEntry: (context, args: { schema: SchemaName, entity: EntityName, newId: number }) => {
            context.commit("resetAddedEntry", args)
            checkCounters(context)
        },
        resetDeleteEntry: (context, args: { schema: SchemaName, entity: EntityName, id: number }) => {
            context.commit("resetDeleteEntry", args)
            checkCounters(context)
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

            const ops = Object.entries(state.current.changes).flatMap(([schemaName, entities]) => {
                return Object.entries(entities).flatMap(([entityName, entityChanges]) => {
                    try {
                        const entity = {
                            schema: schemaName,
                            name: entityName,
                        }
                        const updated =
                            Object.entries(entityChanges.updated)
                            .filter(([updatedIdStr, updatedFields]) => updatedFields !== null)
                            .map(([updatedIdStr, updatedFields]) => {
                                return {
                                    type: "update",
                                    entity,
                                    id: Number(updatedIdStr),
                                    entries: changesToParams(updatedFields as Record<FieldName, IUpdatedCell>),
                                }
                            }) as Api.TransactionOp[]
                        const added =
                            entityChanges.added
                            .filter(addedFields => addedFields !== null)
                            .map(addedFields => {
                                return {
                                    type: "insert",
                                    entity,
                                    entries: changesToParams(addedFields as Record<FieldName, IUpdatedCell>),
                                }
                            }) as Api.TransactionOp[]
                        const deleted =
                            Object.entries(entityChanges.deleted)
                            .filter(([deletedIdStr, isDeleted]) => isDeleted)
                            .map(([deletedIdStr, _]) => {
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
                        console.log("Error while commiting", e)
                        // Ignore errors; they've been already handled for userView
                    }
                }

                commit("finishSubmit")
                if (failed === null) {
                    if (state.touched) {
                        commit("clearAdded")
                    } else {
                        reset(context)
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

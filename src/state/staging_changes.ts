import Vue from "vue"
import { Module, ActionContext } from "vuex"

import { SchemaName, FieldName, EntityName } from "@/api"
import * as Api from "@/api"
import { UserViewResult } from "@/state/user_view"

export interface IEntityChanges {
    // Actual key is RowId
    updated: Record<string, Record<FieldName, any> | null>
    added: Array<Record<FieldName, any>>
    deleted: Record<string, boolean>
}

export type ChangesMap = Record<SchemaName, Record<EntityName, IEntityChanges>>

export interface IStagingState {
    changes: ChangesMap
    addedCount: number
    updatedCount: number
    deletedCount: number
    // Current submit promise
    currentSubmit: Promise<void> | null
    // Set if changes were made during the submit to decide how to clear.
    // We allow updating and removing entries while submit is ongoing, but not adding new ones to prevent duplicate inserts.
    touched: boolean
    // FIXME: instead set errors for each change -- this requires transactions and per-change errors support in FunDB.
    lastError: string | null
    autoSaveTimeoutId: number | null
}

const autoSaveTimeout = 3000

const getEntityChanges = (changes: ChangesMap, schemaName: string, entityName: string): IEntityChanges => {
    let entities = changes[schemaName]
    if (entities === undefined) {
        entities = {}
        Vue.set(changes, schemaName, entities)
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

const askOnClose = (e: BeforeUnloadEvent) => {
    e.preventDefault()
    e.returnValue = ""
}

const stopAutoSave = ({ state, commit }: ActionContext<IStagingState, {}>) => {
    if (state.autoSaveTimeoutId !== null) {
        window.removeEventListener("beforeunload", askOnClose)
        clearTimeout(state.autoSaveTimeoutId)
        commit("clearAutoSave")
    }
}

const startAutoSave = (context: ActionContext<IStagingState, {}>) => {
    const { commit, dispatch } = context
    stopAutoSave(context)

    const timeoutId = setTimeout(() => {
        dispatch("submit")
    }, autoSaveTimeout)
    window.addEventListener("beforeunload", askOnClose)
    commit("setAutoSave", timeoutId)
}

const reset = (context: ActionContext<IStagingState, {}>) => {
    const { commit } = context
    commit("clear")
    stopAutoSave(context)
}

const checkCounters = (context: ActionContext<IStagingState, {}>) => {
    const { state, commit } = context
    if (state.updatedCount === 0 && state.addedCount === 0 && state.deletedCount === 0) {
        reset(context)
    } else if (state.addedCount === 0 && state.currentSubmit === null) {
        startAutoSave(context)
    } else {
        stopAutoSave(context)
    }
}

const updateEntry = ({ dispatch }: ActionContext<IStagingState, {}>, schemaName: string, entityName: string, id: number, changes: Record<string, any>) => {
    const updatedFields = Object.keys(changes).map(name => {
        const value = changes[name]
        return [ name, value === null ? "\0" : String(value) ]
    })

    return dispatch("callProtectedApi", {
        func: Api.updateEntry,
        args: [{ schema: schemaName, name: entityName }, id, new URLSearchParams(updatedFields)],
    }, { root: true })
}

const addEntry = ({ dispatch }: ActionContext<IStagingState, {}>, schemaName: string, entityName: string, values: Record<string, any>) => {
    const addedFields = Object.keys(values).map(name => {
        const value = values[name]
        return [ name, value === null ? "\0" : String(value) ]
    })

    return dispatch("callProtectedApi", {
        func: Api.insertEntry,
        args: [{ schema: schemaName, name: entityName }, new URLSearchParams(addedFields)],
    }, { root: true })
}

const deleteEntry = ({ dispatch }: ActionContext<IStagingState, {}>, schemaName: string, entityName: string, id: number) => {
    return dispatch("callProtectedApi", {
        func: Api.deleteEntry,
        args: [{ schema: schemaName, name: entityName }, id],
    }, { root: true })
}

const stagingModule: Module<IStagingState, {}> = {
    namespaced: true,
    state: {
        changes: {},
        addedCount: 0,
        updatedCount: 0,
        deletedCount: 0,
        currentSubmit: null,
        touched: false,
        lastError: null,
        autoSaveTimeoutId: null,
    },
    getters: {
        isEmpty: state => Object.keys(state.changes).length === 0,
        forUserView: state => (uv: UserViewResult): IEntityChanges => {
            const emptyUpdates = {
                removed: {},
                updated: {},
                added: [],
                deleted: {},
            }
            const entity = uv.info.updateEntity
            if (entity === null) {
                return emptyUpdates
            }
            const entities = state.changes[entity.schema]
            if (entities === undefined) {
                return emptyUpdates
            }
            const changes = entities[entity.name]
            if (changes === undefined) {
                return emptyUpdates
            }
            return changes
        },
    },
    mutations: {
        clear: store => {
            store.changes = {}
            store.addedCount = 0
            store.updatedCount = 0
            store.deletedCount = 0
            store.touched = false
        },
        setAutoSave: (store, timeoutId) => {
            store.autoSaveTimeoutId = timeoutId
        },
        clearAutoSave: store => {
            store.autoSaveTimeoutId = null
        },
        startSubmit: (store, submit: Promise<void>) => {
            store.touched = false
            store.currentSubmit = submit
        },
        finishSubmit: store => {
            store.currentSubmit = null
        },
        clearAdded: store => {
            Object.keys(store.changes).forEach(schemaName => {
                const entities = store.changes[schemaName]
                Object.keys(entities).forEach(entityName => {
                    const entityChanges = entities[entityName]
                    entityChanges.added = []
                })
            })
        },
        setError: (store, lastError: string) => {
            store.lastError = lastError
        },
        clearError: store => {
            store.lastError = null
        },
        updateField: (store, { schema, entity, id, field, value }: { schema: string, entity: string, id: number, field: string, value: any }) => {
            const entityChanges = getEntityChanges(store.changes, schema, entity)
            let fields = entityChanges.updated[id]
            if (fields === undefined || fields === null) {
                fields = {}
                Vue.set(entityChanges.updated, String(id), fields)
                store.updatedCount += 1
                const deleted = entityChanges.deleted[id]
                if (deleted !== undefined && deleted) {
                    entityChanges.deleted[id] = false
                    store.deletedCount -= 1
                }
            }
            Vue.set(fields, field, value)
            store.touched = true
        },
        setAddedField: (store, { schema, entity, newId, field, value }: { schema: string, entity: string, newId: number, field: string, value: any }) => {
            if (store.currentSubmit !== null) {
                return
            }

            const entityChanges = getEntityChanges(store.changes, schema, entity)
            for (let i = entityChanges.added.length; i <= newId; i++) {
                entityChanges.added[i] = {}
                store.addedCount += 1
            }
            Vue.set(entityChanges.added[newId], field, value)
            store.touched = true
        },
        deleteEntry: (store, { schema, entity, id }: { schema: string, entity: string, id: number }) => {
            const entityChanges = getEntityChanges(store.changes, schema, entity)
            const deleted = entityChanges.deleted[id]
            if (deleted === undefined || !deleted) {
                Vue.set(entityChanges.deleted, String(id), true)
                store.deletedCount += 1
                const updated = entityChanges.updated[id]
                if (updated !== undefined && updated !== null) {
                    entityChanges.updated[id] = null
                    store.updatedCount -= 1
                }
                store.touched = true
            }
        },
        resetUpdatedEntry: (store, { schema, entity, id }: { schema: string, entity: string, id: number }) => {
            const entityChanges = getEntityChanges(store.changes, schema, entity)
            const fields = entityChanges.updated[id]
            if (fields !== undefined && fields !== null) {
                entityChanges.updated[id] = null
                store.updatedCount -= 1
            }
        },
        resetAddedEntry: (store, { schema, entity, newId }: { schema: string, entity: string, newId: number }) => {
            const entityChanges = getEntityChanges(store.changes, schema, entity)
            if (newId < entityChanges.added.length) {
                entityChanges.added.splice(newId, 1)
                store.addedCount -= 1
            }
        },
        resetDeleteEntry: (store, { schema, entity, id }: { schema: string, entity: string, id: number }) => {
            const entityChanges = getEntityChanges(store.changes, schema, entity)
            const deleted = entityChanges.deleted[id]
            if (deleted !== undefined && deleted) {
                entityChanges.deleted[id] = false
                store.deletedCount -= 1
            }
        },
    },
    actions: {
        updateField: (context, args: { schema: string, entity: string, id: number, field: string, value: any }) => {
            context.commit("updateField", args)
            checkCounters(context)
        },
        setAddedField: (context, args: { schema: string, entity: string, newId: number, field: string, value: any }) => {
            context.commit("setAddedField", args)
            checkCounters(context)
        },
        deleteEntry: (context, args: { schema: string, entity: string, id: number }) => {
            context.commit("deleteEntry", args)
            checkCounters(context)
        },
        reset,
        resetUpdatedEntry: (context, args: { schema: string, entity: string, id: number }) => {
            context.commit("resetUpdatedEntry", args)
            checkCounters(context)
        },
        resetAddedEntry: (context, args: { schema: string, entity: string, newId: number }) => {
            context.commit("resetAddedEntry", args)
            checkCounters(context)
        },
        resetDeleteEntry: (context, args: { schema: string, entity: string, id: number }) => {
            context.commit("resetDeleteEntry", args)
            checkCounters(context)
        },
        submit: (context): Promise<void> => {
            const { state, commit, dispatch } = context
            if (state.currentSubmit !== null) {
                return state.currentSubmit
            }

            const results: Array<Promise<any>> = []
            Object.keys(state.changes).forEach(schemaName => {
                const entities = state.changes[schemaName]
                Object.keys(entities).forEach(entityName => {
                    const entityChanges = entities[entityName]
                    Object.keys(entityChanges.updated).forEach(updatedIdStr => {
                        const updatedId = Number(updatedIdStr)
                        const updatedFields = entityChanges.updated[updatedId]
                        if (updatedFields !== null) {
                            results.push(updateEntry(context, schemaName, entityName, updatedId, updatedFields))
                        }
                    })
                    entityChanges.added.forEach(addedFields => {
                        results.push(addEntry(context, schemaName, entityName, addedFields))
                    })
                    Object.keys(entityChanges.deleted).forEach(deletedIdStr => {
                        const deletedId = Number(deletedIdStr)
                        if (entityChanges.deleted[deletedId]) {
                            results.push(deleteEntry(context, schemaName, entityName, deletedId))
                        }
                    })
                })
            })

            const errors: Error[] = []
            let oneChange = false
            const protectedResults = results.map(res => res.then(r => {
                oneChange = true
                return r
            }).catch(e => {
                errors.push(e)
            }))

            commit("startSubmit", ((async () => {
                await Promise.all(protectedResults)

                if (oneChange) {
                    try {
                        await dispatch("userView/forceReload", undefined, { root: true })
                    } catch (e) {
                        // Ignore errors; they've been already handled for userView
                    }
                }
                if (errors.length === 0) {
                    if (state.touched) {
                        commit("clearAdded")
                    } else {
                        reset(context)
                    }
                    commit("clearError")
                } else {
                    commit("setError", errors[0].message)
                }
                commit("finishSubmit")
            })()))
            return state.currentSubmit as any
        },
    },
}

export default stagingModule

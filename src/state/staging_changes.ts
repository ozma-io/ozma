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

export class CurrentChanges {
    changes: Record<SchemaName, Record<EntityName, IEntityChanges>> = {}

    get isEmpty() {
        return Object.entries(this.changes).length === 0
    }

    getEntityChanges(schemaName: string, entityName: string): IEntityChanges {
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

    getForUserView(uv: UserViewResult): IEntityChanges {
        const emptyUpdates: IEntityChanges = {
            updated: {},
            added: [],
            deleted: {},
        }
        const entity = uv.info.updateEntity
        if (entity === null) {
            return emptyUpdates
        }
        const entities = this.changes[entity.schema]
        if (entities === undefined) {
            return emptyUpdates
        }
        const changes = entities[entity.name]
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
    autoSaveTimeoutId: number | null
}

const autoSaveTimeout = 3000

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
    const updatedFields = Object.entries(changes).map(([name, value]) => {
        return [ name, value === null ? "\0" : String(value) ]
    })

    return dispatch("callProtectedApi", {
        func: Api.updateEntry,
        args: [{ schema: schemaName, name: entityName }, id, new URLSearchParams(updatedFields)],
    }, { root: true })
}

const addEntry = ({ dispatch }: ActionContext<IStagingState, {}>, schemaName: string, entityName: string, values: Record<string, any>) => {
    const addedFields = Object.entries(values).map(([name, value]) => {
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
        current: new CurrentChanges(),
        addedCount: 0,
        updatedCount: 0,
        deletedCount: 0,
        currentSubmit: null,
        touched: false,
        errors: [],
        autoSaveTimeoutId: null,
    },
    mutations: {
        clear: state => {
            state.current = new CurrentChanges()
            state.addedCount = 0
            state.updatedCount = 0
            state.deletedCount = 0
            state.touched = false
        },
        setAutoSave: (state, timeoutId) => {
            state.autoSaveTimeoutId = timeoutId
        },
        clearAutoSave: state => {
            state.autoSaveTimeoutId = null
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
                    entityChanges.added = []
                })
            })
        },
        addError: (state, lastError: string) => {
            state.errors.push(lastError)
        },
        removeError: (state, errorIndex: number) => {
            state.errors.splice(errorIndex, 1)
        },
        updateField: (state, { schema, entity, id, field, value }: { schema: string, entity: string, id: number, field: string, value: any }) => {
            const entityChanges = state.current.getEntityChanges(schema, entity)
            let fields = entityChanges.updated[id]
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
            Vue.set(fields, field, value)
            state.touched = true
        },
        setAddedField: (state, { schema, entity, newId, field, value }: { schema: string, entity: string, newId: number, field: string, value: any }) => {
            if (state.currentSubmit !== null) {
                return
            }

            const entityChanges = state.current.getEntityChanges(schema, entity)
            for (let i = entityChanges.added.length; i <= newId; i++) {
                entityChanges.added.push({})
                state.addedCount += 1
            }
            Vue.set(entityChanges.added[newId], field, value)
            state.touched = true
        },
        deleteEntry: (state, { schema, entity, id }: { schema: string, entity: string, id: number }) => {
            const entityChanges = state.current.getEntityChanges(schema, entity)
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
        resetUpdatedEntry: (state, { schema, entity, id }: { schema: string, entity: string, id: number }) => {
            const entityChanges = state.current.getEntityChanges(schema, entity)
            const fields = entityChanges.updated[id]
            if (fields !== undefined && fields !== null) {
                entityChanges.updated[id] = null
                state.updatedCount -= 1
            }
        },
        resetAddedEntry: (state, { schema, entity, newId }: { schema: string, entity: string, newId: number }) => {
            const entityChanges = state.current.getEntityChanges(schema, entity)
            if (newId < entityChanges.added.length) {
                entityChanges.added.splice(newId, 1)
                state.addedCount -= 1
            }
        },
        resetDeleteEntry: (state, { schema, entity, id }: { schema: string, entity: string, id: number }) => {
            const entityChanges = state.current.getEntityChanges(schema, entity)
            const deleted = entityChanges.deleted[id]
            if (deleted !== undefined && deleted) {
                entityChanges.deleted[id] = false
                state.deletedCount -= 1
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
        submit: context => {
            const { state, commit, dispatch } = context
            if (state.currentSubmit !== null) {
                return state.currentSubmit
            }

            const results: Array<Promise<any>> = []
            Object.entries(state.current.changes).forEach(([schemaName, entities]) => {
                Object.entries(entities).forEach(([entityName, entityChanges]) => {
                    Object.entries(entityChanges.updated).forEach(([updatedIdStr, updatedFields]) => {
                        if (updatedFields !== null) {
                            const updatedId = Number(updatedIdStr)
                            results.push(updateEntry(context, schemaName, entityName, updatedId, updatedFields))
                        }
                    })
                    entityChanges.added.forEach(addedFields => {
                        results.push(addEntry(context, schemaName, entityName, addedFields))
                    })
                    Object.entries(entityChanges.deleted).forEach(([deletedIdStr, isDeleted]) => {
                        if (isDeleted) {
                            const deletedId = Number(deletedIdStr)
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

            commit("startSubmit", (async () => {
                await Promise.all(protectedResults)

                if (oneChange) {
                    try {
                        await dispatch("userView/reload", undefined, { root: true })
                    } catch (e) {
                        // Ignore errors; they've been already handled for userView
                    }
                }
                commit("finishSubmit")
                if (errors.length === 0) {
                    if (state.touched) {
                        commit("clearAdded")
                    } else {
                        reset(context)
                    }
                } else {
                    for (const error of errors) {
                        commit("addError", error.message)
                    }
                    throw errors[0]
                }
            })())
        },
    },
}

export default stagingModule

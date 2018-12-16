import { Module, VuexModule, Mutation, Action } from "vuex-module-decorators"

import { SchemaName, FieldName, EntityName } from "@/api"
import * as Api from "@/api"
import * as Store from "@/state/store"
import { UserViewResult } from "@/state/user_view"
import Vue from "vue"

export interface IEntityChanges {
    // Actual key is RowId
    updated: Record<string, Record<FieldName, any> | null>
    added: Array<Record<FieldName, any>>
    deleted: Record<string, boolean>
}

export type ChangesMap = Record<SchemaName, Record<EntityName, IEntityChanges>>

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

const updateEntry = (schemaName: string, entityName: string, id: number, changes: Record<string, any>) => {
    const updatedFields = Object.keys(changes).map(name => {
        const value = changes[name]
        return [ name, value === null ? "\0" : String(value) ]
    })

    return Store.callSecretApi(Api.updateEntry, { schema: schemaName, name: entityName }, id, new URLSearchParams(updatedFields))
}

const addEntry = (schemaName: string, entityName: string, values: Record<string, any>) => {
    const addedFields = Object.keys(values).map(name => {
        const value = values[name]
        return [ name, value === null ? "\0" : String(value) ]
    })

    return Store.callSecretApi(Api.insertEntry, { schema: schemaName, name: entityName }, new URLSearchParams(addedFields))
}

const deleteEntry = (schemaName: string, entityName: string, id: number) => {
    return Store.callSecretApi(Api.deleteEntry, { schema: schemaName, name: entityName }, id)
}

const autoSaveTimeout = 3000

const askOnClose = (e: BeforeUnloadEvent) => {
    e.preventDefault()
    e.returnValue = ""
}

const stopAutoSave = (store: StagingChangesState) => {
    if (store.autoSaveTimeoutId !== null) {
        window.removeEventListener("beforeunload", askOnClose)
        clearTimeout(store.autoSaveTimeoutId)
        store.autoSaveTimeoutId = null
    }
}

const startAutoSave = (store: StagingChangesState) => {
    stopAutoSave(store)
    store.autoSaveTimeoutId = setTimeout(() => {
        Store.store.dispatch("staging/submit")
    }, autoSaveTimeout)
    window.addEventListener("beforeunload", askOnClose)
}

const clear = (store: StagingChangesState, lastError?: string) => {
    stopAutoSave(store)
    store.changes = {}
    store.addedCount = 0
    store.updatedCount = 0
    store.deletedCount = 0
    store.touched = false
    if (lastError !== undefined) {
        store.lastError = lastError
    } else {
        store.lastError = null
    }
}

const checkCounters = (store: StagingChangesState) => {
    if (store.updatedCount === 0 && store.addedCount === 0 && store.deletedCount === 0) {
        clear(store)
    } else if (store.addedCount === 0 && store.currentSubmit === null) {
        startAutoSave(store)
    } else {
        stopAutoSave(store)
    }
}

@Module({ namespaced: true, dynamic: true, store: Store.store, name: "staging" })
export default class StagingChangesState extends VuexModule {
    changes: ChangesMap = {}
    addedCount: number = 0
    updatedCount: number = 0
    deletedCount: number = 0
    // Current submit promise
    currentSubmit: Promise<void> | null = null
    // Set if changes were made during the submit to decide how to clear.
    // We allow updating and removing entries while submit is ongoing, but not adding new ones to prevent duplicate inserts.
    touched: boolean = false
    // FIXME: instead set errors for each change -- this requires transactions and per-change errors support in FunDB.
    lastError: string | null = null
    autoSaveTimeoutId: number | null = null

    @Mutation
    removeAuth(lastError?: string) {
        // Don't clear staging changes on logout -- we can log in again and submit them.
    }

    @Mutation
    clear() {
        clear(this)
    }

    @Mutation
    startSubmit(submit: Promise<void>) {
        this.touched = false
        this.currentSubmit = submit
    }

    @Mutation
    finishSubmit() {
        this.currentSubmit = null
    }

    @Mutation
    clearAdded() {
        Object.keys(this.changes).forEach(schemaName => {
            const entities = this.changes[schemaName]
            Object.keys(entities).forEach(entityName => {
                const entityChanges = entities[entityName]
                entityChanges.added = []
            })
        })
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
    updateField({ schema, entity, id, field, value }: { schema: string, entity: string, id: number, field: string, value: any }) {
        const entityChanges = getEntityChanges(this.changes, schema, entity)
        let fields = entityChanges.updated[id]
        if (fields === undefined || fields === null) {
            fields = {}
            Vue.set(entityChanges.updated, String(id), fields)
            this.updatedCount += 1
            const deleted = entityChanges.deleted[id]
            if (deleted !== undefined && deleted) {
                entityChanges.deleted[id] = false
                this.deletedCount -= 1
            }
        }
        Vue.set(fields, field, value)
        this.touched = true
        checkCounters(this)
    }

    @Mutation
    setAddedField({ schema, entity, newId, field, value }: { schema: string, entity: string, newId: number, field: string, value: any }) {
        if (this.currentSubmit !== null) {
            return
        }

        const entityChanges = getEntityChanges(this.changes, schema, entity)
        for (let i = entityChanges.added.length; i <= newId; i++) {
            entityChanges.added[i] = {}
            this.addedCount += 1
        }
        Vue.set(entityChanges.added[newId], field, value)
        this.touched = true
        checkCounters(this)
    }

    @Mutation
    deleteEntry({ schema, entity, id }: { schema: string, entity: string, id: number }) {
        const entityChanges = getEntityChanges(this.changes, schema, entity)
        const deleted = entityChanges.deleted[id]
        if (deleted === undefined || !deleted) {
            Vue.set(entityChanges.deleted, String(id), true)
            this.deletedCount += 1
            const updated = entityChanges.updated[id]
            if (updated !== undefined && updated !== null) {
                entityChanges.updated[id] = null
                this.updatedCount -= 1
            }
            this.touched = true
        }
        checkCounters(this)
    }

    @Mutation
    resetUpdatedEntry({ schema, entity, id }: { schema: string, entity: string, id: number }) {
        const entityChanges = getEntityChanges(this.changes, schema, entity)
        const fields = entityChanges.updated[id]
        if (fields !== undefined && fields !== null) {
            entityChanges.updated[id] = null
            this.updatedCount -= 1
        }
        checkCounters(this)
    }

    @Mutation
    resetAddedEntry({ schema, entity, newId }: { schema: string, entity: string, newId: number }) {
        const entityChanges = getEntityChanges(this.changes, schema, entity)
        if (newId < entityChanges.added.length) {
            entityChanges.added.splice(newId, 1)
            this.addedCount -= 1
        }
        checkCounters(this)
    }

    @Mutation
    resetDeleteEntry({ schema, entity, id }: { schema: string, entity: string, id: number }) {
        const entityChanges = getEntityChanges(this.changes, schema, entity)
        const deleted = entityChanges.deleted[id]
        if (deleted !== undefined && deleted) {
            entityChanges.deleted[id] = false
            this.deletedCount -= 1
        }
        checkCounters(this)
    }

    get isEmpty() {
        return Object.keys(this.changes).length === 0
    }

    get forUserView() {
        return (uv: UserViewResult): IEntityChanges => {
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

    @Action
    submit(): Promise<void> {
        if (this.currentSubmit !== null) {
            return this.currentSubmit
        }

        const results: Array<Promise<any>> = []
        Object.keys(this.changes).forEach(schemaName => {
            const entities = this.changes[schemaName]
            Object.keys(entities).forEach(entityName => {
                const entityChanges = entities[entityName]
                Object.keys(entityChanges.updated).forEach(updatedIdStr => {
                    const updatedId = Number(updatedIdStr)
                    const updatedFields = entityChanges.updated[updatedId]
                    if (updatedFields !== null) {
                        results.push(updateEntry(schemaName, entityName, updatedId, updatedFields))
                    }
                })
                entityChanges.added.forEach(addedFields => {
                    results.push(addEntry(schemaName, entityName, addedFields))
                })
                Object.keys(entityChanges.deleted).forEach(deletedIdStr => {
                    const deletedId = Number(deletedIdStr)
                    if (entityChanges.deleted[deletedId]) {
                        results.push(deleteEntry(schemaName, entityName, deletedId))
                    }
                })
            })
        })

        this.startSubmit((async () => {
            let success = false
            try {
                await Promise.all(results)
                success = true
            } catch (e) {
                this.setError(e.message)
            }
            try {
                await this.context.dispatch("userView/forceReload", undefined, { root: true })
            } catch (e) {
                // Ignore errors; they've been already handled for userView
            }
            if (success) {
                if (this.touched) {
                    this.clearAdded()
                } else {
                    this.clear()
                }
            }
            this.finishSubmit()
        })())
        return this.currentSubmit as any
    }
}

import { Module, VuexModule, Mutation, Action } from "vuex-module-decorators"

import { SchemaName, FieldName, EntityName } from "@/api"
import * as Api from "@/api"
import * as Store from "@/state/store"
import { UserViewResult } from "@/state/user_view"
import Vue from "vue"

export interface IEntityChanges {
    // Actual key is RowId
    updated: Record<string, Record<FieldName, any>>
    // We don't allow to add more than one entry at once.
    added: Record<FieldName, any> | null
}

export type ChangesMap = Record<SchemaName, Record<EntityName, IEntityChanges>>

const getEntity = (changes: ChangesMap, schemaName: string, entityName: string): IEntityChanges => {
    let entities = changes[schemaName]
    if (entities === undefined) {
        entities = {}
        Vue.set(changes, schemaName, entities)
    }

    let entity = entities[entityName]
    if (entity === undefined) {
        entity = {
            updated: {},
            added: null,
        }
        Vue.set(entities, entityName, entity)
    }

    return entity
}

const updateEntity = (schemaName: string, entityName: string, id: number, changes: Record<string, any>) => {
    const updatedFields = Object.keys(changes).map(name => {
        const value = changes[name]
        return [ name, value === null ? "\0" : String(value) ]
    })

    return Store.callSecretApi(Api.updateEntity, { schema: schemaName, name: entityName }, id, new URLSearchParams(updatedFields))
}

const addEntity = (schemaName: string, entityName: string, values: Record<string, any>) => {
    const addedFields = Object.keys(values).map(name => {
        const value = values[name]
        return [ name, value === null ? "\0" : String(value) ]
    })

    return Store.callSecretApi(Api.insertEntity, { schema: schemaName, name: entityName }, new URLSearchParams(addedFields))
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

const removeAuth = (store: StagingChangesState, lastError?: string) => {
    stopAutoSave(store)
    store.changes = {}
    if (lastError !== undefined) {
        store.lastError = lastError
    } else {
        store.lastError = null
    }
}

@Module({ namespaced: true, dynamic: true, store: Store.store, name: "staging" })
export default class StagingChangesState extends VuexModule {
    changes: ChangesMap = {}
    // FIXME: instead set errors for each change -- this requires transactions and per-change errors support in FunDB.
    lastError: string | null = null
    autoSaveTimeoutId: number | null = null

    @Mutation
    removeAuth(lastError?: string) {
        removeAuth(this, lastError)
    }

    @Mutation
    clear() {
        removeAuth(this)
    }

    @Mutation
    failPerform(lastError: string) {
        this.lastError = lastError
    }

    @Mutation
    clearError() {
        this.lastError = null
    }

    @Mutation
    startAutoSave() {
        startAutoSave(this)
    }

    @Mutation
    stopAutoSave() {
        stopAutoSave(this)
    }

    @Mutation
    updateField({ schema, entity, id, field, value }: { schema: string, entity: string, id: number, field: string, value: any }) {
        const entry = getEntity(this.changes, schema, entity)
        let fields = entry.updated[id]
        if (fields === undefined) {
            fields = {}
            Vue.set(entry.updated, String(id), fields)
        }
        Vue.set(fields, field, value)
        startAutoSave(this)
    }

    @Mutation
    setNewField({ schema, entity, field, value }: { schema: string, entity: string, field: string, value: any }) {
        const entry = getEntity(this.changes, schema, entity)
        if (entry.added === null) {
            entry.added = {}
        }
        Vue.set(entry.added, field, value)
        startAutoSave(this)
    }

    @Mutation
    resetNewRow({ schema, entity }: { schema: string, entity: string }) {
        const entry = getEntity(this.changes, schema, entity)
        entry.added = null
    }

    get isEmpty() {
        return Object.keys(this.changes).length === 0
    }

    get forUserView() {
        return (uv: UserViewResult) => {
            const emptyUpdates = {
                removed: {},
                updated: {},
                added: null,
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
        const results: Array<Promise<any>> = []
        Object.keys(this.changes).forEach(schemaName => {
            const entities = this.changes[schemaName]
            Object.keys(entities).forEach(entityName => {
                const entityChanges = entities[entityName]
                Object.keys(entityChanges.updated).forEach(updatedIdStr => {
                    const updatedId = Number(updatedIdStr)
                    const updatedFields = entityChanges.updated[updatedId]
                    results.push(updateEntity(schemaName, entityName, updatedId, updatedFields))
                })
                if (entityChanges.added !== null) {
                    results.push(addEntity(schemaName, entityName, entityChanges.added))
                }
            })
        })

        return (async () => {
            try {
                await Promise.all(results)
                await this.context.dispatch("userView/reload", undefined, { root: true })
                this.clear()
            } catch (e) {
                this.failPerform(e.message)
            }
        })()
    }
}

/*
        saveTimeout: number | null = null
        isSaved = true
        closeHandler: any

        constructor() {
            super()
            this.closeHandler = () => {
                if (!isSaved) {
                    return this.$tc("confirm_close")
                } else {
                    return null
                }
            }
        }

        mounted() {
            addEventListener("beforeunload", this.closeHandler)
        }
*/

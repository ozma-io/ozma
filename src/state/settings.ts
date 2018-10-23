import { Module, VuexModule, Mutation, Action } from "vuex-module-decorators"

import * as Api from "../api"
import * as Store from "./store"

export class CurrentSettings {
    settings: Map<string, string>

    constructor(settings: Map<string, string>) {
        this.settings = settings
    }
}

@Module({ namespaced: true, dynamic: true, store: Store.store, name: "mainMenu" })
export default class SettingsState extends VuexModule {
    current: CurrentSettings | null = null
    lastError: string | null = null

    @Mutation
    removeAuth(lastError?: string) {
        this.current = null
        if (lastError !== undefined) {
            this.lastError = lastError
        }
    }

    @Mutation
    failGet(lastError: string) {
        this.lastError = lastError
    }

    @Mutation
    clearError() {
        this.lastError = null
    }

    @Mutation
    setCurrent(settings: CurrentSettings) {
        this.current = settings
        this.lastError = null
    }

    @Action
    async getSettings(): Promise<void> {
        try {
            const res: Api.IViewExprResult = await Store.callSecretApi(Api.fetchAnonymousView, "SELECT \"Name\", \"Value\" FROM funapp.\"Settings\"", new URLSearchParams())
            const categories = res.result.rows.reduce((currSettings, row) => {
                const key = row.values[0].value
                const value = row.values[1].value
                currSettings.set(key, value)
                return currSettings
            }, new Map<string, string>())
            const settings = new CurrentSettings(categories)
            this.setCurrent(settings)
        } catch (e) {
            this.failGet(e.message)
            throw e
        }
    }
}

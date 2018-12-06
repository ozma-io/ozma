import { Module as Mod } from "vuex"
import { Module, VuexModule, Mutation, Action } from "vuex-module-decorators"

import * as Api from "@/api"
import * as Store from "@/state/store"

export class CurrentSettings {
    settings: Record<string, string>

    constructor(settings: Record<string, string>) {
        this.settings = settings
    }
}

@Module({ namespaced: true, dynamic: true, store: Store.store, name: "settings" })
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
        this.current = null
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

    get entry() {
        return (name: string, defValue: string): string => {
            if (this.current === null) {
                return defValue
            } else {
                const ret = this.current.settings[name]
                return (ret === undefined) ? defValue : ret
            }
        }
    }

    @Action
    async getSettings(): Promise<void> {
        try {
            const res: Api.IViewExprResult = await Store.callSecretApi(Api.fetchAnonymousView, "SELECT \"Name\", \"Value\" FROM funapp.\"Settings\"", new URLSearchParams())
            const values = res.result.rows.reduce((currSettings: Record<string, string>, row) => {
                const key = row.values[0].value
                const value = row.values[1].value
                currSettings[key] = value
                return currSettings
            }, {})
            const settings = new CurrentSettings(values)
            this.setCurrent(settings)
        } catch (e) {
            this.failGet(e.message)
            throw e
        }
    }
}

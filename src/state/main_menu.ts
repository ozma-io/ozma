import { Module, VuexModule, Mutation, Action } from "vuex-module-decorators"

import * as Api from "../api"
import * as Store from "./store"

export interface IMainMenuButton {
    name: string
    userViewId: number
}

export interface IMainMenuCategory {
    name: string
    buttons: IMainMenuButton[]
}

export class CurrentMainMenu {
    categories: IMainMenuCategory[]

    constructor(categories: IMainMenuCategory[]) {
        this.categories = categories
    }
}

@Module({ namespaced: true, dynamic: true, store: Store.store, name: "mainMenu" })
export default class MainMenuState extends VuexModule {
    current: CurrentMainMenu | null = null
    lastError: string | null = null

    @Mutation
    removeAuth(lastError?: string) {
        this.current = null
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
    setCurrent(mainMenu: CurrentMainMenu) {
        this.current = mainMenu
        this.lastError = null
    }

    @Action
    async getMenu(): Promise<void> {
        try {
            const res: Api.IViewExprResult = await Store.callSecretApi(Api.fetchAnonymousView, "SELECT \"CategoryId\", \"UserViewId\" FROM funapp.\"MainMenuButtons\" ORDER BY \"CategoryId\", \"OrdinalPosition\"", new URLSearchParams())
            const categories = res.result.rows.reduce((currCategories, row) => {
                const category = row.values[0]
                // FIXME FIXME FIXME
                if (category.pun === "System" && this.context.rootState.auth.current.header.sub !== "root") {
                    return currCategories
                }
                const userView = row.values[1]
                const button = {
                    name: userView.pun,
                    userViewId: userView.value,
                }

                const existing = currCategories.get(category.value)
                if (existing === undefined) {
                    currCategories.set(category.value, {
                        name: category.pun,
                        buttons: [button],
                    })
                } else {
                    existing.buttons.push(button)
                }

                return currCategories
            }, new Map<number, IMainMenuCategory>())
            const mainMenu = new CurrentMainMenu(Array.from(categories.values()))
            this.setCurrent(mainMenu)
        } catch (e) {
            this.setError(e.message)
            throw e
        }
    }
}

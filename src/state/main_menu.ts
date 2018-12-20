import { Module } from "vuex"

import * as Api from "@/api"

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

export interface IMainMenuState {
    current: CurrentMainMenu | null
    lastError: string | null
}

export const mainMenuModule: Module<IMainMenuState, {}> = {
    namespaced: true,
    state: {
        current: null,
        lastError: null,
    },
    mutations: {
        setError: (state, lastError: string) => {
            state.lastError = lastError
        },
        clearError: state => {
            state.lastError = null
        },
        setMenu: (state, mainMenu: CurrentMainMenu) => {
            state.current = mainMenu
            state.lastError = null
        },
        clearMenu: state => {
            state.current = null
        },
    },
    actions: {
        removeAuth: {
            root: true,
            handler: ({ commit }) => {
                commit("clearMenu")
            },
        },
        getMenu: async ({ rootState, commit, dispatch }) => {
            try {
                const select = "SELECT \"CategoryId\", \"UserViewId\" FROM funapp.\"MainMenuButtons\" ORDER BY \"CategoryId\", \"OrdinalPosition\""
                const res: Api.IViewExprResult = await dispatch("callProtectedApi", {
                    func: Api.fetchAnonymousView,
                    args: [select, new URLSearchParams()],
                }, { root: true })
                const categories = res.result.rows.reduce((currCategories, row) => {
                    const category = row.values[0]
                    // FIXME FIXME FIXME
                    if (category.pun === "System" && (rootState as any).auth.current.header.sub !== "root") {
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
                commit("setMenu", mainMenu)
            } catch (e) {
                commit("setError", e.message)
                throw e
            }
        },
    },
}

export default mainMenuModule

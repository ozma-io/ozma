import Vue from "vue"
import Vuex from "vuex"

import * as Utils from "@/utils"
import AuthState from "@/state/auth"
import MainMenuState from "@/state/main_menu"
import SettingsState from "@/state/settings"
import UserViewState from "@/state/user_view"

interface IRootState {
    auth: AuthState
    mainMenu: MainMenuState
    userView: UserViewState
    settings: SettingsState
}

Vue.use(Vuex)

export const store = new Vuex.Store<IRootState>({
    strict: !Utils.isProduction,
})

const recurseRemoveAuth = (rootState: any, message: string): void => {
    for (const key of rootState.modules) {
        const state = rootState.modules[key]
        state.commit("removeAuth", message)
        recurseRemoveAuth(state, message)
    }
}

export const callSecretApi = async (apiFunc: ((_1: string, ..._2: any[]) => Promise<any>), ...args: any[]): Promise<any> => {
    if (store.state.auth.current === null) {
        throw new Error("No authentication token to renew")
    }

    try {
        return await apiFunc(store.state.auth.current.token, ...args)
    } catch (e) {
        if (e instanceof Utils.FetchError) {
            if (e.response.status === 401) {
                recurseRemoveAuth(store.state, e.message)
            }
        }
        throw e
    }
}

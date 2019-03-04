import Vue from "vue"
import Vuex from "vuex"
import BootstrapVue from "bootstrap-vue"

import * as Utils from "@/utils"
import * as Modules from "@/modules"

import UserView from "@/components/UserView.vue"
import ActionsMenu from "@/components/ActionsMenu.vue"
import App from "@/App.vue"

import authModule from "@/state/auth"
import settingsModule from "@/state/settings"
import translationsModule from "@/state/translations"
import userViewModule from "@/state/user_view"
import stagingChanges from "@/state/staging_changes"

import "bootstrap/dist/css/bootstrap.css"
import "bootstrap-vue/dist/bootstrap-vue.css"
import "@/styles/style.sass"

Vue.use(Vuex)
Vue.use(BootstrapVue)

export const store = new Vuex.Store({
    strict: !Utils.isProduction,
    modules: {
        auth: authModule,
        settings: settingsModule,
        translations: translationsModule,
        userView: userViewModule,
        staging: stagingChanges,
    },
})

// TypeScript definition for "state" is broken
const storeState: any = store.state

Modules.router.beforeResolve((to, from, next) => {
    const isLogin = to.matched.some(record => record.meta.isLogin)
    if (!isLogin && storeState.auth.current === null) {
        next({
            name: "login",
            query: { redirect: to.fullPath },
        })
    } else if (isLogin && storeState.auth.current !== null) {
        let nextUrl
        const redirect = to.query.redirect
        if (redirect !== undefined) {
            nextUrl = Array.isArray(redirect) ? redirect[0] : redirect
        } else {
            nextUrl = "/"
        }
        next(nextUrl)
    } else {
        next()
    }
})

store.dispatch("auth/startAuth")

Vue.component("UserView", UserView)
Vue.component("ActionsMenu", ActionsMenu)

const app = new Vue({
    router: Modules.router,
    i18n: Modules.i18n,
    store,
    render: f => f(App),
}).$mount("#app")

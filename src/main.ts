import Vue from "vue"
import Vuex from "vuex"
import VueRouter from "vue-router"
import VueI18n, { LocaleMessageObject, Path, Locale } from "vue-i18n"
import BootstrapVue from "bootstrap-vue"

import * as Utils from "@/utils"

import Login from "@/components/Login.vue"
import NotFound from "@/components/NotFound.vue"
import RootUserView from "@/components/RootUserView.vue"
import App from "@/App.vue"

import authModule from "@/state/auth"
import settingsModule from "@/state/settings"
import userViewModule from "@/state/user_view"
import stagingChanges from "@/state/staging_changes"

import { CurrentAuth } from "@/state/auth"

import "bootstrap/dist/css/bootstrap.css"
import "bootstrap-vue/dist/bootstrap-vue.css"
import "@/styles/style.sass"

Vue.use(Vuex)
Vue.use(VueRouter)
Vue.use(VueI18n)
Vue.use(BootstrapVue)

export const store = new Vuex.Store({
    strict: !Utils.isProduction,
    modules: {
        auth: authModule,
        settings: settingsModule,
        userView: userViewModule,
        staging: stagingChanges,
    },
})

// TypeScript definition for "state" is broken
const storeState: any = store.state

const routes = [
    { path: "/", name: "main", redirect: { name: "view", params: { name: "Main" } } },
    { path: "/views/:name", name: "view", component: RootUserView },
    { path: "/views/:name/new", name: "view_create", component: RootUserView },
    { path: "/login", name: "login", component: Login, meta: { isLogin: true } },
    { path: "*", component: NotFound },
]

const router = new VueRouter({
    mode: "history",
    routes,
})

const i18n = new VueI18n({
    locale: navigator.language,
    fallbackLocale: "en-US",
})

if (localStorage.getItem("authToken") !== null) {
    store.dispatch("auth/setCurrentAuth", new CurrentAuth(localStorage.getItem("authToken") as string))
    store.dispatch("auth/renewAuth")
}
store.subscribe((mutation, state: any) => {
    if (mutation.type === "clearAuth") {
        localStorage.removeItem("authToken")
    } else if (mutation.type === "setAuth") {
        localStorage.setItem("authToken", storeState.auth.current.token)
    }
})

store.subscribe((mutation, state) => {
    if (mutation.type === "auth/clearAuth") {
        router.push({
            name: "login",
            query: { redirect: router.currentRoute.fullPath },
        })
    }
})
router.beforeResolve((to, from, next) => {
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

const app = new Vue({
    router, i18n, store,
    render: f => f(App),
}).$mount("#app")

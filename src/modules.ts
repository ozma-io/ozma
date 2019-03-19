import Vue from "vue"
import VueRouter from "vue-router"
import VueI18n from "vue-i18n"

import * as Utils from "@/utils"
import NotFound from "@/components/NotFound.vue"
import AuthResponse from "@/components/AuthResponse.vue"
import RootUserView from "@/components/RootUserView.vue"

Vue.use(VueRouter)
Vue.use(VueI18n)

const routes = [
    { path: "/", name: "main", redirect: { name: "view", params: { name: "Main" } } },
    { path: "/views/:name", name: "view", component: RootUserView },
    { path: "/views/:name/new", name: "view_create", component: RootUserView },
    { path: "/auth_response", name: "auth_response", component: AuthResponse },
    { path: "*", component: NotFound },
]

export const router = new VueRouter({
    mode: "history",
    routes,
})

export const i18n = new VueI18n({
    locale: Utils.shortLanguage,
    fallbackLocale: "en",
})

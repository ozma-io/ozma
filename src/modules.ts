import Vue from "vue"
import VueRouter from "vue-router"
import VueI18n from "vue-i18n"
import { Dictionary } from "vue-router/types/router"

import * as Utils from "@/utils"
import NotFound from "@/components/NotFound.vue"
import AuthResponse from "@/components/AuthResponse.vue"
import RootUserView from "@/components/RootUserView.vue"

Vue.use(VueRouter)
Vue.use(VueI18n)

const routes = [
    { path: "/", name: "main", redirect: { name: "view", params: { schema: "user", name: "Main" } } },
    { path: "/views/:schema/:name", name: "view", component: RootUserView },
    { path: "/views/:schema/:name/new", name: "view_create", component: RootUserView },
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

export type RouterQueryValues = string | Array<string | null>
export type RouterQuery = Dictionary<RouterQueryValues>

export const routerQueryValue = (values: RouterQueryValues): string | null => {
    // Array is always non-empty
    return Array.isArray(values) ? values[values.length - 1] : values
}

export const getQueryValue = (name: string) => {
    const value = router.currentRoute.query[name]
    if (value === undefined) {
        return null
    } else {
        return routerQueryValue(value)
    }
}

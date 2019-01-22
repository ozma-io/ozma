import Vue from "vue"
import VueRouter from "vue-router"
import VueI18n from "vue-i18n"

import Login from "@/components/Login.vue"
import NotFound from "@/components/NotFound.vue"
import RootUserView from "@/components/RootUserView.vue"

Vue.use(VueRouter)
Vue.use(VueI18n)

const routes = [
    { path: "/", name: "main", redirect: { name: "view", params: { name: "Main" } } },
    { path: "/views/:name", name: "view", component: RootUserView },
    { path: "/views/:name/new", name: "view_create", component: RootUserView },
    { path: "/login", name: "login", component: Login, meta: { isLogin: true } },
    { path: "*", component: NotFound },
]

export const router = new VueRouter({
    mode: "history",
    routes,
})

export const i18n = new VueI18n({
    locale: navigator.language,
    fallbackLocale: "en-US",
})

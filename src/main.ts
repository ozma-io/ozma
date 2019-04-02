import Vue from "vue"

Vue.config.devtools = process.env["NODE_ENV"] !== "production"
Vue.config.performance = process.env["NODE_ENV"] !== "production"

import Vuex from "vuex"
import BootstrapVue from "bootstrap-vue"

import * as Modules from "@/modules"
import { setHeadTitle } from "@/elements"

import UserView from "@/components/UserView.vue"
import ActionsMenu from "@/components/ActionsMenu.vue"
import FormControl from "@/components/FormControl.vue"
import App from "@/App.vue"

import authModule from "@/state/auth"
import settingsModule from "@/state/settings"
import translationsModule from "@/state/translations"
import userViewModule from "@/state/user_view"
import stagingChanges from "@/state/staging_changes"

import "@/styles/style.sass"

Vue.use(Vuex)
Vue.use(BootstrapVue)

export const store = new Vuex.Store({
    strict: process.env["NODE_ENV"] !== "production",
    modules: {
        auth: authModule,
        settings: settingsModule,
        translations: translationsModule,
        userView: userViewModule,
        staging: stagingChanges,
    },
})

Vue.component("UserView", UserView)
Vue.component("ActionsMenu", ActionsMenu)
Vue.component("FormControl", FormControl)

Modules.router.beforeResolve((to, from, next) => {
    // Reset page title
    setHeadTitle("FunApp")
    next()
})

const app = new Vue({
    router: Modules.router,
    i18n: Modules.i18n,
    store,
    render: f => f(App),
}).$mount("#app")

import Vue from "vue"
import Vuex from "vuex"
import BootstrapVue from "bootstrap-vue"

import * as Utils from "@/utils"
import * as Modules from "@/modules"

import UserView from "@/components/UserView.vue"
import ActionsMenu from "@/components/ActionsMenu.vue"
import FormControl from "@/components/views/form/FormControl.vue"
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
    strict: process.env["NODE_ENV"] !== "production",
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

Vue.component("UserView", UserView)
Vue.component("ActionsMenu", ActionsMenu)
Vue.component("FormControl", FormControl)

const app = new Vue({
    router: Modules.router,
    i18n: Modules.i18n,
    store,
    render: f => f(App),
}).$mount("#app")

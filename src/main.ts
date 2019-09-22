import Vue from "vue";

Vue.config.devtools = process.env["NODE_ENV"] !== "production";
Vue.config.performance = process.env["NODE_ENV"] !== "production";

import Vuex from "vuex";

import * as Modules from "@/modules";
import { setHeadTitle } from "@/elements";

import UserView from "@/components/UserView.vue";
import UserViewLink from "@/components/UserViewLink";
import ActionsMenu from "@/components/ActionsMenu.vue";
import FormControl from "@/components/FormControl.vue";
import App from "@/App.vue";

import authModule from "@/state/auth";
import settingsModule from "@/state/settings";
import userViewModule from "@/state/user_view";
import stagingChangesModule from "@/state/staging_changes";
import queryModule from "@/state/query";

import "@/styles/style.sass";

export const store = new Vuex.Store({
    // Big performance hog on dev!
    // strict: process.env["NODE_ENV"] !== "production",
    modules: {
        auth: authModule,
        settings: settingsModule,
        userView: userViewModule,
        staging: stagingChangesModule,
        query: queryModule,
    },
});

Vue.component("UserView", UserView);
Vue.component("ActionsMenu", ActionsMenu);
Vue.component("FormControl", FormControl);
Vue.component("UserViewLink", UserViewLink);

Modules.router.beforeResolve((to, from, next) => {
    // Reset page title
    setHeadTitle("FunApp");
    next();
});

const app = new Vue({
    router: Modules.router,
    i18n: Modules.i18n,
    store,
    render: f => f(App),
}).$mount("#app");

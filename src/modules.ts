import Vue from "vue";
import VueRouter from "vue-router";
import VueI18n from "vue-i18n";
import Vuex from "vuex";
import BootstrapVue from "bootstrap-vue";
import UniqueId from "vue-unique-id";
import vClickOutside from "v-click-outside";
import VueGrid from "@liqueflies/vue-flex-grid";
import { RawLocation, Dictionary } from "vue-router/types/router";
import PortalVue from "portal-vue";
import VueJSModal from "vue-js-modal";
import { Plugin as FragmentPlugin } from "vue-fragment";
import infiniteScroll from "vue-infinite-scroll";

import * as Utils from "@/utils";
import NotFound from "@/components/NotFound.vue";
import AuthResponse from "@/components/AuthResponse.vue";
import SaveRestoreSchema from "@/components/SaveRestoreSchema.vue";
import TopLevelUserView from "@/components/TopLevelUserView.vue";

import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";

Vue.use(VueRouter);
Vue.use(VueI18n);
Vue.use(Vuex);
Vue.use(BootstrapVue);
Vue.use(UniqueId);
Vue.use(vClickOutside);
Vue.use(VueGrid);
Vue.use(PortalVue);
Vue.use(FragmentPlugin);
Vue.use(VueJSModal, { componentName: "VueModal" });
Vue.use(infiniteScroll);

const routes = [
  { path: "/", name: "main", redirect: { name: "view", params: { schema: "user", name: "main" } } },
  { path: "/views/:schema/:name", name: "view", component: TopLevelUserView },
  { path: "/views/:schema/:name/new", name: "view_create", component: TopLevelUserView },
  { path: "/auth_response", name: "auth_response", component: AuthResponse },
  { path: "/save_restore", name: "save_restore", component: SaveRestoreSchema },
  { path: "*", component: NotFound },
];

const globalMessages = {
  "en": {
    "confirm_close": "You have unsaved changes, do you want to discard them?",
  },
  "ru": {
    "confirm_close": "У вас есть несохранённые изменения, отбросить их?",
  },
};

export const router = new VueRouter({
  mode: "history",
  routes,
});

export const i18n = new VueI18n({
  locale: Utils.shortLanguage,
  messages: globalMessages,
});

export type RouterQueryValues = string | (string | null)[];
export type RouterQuery = Dictionary<RouterQueryValues>;

export const routerQueryValue = (values: RouterQueryValues): string | null => {
  // Array is always non-empty
  return Array.isArray(values) ? values[values.length - 1] : values;
};

export const asyncPush = async (location: RawLocation) => new Promise((resolve, reject) => {
  router.push(location, resolve, reject);
});

export const getQueryValue = (name: string) => {
  const value = router.currentRoute.query[name];
  if (value === undefined) {
    return null;
  } else {
    return routerQueryValue(value);
  }
};

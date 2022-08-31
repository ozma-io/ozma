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
import VueHotkey from "v-hotkey";

import NotFound from "@/components/NotFound.vue";
import AuthResponse from "@/components/AuthResponse.vue";
import TopLevelUserView from "@/components/TopLevelUserView.vue";

import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";

Vue.use(VueRouter);
Vue.use(VueI18n);
Vue.use(Vuex);
Vue.use(BootstrapVue);
Vue.use(UniqueId);
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
Vue.use(vClickOutside);
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
Vue.use(VueGrid);
Vue.use(PortalVue);
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
Vue.use(FragmentPlugin);
Vue.use(VueJSModal, { componentName: "VueModal" });
Vue.use(VueHotkey);
// Vue.use(VueClipboard);

const routes = [
  { path: "/", name: "main", redirect: { name: "view", params: { schema: "user", name: "main" } } },
  { path: "/views/:schema/:name", name: "view", component: TopLevelUserView },
  { path: "/views/:schema/:name/new", name: "view_create", component: TopLevelUserView },
  { path: "/auth_response", name: "auth_response", component: AuthResponse },
  { path: "/save_restore", name: "save_restore", component: () => import("@/components/SaveRestoreSchema.vue") },
  { path: "/explain", name: "explain_view", component: () => import("@/components/ExplainQuery.vue") },
  { path: "/explain_domains", name: "explain_domains", component: () => import("@/components/ExplainDomains.vue") },
  { path: "*", component: NotFound },
];

const globalMessages = {
  "en": {
    "confirm_close": "You have unsaved changes, do you want to discard them?",
    "generation_start_title": "File generation is started",
    "generation_start_description": "It may take few seconds",
    "generation_fail": "Error occured while file generation. Try again.",
    "ellipsis": "... (Open cell to view full)",
    "exception_in_action": "Exception in action",
    "not_all_values_found_in_options": "Not all references were found in `options_view` or `referenced_entity`",
    "not_found": "Not found",
    "error_button": "<Error>",
    "computed_attributes": "Computed attributes",
  },
  "ru": {
    "confirm_close": "У вас есть несохранённые изменения, отбросить их?",
    "generation_start_title": "Началось создание файла",
    "generation_start_description": "Это займёт несколько секунд",
    "generation_fail": "Произошла ошибка при создании файла. Попробуйте снова.",
    "ellipsis": "... (Откройте ячейку, чтобы читать дальше)",
    "exception_in_action": "Исключение в действии",
    "not_all_values_found_in_options": "Не все значения-отношения были найдены в `options_view` или `referenced_entity`",
    "not_found": "Не найдены",
    "error_button": "<Ошибка>",
    "computed_attributes": "Вычисленные атрибуты",
  },
};

export const router = new VueRouter({
  mode: "history",
  routes,
});

export const i18n = new VueI18n({
  locale: "en",
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

export class CancelledError extends Error {
  constructor(message?: string) {
    super(message ?? "Pending operation cancelled");
  }
}

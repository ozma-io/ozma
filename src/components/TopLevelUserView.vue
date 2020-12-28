<i18n>
    {
        "en": {
            "search_placeholder": "Type to search",
            "pending_changes": "Saving",
            "loading": "Now loading",
            "save": "Save",
            "account": "Account",
            "login": "Login",
            "logout": "Logout",
            "auth_error": "Authentication error: {msg}",
            "user_view_error": "Failed to fetch user view: {msg}",
            "staging_error": "Error while submitting changes: {msg}",
            "settings_error": "Failed to fetch settings: {msg}",
            "select_user_view_error": "Failed to select an entry: {msg}",
            "base_user_view_error": "Failed to perform an operation: {msg}",
            "error": "Error",
            "authed_link": "Copy link with authorization"
        },
        "ru": {
            "search_placeholder": "Поиск",
            "pending_changes": "Сохраняется",
            "loading": "Загрузка данных",
            "save": "Сохранить",
            "account": "Профиль",
            "login": "Войти",
            "logout": "Выйти",
            "auth_error": "Ошибка авторизации: {msg}",
            "user_view_error": "Ошибка получения представления: {msg}",
            "staging_error": "Ошибка сохранения изменений: {msg}",
            "settings_error": "Ошибка получения настроек: {msg}",
            "select_user_view_error": "Ошибка выбора записи: {msg}",
            "base_user_view_error": "Ошибка выполнения операции: {msg}",
            "error": "Ошибка",
            "authed_link": "Скопировать ссылку с авторизацией"
        }
    }
</i18n>

<template>
  <div class="main-div">
    <ProgressBar v-show="isLoading" />

    <template v-if="query !== null">
      <ModalUserView
        v-for="(window, i) in query.windows"
        :key="window.key"
        is-root
        :view="window.query"
        :selected="query.selectedWindow === i"
        @close="closeWindow(i)"
        @goto="pushWindow({index: i, query: $event})"
      />
    </template>

    <div :class="'userview-upper-div'">
      <div class="head-menu">
        <input
          v-if="!isMainView"
          type="button"
          value="arrow_back"
          class="head-menu_back-button material-icons md-14"
          @click="$router.go(-1)"
        >
        <router-link
          v-if="!isMainView"
          :to="{ name: 'main' }"
          class="head-menu_main-menu-button material-icons"
        >
          home
        </router-link>
        <ActionsMenu
          :actions="actions"
          @goto="pushRoot"
        />
        <span v-if="!!title" class="head-menu_title">{{ title }}</span>
        <ButtonsPanel :buttons="panelButtons">
          <template #search-panel>
            <SearchPanel
              v-if="enableFilter"
              :filter-string="query.root.search"
              @update:filterString="replaceRootSearch($event)"
            />
          </template>
          <template #actions-menu>
            <ActionsMenu
              :actions="extraActions"
              :buttons="panelButtons"
              menu-align="right"
              @goto="pushRoot"
            />
          </template>
        </ButtonsPanel>
      </div>
      <div
        class="userview-div"
      >
        <UserView
          :args="query.root.args"
          :filter="filterWords"
          is-top-level
          is-root
          :default-values="query.root.defaultValues"
          scope="root"
          @goto="pushRoot"
          @update:panelButtons="panelButtons = $event"
          @update:actions="extraActions = $event"
          @update:statusLine="statusLine = $event"
          @update:enableFilter="enableFilter = $event"
          @update:bodyStyle="styleNode.innerHTML = $event"
          @update:title="updateTitle"
        />
      </div>
    </div>
    <nav
      v-if="bottomBarNeeded"
      class="fix-bot"
    >
      <div class="count-row">
        {{ statusLine }}
      </div>
      <i
        v-if="errors.length > 0"
        class="material-icons"
        :style="{cursor: 'pointer', color: 'red'}"
        @click="makeErrorToast"
      >
        help_outline
      </i>
      <div
        v-if="!changes.isScopeEmpty('root')"
        class="error custom-warning"
      >
        <button
          :class="['save_button', {
            'save_button__warning': !changes.isScopeEmpty('root'),
            'save_button__error': errors.length > 0,
          }]"
          :title="$t('save')"
          @click="submitChanges({ scope: 'root' })"
        >
          <input
            v-if="errors.length > 0"
            type="button"
            class="material-icons"
            value="warning"
          >
          <input
            v-else-if="!changes.isScopeEmpty('root')"
            type="button"
            class="material-icons"
            value="save"
          >
          <input
            v-else
            type="button"
            class="material-icons"
            value="done"
          >
        </button>
      </div>
    </nav>
  </div>
</template>

<script lang="ts">
import { Route } from "vue-router";
import { Component, Vue, Watch } from "vue-property-decorator";
import { namespace } from "vuex-class";

import * as Api from "@/api";
import { setHeadTitle } from "@/elements";
import { CombinedUserView, CurrentUserViews, IUserViewArguments, UserViewError } from "@/state/user_view";
import { ErrorKey } from "@/state/errors";
import { CurrentChanges, ScopeName } from "@/state/staging_changes";
import { Action } from "@/components/ActionsMenu.vue";
import { IPanelButton } from "@/components/ButtonsPanel.vue";
import ModalUserView from "@/components/ModalUserView.vue";
import SearchPanel from "@/components/SearchPanel.vue";
import ProgressBar from "@/components/ProgressBar.vue";
import { CurrentAuth, getAuthedLink } from "@/state/auth";
import { ICurrentQuery, IQuery, queryLocation, ICurrentQueryHistory } from "@/state/query";
import { convertToWords } from "@/utils";

const auth = namespace("auth");
const userView = namespace("userView");
const staging = namespace("staging");
const settings = namespace("settings");
const query = namespace("query");
const errors = namespace("errors");

@Component({ components: {
  SearchPanel, ModalUserView, ProgressBar,
} })
export default class TopLevelUserView extends Vue {
  @auth.State("current") currentAuth!: CurrentAuth | null;
  @auth.State("pending") authPending!: Promise<void> | null;
  @auth.State("protectedCalls") protectedCalls!: number;
  @auth.Action("login") login!: () => Promise<void>;
  @auth.Action("logout") logout!: () => Promise<void>;
  @userView.Mutation("clear") clearView!: () => void;
  @userView.State("current") userViews!: CurrentUserViews;
  @staging.State("current") changes!: CurrentChanges;
  @staging.Action("submit") submitChanges!: (_: { scope?: ScopeName; preReload?: () => Promise<void> }) => Promise<void>;
  @staging.Action("reset") clearChanges!: () => Promise<void>;
  @query.State("current") query!: ICurrentQueryHistory | null;
  @query.Action("resetRoute") resetRoute!: (_: Route) => void;
  @query.Action("pushRoot") pushRoot!: (_: IQuery) => Promise<void>;
  @query.Action("replaceRootSearch") replaceRootSearch!: (_: string) => Promise<void>;
  @query.Action("closeWindow") closeWindow!: (_: number) => Promise<void>;
  @query.Action("pushWindow") pushWindow!: (_: { index: number; query: IQuery }) => Promise<void>;
  @errors.Mutation("removeError") removeError!: (params: { key: ErrorKey; index: number }) => void;
  @errors.State("errors") rawErrors!: Record<ErrorKey, string[]>;

  private panelButtons: IPanelButton[] = [];
  private extraActions: Action[] = [];
  private statusLine = "";
  private enableFilter = false;
  private styleNode: HTMLStyleElement;
  private title = "";

  constructor() {
    super();
    this.styleNode = document.createElement("style");
    this.styleNode.type = "text/css";
  }

  get errors() {
    return Object.entries(this.rawErrors).flatMap(([key, keyErrors]) => keyErrors.map(error => {
      return this.$t(`${key}_error`, { msg: error });
    }));
  }

  get isLoading(): boolean {
    return this.authPending !== null || this.protectedCalls > 0;
  }

  get filterWords() {
    const value = this.query!.root.search;
    if (value !== undefined) {
      return Array.from(new Set(convertToWords(value.toString())));
    }
    return [];
  }

  private makeErrorToast() {
    this.errors.forEach(error => {
      this.$bvToast.toast(error.toString(), {
        title: this.$t("error").toString(),
        variant: "danger",
        solid: true,
      });
    });
  }

  @Watch("$route", { deep: true, immediate: true })
  private onRouteChanged() {
    this.resetRoute(this.$route);
  }

  @Watch("errors")
  private errorsChanged() {
    if (this.errors.length > 0) {
      this.makeErrorToast();
    }
  }

  private updateTitle(title: string) {
    this.title = title;
    setHeadTitle(`${title} - Ozma`);
  }

  private created() {
    document.head.appendChild(this.styleNode);
  }

  private destroyed() {
    this.styleNode.remove();
  }

  get actions() {
    const actions: Action[] = [];
    if (this.currentAuth !== null) {
      if (Api.developmentMode) {
        actions.push({ icon: "link",
          name: this.$t("authed_link").toString(),
          order: 1000,
          callback: () => {
            const link = getAuthedLink(this.currentAuth!);
            void navigator.clipboard.writeText(link);
          } });
      }
      actions.push({ icon: "perm_identity", name: this.$t("account").toString(), order: 1000, link: { href: Api.accountUrl } });
      actions.push({ icon: "exit_to_app", name: this.$t("logout").toString(), order: 1000, callback: this.logout });
    } else {
      actions.push({ icon: "login", name: this.$t("login").toString(), order: 1000, callback: this.login });
    }
    return actions;
  }

  get isMainView() {
    return this.$route.params.schema === "user" && this.$route.params.name === "main";
  }

  get bottomBarNeeded() {
    return this.errors.length > 0 ||
        !this.changes.isEmpty ||
        this.statusLine !== "";
  }
}
</script>

<style scoped>
  /* Current Z layout:

* Count off all entries     (2000)
* Footer of page            (1030)
* Head menu                 (1000)
* All page without footer   (0)

*/
  /deep/ .input-group {
    padding-left: 0;
    border-radius: 3px;
  }

  .main-div {
    padding: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .userview-div {
    padding: 52px 0 0 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .userview-upper-div {
    overflow: hidden;
    height: inherit;
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 0; /* вся страница, кроме низа */
  }

  @media print {
    .head-menu {
      display: none !important;
    }
  }

  @media screen and (max-aspect-ratio: 13/9) {
    @media screen and (max-device-width: 480px) {
      .head-menu {
        width: 100%;
      }
    }
  }

  .head-menu {
    display: flex;
    align-items: center;
    white-space: nowrap;
    background-color: var(--MainBackgroundColor);
    width: 100%;
    padding: 0.75rem;
    position: fixed;
    left: 0;
    top: 0;
    z-index: 999;
    border-bottom: 1px solid var(--MainBorderColor);
  }

  .head-menu_back-button {
    padding-top: 3px;
    padding-bottom: 3px;
    margin-left: 0 !important;
  }

  .head-menu_back-button,
  .head-menu_main-menu-button {
    color: var(--MainTextColor) !important;
    background: hsla(0, 0%, 100%, 0.3);
    border: none;
    text-decoration: none;
    font-size: 20px;
    padding: 0;
    margin-right: 10px;
    position: relative;
    z-index: 1000;
  }

  .head-menu_back-button:focus {
    outline: none;
  }

  .head-menu_title {
    margin: 1px 2px 0;
    font-weight: 600;
    font-size: 1.25em;
  }

  .fix-bot {
    padding: 0.4rem;
    padding-left: 0.75rem;
    line-height: normal;
    white-space: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    text-align: right;
    margin-left: -1px !important;
    position: relative;
    background-color: var(--MainBackgroundColor) !important;
    border-top: 1px solid var(--MainBorderColor);
    z-index: 500; /* низ страницы */
    display: -webkit-box;
    display: -ms-flexbox;
    display: flex;
    -webkit-box-orient: horizontal;
    -webkit-box-direction: normal;
    -ms-flex-direction: row;
    flex-direction: row;
    -ms-flex-wrap: nowrap;
    flex-wrap: nowrap;
    -webkit-box-align: center;
    -ms-flex-align: center;
    align-items: center;
    -webkit-box-pack: justify;
    -ms-flex-pack: justify;
    justify-content: space-between;
  }

  .count-row {
    position: relative;
    bottom: 0;
    z-index: 600; /* кол-во записей внизу */
    line-height: normal;
    float: left;
    margin-left: 5px;
    color: var(--MainTextColor);
    font-weight: 600;
  }

  .custom-warning {
    float: right;
  }

  .custom-danger {
    background-color: var(--FailColor);
    float: left;
    overflow-x: auto;
    overflow-y: hidden;
    width: 100%;
    text-align: left;
    display: flex !important;
    align-items: center;
    height: 100%;
    color: var(--StateTextColor);
    padding-left: 15px !important;
    margin-right: 15px !important;
    border-radius: 3px !important;
  }

  .custom-success {
    background-color: var(--SuccessBackColor);
  }

  .error {
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: inherit;
    display: inline-block;
    position: relative;
  }

  .save_button {
    background-color: var(--SuccessColor);
    color: var(--StateTextColor);
    padding: 5px;
    border-radius: 3px;
    animation: color-change-2x 2s linear infinite alternate both;
    display: flex;
    justify-content: center;
  }

  .save_button__warning {
    background-color: var(--WarningColor);
    animation: color-change-2x 2s linear infinite alternate both;
  }

  .save_button__error {
    background-color: var(--FailColor);
    animation: color-change-2x 2s linear infinite alternate both;
  }

  .save_button > input {
    background: none;
    border: none;
    padding: 0 20px;
  }

  .error_button {
    padding: 0;
    margin: 0;
    margin-left: 0;
    line-height: normal;
    position: relative;
    font-size: inherit;
    background: hsla(0, 0%, 100%, 0.3);
    color: var(--ButtonTextColor);
    float: none;
    vertical-align: unset;
    border-radius: 0 !important;
  }

  @media screen and (max-aspect-ratio: 13/9) {
    @media screen and (max-device-width: 480px) {
      .find {
        display: block;
      }

      .head-menu_back-button,
      .head-menu_main-menu-button {
        text-align: left;
        box-sizing: content-box;
        display: inline-block;
        height: 1em;
        vertical-align: bottom;
      }
    }
  }
</style>

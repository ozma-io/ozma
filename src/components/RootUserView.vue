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
            "base_user_view_error": "Failed to perform an operation: {msg}"
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
            "base_user_view_error": "Ошибка выполнения операции: {msg}"
        }
    }
</i18n>

<template>
  <div class="main-div">
    <!-- FIXME: This shouldn't depend on type! -->
    <div :class="uvIsReady && uv.attributes.Type === 'Menu' ? 'menu_scrol' : 'menu_none-scrol'">
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
          title="view_headline"
          :actions="actions"
        />
        <div
          v-if="enableFilter"
          class="search-wrapper"
        >
          <b-form
            v-if="enableFilter"
            inline
            :class="['find', {
              'search-field_hidden': !isShownSearchField,
            }]"
            @submit.prevent="submitFilter()"
          >
            <b-input-group>
              <b-form-input
                ref="searchInput"
                v-model="filterString"
                class="find_in form-control"
                :placeholder="$t('search_placeholder')"
              />
              <b-input-group-append v-if="filterString.length > 0">
                <span
                  id="searchclear"
                  class="material-icons clear-search"
                  @click="filterString = ''"
                >backspace</span>
              </b-input-group-append>
            </b-input-group>
          </b-form>
          <button
            v-if="enableFilter"
            class="search-button"
            @click="toggleSearchFieldVisibility(null)"
          >
            <i
              v-if="!isShownSearchField"
              class="material-icons search-button__icon"
            >search</i>
            <i
              v-else
              class="material-icons search-button__icon"
            >close</i>
          </button>
        </div>
      </div>
      <div
        v-if="uv !== null"
        class="userview-div"
      >
        <UserView
          :args="query.rootViewArgs"
          :filter="filterWords"
          is-root
          :default-values="defaultValues"
          scope="root"
          @goto="goto"
          @update:actions="extraActions = $event"
          @update:statusLine="statusLine = $event"
          @update:enableFilter="enableFilter = $event"
          @update:bodyStyle="styleNode.innerHTML = $event"
          @update:title="updateTitle"
        />
      </div>
    </div>
    <nav
      v-if="!uvIsError && bottomBarNeeded"
      class="fix-bot"
    >
      <div class="count-row">
        {{ statusLine }}
      </div>
      <div
        v-for="(error, errorI) in errors"
        :key="errorI"
        class="error custom-danger"
        show
      >
        {{ error }}
      </div>
      <div
        v-if="!changes.isScopeEmpty('root')"
        class="error custom-warning"
      >
        <button
          :class="['save_button', {
            'save_button__warning': !changes.isScopeEmpty('root'),
            'save_button__error': errors.length > 0,
          }]"
          @click="submitChanges('root')"
        >
          {{ $t('save') }}
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
import {Route} from "vue-router";
import {Component, Vue, Watch} from "vue-property-decorator";
import {namespace} from "vuex-class";
import * as Api from "@/api";
import {setHeadTitle} from "@/elements";
import {CombinedUserView, CurrentUserViews, IUserViewArguments, UserViewError} from "@/state/user_view";
import {ErrorKey} from "@/state/errors";
import {CurrentChanges, ScopeName} from "@/state/staging_changes";
import {Action} from "@/components/ActionsMenu.vue";
import {CurrentAuth} from "@/state/auth";
import {CurrentQuery, getDefaultValues, IQuery, queryLocation, replaceSearch} from "@/state/query";
import {Debounce} from "vue-debounce-decorator";

const auth = namespace("auth");
const userView = namespace("userView");
const staging = namespace("staging");
const settings = namespace("settings");
const query = namespace("query");
const errors = namespace("errors");

const makeWordsRegex = () => {
  // Match words that doesn't start with quotes
  const wordRegex = `([^"'«„”\\s][^\\s]*)`;
  const quotes = [
    [`"`, `"`],
    [`'`, `'`],
    [`«`, `»`],
    [`„`, `“`],
    [`”`, `”`],
  ];
    // Match fully-quoted words: e.g. `"foo bar"` will match but `"foo"b` or `"foo ` will not
  const quoteRegexes = quotes.map(([start, end]) => `${start}([^${end}]+)${end}(?:\\s|$)`);
  // Match any word
  const fallbackRegex = `([^\\s]+)`;
  const regexes = [wordRegex].concat(quoteRegexes).concat([fallbackRegex]);
  const regexesStr = regexes.map(reg => `(?:${reg})`).join("|");
  const fullRegex = `^\\s*(?:${regexesStr})`;
  return fullRegex;
};
const wordsRegexString = makeWordsRegex();

const convertToWords = (str: string) => {
  const regex = new RegExp(wordsRegexString, "g");
  const words: string[] = [];
  while (true) {
    const ret = regex.exec(str);
    if (ret === null) {
      break;
    } else {
      const word = ret.slice(1).find(x => x !== undefined) as string;
      words.push(word.toLowerCase());
    }
  }
  return words;
};

const searchParam = "__q";
@Component
export default class RootUserView extends Vue {
  @auth.State("current") currentAuth!: CurrentAuth | null;
  @auth.Action("login") login!: () => Promise<void>;
  @auth.Action("logout") logout!: () => Promise<void>;
  @userView.Mutation("clear") clearView!: () => void;
  @userView.Action("getRootView") getRootView!: (_: IUserViewArguments) => Promise<void>;
  @userView.State("current") userViews!: CurrentUserViews;
  @staging.State("current") changes!: CurrentChanges;
  @staging.Action("submit") submitChanges!: (scope?: ScopeName) => Promise<void>;
  @staging.Action("reset") clearChanges!: () => Promise<void>;
  @query.State("current") query!: CurrentQuery;
  @query.Mutation("setRoute") setRoute!: (_: Route) => void;
  @errors.Mutation("removeError") removeError!: (params: { key: ErrorKey; index: number }) => void;
  @errors.State("errors") rawErrors!: Record<ErrorKey, string[]>;

  private extraActions: Action[] = [];
  private statusLine = "";
  private filterString = "";
  private enableFilter = false;
  private styleNode: HTMLStyleElement;
  private isShownSearchField = false;

  constructor() {
    super();
    this.styleNode = document.createElement("style");
    this.styleNode.type = "text/css";
  }

  get errors() {
    return Object.entries(this.rawErrors).flatMap(([key, keyErrors]) => keyErrors.map(error => {
      return this.$t(`${key}_error`, {msg: error});
    }));
  }

  get filterWords() {
    const value = this.query.getSearch("q", String, "");
    if (value !== undefined) {
      return Array.from(new Set(convertToWords(value.toString())));
    }
    return [];
  }

  // FIXME update when change not query.search
  @Watch("$route", {deep: true, immediate: true})
  private onRouteChanged() {
    this.setRoute(this.$route);
  }

  @Watch("$route.path")
  private closeSearchField() {
    this.isShownSearchField = false;
  }

  @Watch("query.rootViewArgs", {deep: true, immediate: true})
  private onViewArgsChanged() {
    this.updateView();
  }

  @Watch("filterString")
  @Debounce(500)
  private submitFilter() {
    replaceSearch("q", this.filterString);
  }

  @Watch("query.search.root", {deep: true, immediate: true})
  private updateRootParams() {
    this.filterString = this.query.getSearch("q", String, "");
  }

  private updateTitle(title: string) {
    setHeadTitle(`${title} - FunApp`);
  }

  private created() {
    document.head.appendChild(this.styleNode);
  }

  private destroyed() {
    this.styleNode.remove();
  }

  get actions() {
    const actions: Action[] = [];
    actions.push(...this.extraActions);
    if (this.currentAuth !== null) {
      actions.push({name: this.$t("account").toString(), href: Api.accountUrl});
      actions.push({name: this.$t("logout").toString(), callback: this.logout});
    } else {
      actions.push({name: this.$t("login").toString(), callback: this.login});
    }
    return actions;
  }

  private toggleSearchFieldVisibility(flag?: boolean | null) {
    if (flag !== null) {
      this.isShownSearchField = flag as boolean;
    } else {
      this.isShownSearchField = !this.isShownSearchField;
    }
  }

  @Watch("isShownSearchField") setFocusOnField() {
    if (this.isShownSearchField) {
      (this.$refs.searchInput as HTMLElement).focus();
    } else {
      this.filterString = "";
    }
  }

  private updateView() {
    this.clearView();
    const args = this.query.rootViewArgs;
    if (args === null) {
      throw new Error("Invalid root view arguments");
    }
    if (args.source.type !== "named") {
      throw new Error("Anonymous user views are not supported");
    }
    this.getRootView(args);
  }

  private goto(newQuery: IQuery) {
    const location = queryLocation(newQuery);
    this.$router.replace(location);
  }

  get uv() {
    if (this.query.rootViewArgs === null) {
      return null;
    } else {
      return this.userViews.getUserView(this.query.rootViewArgs);
    }
  }

  get uvIsReady() {
    return this.uv instanceof CombinedUserView;
  }

  get uvIsError() {
    return this.uv instanceof UserViewError;
  }

  get isMainView() {
    return this.$route.params.schema === "user" && this.$route.params.name === "main";
  }

  get bottomBarNeeded() {
    return this.errors.length > 0 ||
        !this.changes.isEmpty ||
        this.statusLine !== "";
  }

  get defaultValues() {
    return getDefaultValues(this.query.search);
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
    padding: 50px 0 0 0;
    width: 100%;
    overflow: hidden;
    flex: 1;
  }

  .search-wrapper {
    display: flex;
    align-items: center;
    width: auto;
    flex: 1;
  }

  .clear-search {
    height: 20px;
    font-size: 20px;
    margin: 0;
    position: absolute;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
  }

  .menu_scrol {
    display: block;
    overflow: auto;
    height: inherit;
  }

  .menu_none-scrol {
    overflow: hidden;
    height: inherit;
    display: flex;
    flex-direction: column;
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
    line-height: normal;
    border: none;
    text-decoration: none;
    font-size: 20px;
    padding: 0;
    margin-right: 10px;
    z-index: 1000;
  }

  .head-menu_back-button:focus {
    outline: none;
  }

  .find_in {
    border-radius: 0;
    border-top: 0;
    border-left: 0;
    border-right: 0;
    padding-left: 0 !important;
    padding-right: 20px !important;
    font-size: 14px !important;
  }

  .find_in::placeholder {
    color: var(--MainTextColorLight) !important;
    font-size: 14px;
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
    z-index: 1030; /* низ страницы */
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
    bottom: 0;
    z-index: 2000; /* кол-во записей внизу */
    line-height: normal;
    float: left;
    margin-left: 5px;
    color: var(--MainTextColor);
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

  .search-button {
    padding: 0;
    background: transparent;
    height: 20px;
    outline: none;
  }

  .search-button__icon {
    font-size: 20px;
  }

  .save_button > input {
    background: none;
    border: none;
    padding: 0 0 0 5px;
  }

  .find {
    margin-right: 10px;
  }

  .search-field_hidden {
    opacity: 0;
    pointer-events: none;
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

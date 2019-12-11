<i18n>
    {
        "en": {
            "search_placeholder": "Type to search",
            "pending_changes": "Saving",
            "loading": "Now loading",
            "save": "Save",
            "account": "Account",
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
                <input v-if="!isMainView" type="button" @click="$router.go(-1)"  value="arrow_back" class="head-menu_back-button material-icons"/>
                <router-link v-if="!isMainView" :to="{ name: 'main' }" class="head-menu_main-menu-button material-icons">
                    home
                </router-link>
                <ActionsMenu v-if="uvIsReady"
                        title="view_headline"
                        :actions="actions" />
                <b-form v-if="enableFilter" v-on:submit.prevent="submitFilter()" inline class="find">
                    <b-input-group>
                        <b-form-input v-model="filterString" class="find_in form-control" :placeholder="$t('search_placeholder')" />
                        <b-input-group-append v-if="filterString.length > 0">
                            <span id="searchclear" class="glyphicon glyphicon-remove-circle" @click="filterString = ''">✖</span>
                        </b-input-group-append>
                    </b-input-group>
                </b-form>
            </div>
            <div v-if="uv !== null" class="userview-div">
                <UserView :args="query.rootViewArgs"
                          :filter="filterWords"
                          isRoot
                          :defaultValues="defaultValues"
                          scope="root"
                          @goto="goto"
                          @update:actions="extraActions = $event"
                          @update:statusLine="statusLine = $event"
                          @update:enableFilter="enableFilter = $event"
                          @update:bodyStyle="styleNode.innerHTML = $event"
                          @update:title="updateTitle" />
            </div>
            <div v-else class="loading">
                {{ $t('loading') }}
            </div>
        </div>
        <nav v-if="!uvIsError && bottomBarNeeded" class="fix-bot">
            <div class="count-row">{{ statusLine }}</div>
            <div v-for="(error, errorI) in errors"
                     :key="errorI"
                     class="error custom-danger"
                     show>
                {{ error }}
            </div>
            <div v-if="!changes.isScopeEmpty('root')" class="error custom-warning">
                <button @click="submitChanges('root')"
                    :class="['save_button', {
                        'save_button__warning': !changes.isScopeEmpty('root'),
                        'save_button__error': errors.length > 0,
                                }]" >
                    {{ $t('save') }}
                    <input v-if="errors.length > 0" type="button" class="material-icons" value="warning">
                    <input v-else-if="!changes.isScopeEmpty('root')" type="button" class="material-icons" value="save">
                    <input v-else type="button" class="material-icons" value="done">
                </button>
            </div>
        </nav>
    </div>
</template>

<script lang="ts">
import { Route } from "vue-router";
import { Component, Watch, Vue } from "vue-property-decorator";
import { Action, namespace } from "vuex-class";

import { mapMaybe } from "@/utils";
import * as Api from "@/api";
import { setHeadTitle } from "@/elements";
import { IUserViewArguments, CombinedUserView, UserViewError, CurrentUserViews } from "@/state/user_view";
import { ErrorKey } from "@/state/errors";
import { CurrentChanges, ScopeName } from "@/state/staging_changes";
import { IAction } from "@/components/ActionsMenu.vue";
import { CurrentQuery, IQuery, queryLocation, replaceSearch, getDefaultValues } from "@/state/query";

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
    @auth.Action("logout") logout!: () => Promise<void>;
    @userView.Mutation("clear") clearView!: () => void;
    @userView.Action("getRootView") getRootView!: (_: IUserViewArguments) => Promise<void>;
    @userView.State("current") userViews!: CurrentUserViews;
    @staging.State("current") changes!: CurrentChanges;
    @staging.Action("submit") submitChanges!: (scope?: ScopeName) => Promise<void>;
    @staging.Action("reset") clearChanges!: () => Promise<void>;
    @query.State("current") query!: CurrentQuery;
    @query.Mutation("setRoute") setRoute!: (_: Route) => void;
    @errors.Mutation("removeError") removeError!: (params: { key: ErrorKey, index: number }) => void;
    @errors.State("errors") rawErrors!: Record<ErrorKey, string[]>;

    private extraActions: IAction[] = [];
    private statusLine: string = "";
    private filterString: string = "";
    private enableFilter: boolean = false;
    private styleNode: HTMLStyleElement;

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

    get filterWords() {
        const value = this.query.getSearch("q", String, "");
        if (value !== undefined) {
            return Array.from(new Set(convertToWords(value.toString())));
        }
        return [];
    }

    // FIXME update when change not query.search
    @Watch("$route", { deep: true, immediate: true })
    private onRouteChanged() {
        this.setRoute(this.$route);
    }

    @Watch("query.rootViewArgs", { deep: true, immediate: true })
    private onViewArgsChanged() {
        this.updateView();
    }

    private submitFilter() {
        replaceSearch("q", this.filterString);
    }

    @Watch("query.search.root", { deep: true, immediate: true })
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
        const actions: IAction[] = [];
        actions.push(...this.extraActions);
        if (!Api.disableAuth) {
            actions.push({ name: this.$t("account").toString(), href: Api.accountUrl });
            actions.push({ name: this.$t("logout").toString(), callback: this.logout });
        }
        return actions;
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
        this.$router.push(location);
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
        return this.$route.params.schema === "user" && this.$route.params.name === "Main";
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
    .main-div {
        padding: 0px;
        height: 100%;
        display: flex;
        flex-direction: column;
    }
    .userview-div {
        padding: 0px;
        width: 100%;
        overflow: hidden;
        flex: 1;
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
        z-index: 0;  /* вся страница, кроме низа */
    }
    @media print {
        .head-menu {
            display: none !important;
        }
    }
    @media screen and (max-aspect-ratio: 13/9) {
        @media screen and (max-device-width: 480px) {
            .head-menu {
                display: block !important;
                width: 100%;
            }
        }
    }
    .head-menu {
        display: inline-flex;
        white-space: nowrap;
        background-color: var(--MainBackgroundColor);
        width: 100%;
        padding: 0.75rem;
    }
    .head-menu_back-button {
        padding-top: 3px;
        padding-bottom: 3px;
        margin-left: 0 !important;
    }
    .head-menu_back-button:focus{
       outline:none;
    }
    .head-menu_back-button,
    .head-menu_main-menu-button {
        color: var(--MainTextColor) !important;
        background: hsla(0,0%,100%,.3);
        line-height: normal;
        border: solid 1px var(--MainBorderColor);
        border-radius: 3px;
        text-decoration: none;
        padding-left: 5px;
        padding-right: 5px;
        margin-left: 5px;
        margin-right: 5px;
        z-index: 1000; /* панель наверху */
        padding-bottom: 4px;
        padding-top: 1px !important;
        font-size: 1.4em !important;
        height: 1.25em;
    }
    .head-menu_main-menu-button {
        padding-top: 3px;
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
        box-shadow: 0px -5px 12px 0px rgba(0,0,0,0.3);
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
        margin-top: 15px;
    }

    .count-row {
        bottom: 0;
        z-index: 2000; /* кол-во записей внизу */
        line-height: normal;
        float: left;
        margin-left: 5px;
        color: var(--MainTextColor)
    }
    .custom-warning {
        float: right;
    }
    .custom-danger {
        background-color: var(--FailColor);
        float: left;
        overflow-x: auto;
        overflow-y:hidden;
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
        background-color: var(--SuccessBackColor)
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
        alignt-items: center;
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
        padding: 0 0 0 5px;
    }
    .error_button {
        padding: 0;
        margin: 0px;
        margin-left: 0;
        line-height: normal;
        position: relative;
        font-size: inherit;
        background: hsla(0,0%,100%,.3);
        color: var(--ButtonTextColor);
        float: none;
        vertical-align: unset;
        border-radius: 0 !important;
    }
    @media screen and (max-aspect-ratio: 13/9) {
        @media screen and (max-device-width: 480px) {
            .find{
                display: block;
            }
            .head-menu_back-button,
            .head-menu_main-menu-button {
                text-align: left;
                border-top: 0px !important;
                border-left: 0px !important;
                box-sizing: content-box;
                display: inline-block;
                border-radius: 0 !important;
                height: 1em;
                vertical-align: bottom;
                border: solid 1px var(--MenuColor)
            }
        }
    }
</style>

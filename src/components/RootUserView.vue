<i18n>
    {
        "en": {
            "actions": "Actions",
            "search_placeholder": "Type to search",
            "fetch_error": "Failed to fetch user view: {msg}",
            "goto_nav": "Menu",
            "pending_changes": "Saving",
            "submit_error": "Error while submitting changes: {msg}",
            "settings_error": "Failed to fetch settings: {msg}",
            "translations_error": "Failed to fetch translations: {msg}",
            "save": "Save",
            "account": "Account",
            "logout": "Logout"
        },
        "ru": {
            "actions": "Действия",
            "search_placeholder": "Поиск",
            "fetch_error": "Ошибка получения представления: {msg}",
            "goto_nav": "Меню",
            "pending_changes": "Сохраняется",
            "submit_error": "Ошибка сохранения изменений: {msg}",
            "settings_error": "Ошибка получения настроек: {msg}",
            "translations_error": "Ошибка получения переводов: {msg}",
            "save": "Сохранить",
            "account": "Профиль",
            "logout": "Выйти"
        }
    }
</i18n>

<template>
    <div class="main-div">
        <!-- FIXME: This shouldn't depend on type! -->
        <div :class="uvIsReady && uv.attributes.Type === 'Menu' ? 'menu_scrol' : 'menu_none-scrol'">
            <div class="head-menu">
                <router-link v-if="!isMainView" :to="{ name: 'main' }" class="head-menu_main-menu-button">
                    {{ $t('goto_nav') }}
                </router-link>
                <ActionsMenu v-if="uvIsReady" :title="$t('actions')" :actions="actions" />
                <b-form v-if="enableFilter" v-on:submit.prevent="submitFilter()" inline class="find">
                    <b-input-group>
                        <b-form-input v-model="filterString" class="find_in form-control" :placeholder="$t('search_placeholder')" />
                        <b-input-group-append v-if="filterString.length > 0">
                            <span id="searchclear" class="glyphicon glyphicon-remove-circle" @click="filterString = ''">✖</span>
                        </b-input-group-append>
                    </b-input-group>
                </b-form>
            </div>
            <b-col class="userview-div">
                <UserView :uv="uv"
                          :filter="filterWords"
                          isRoot
                          :defaultValues="defaultValues"
                          @update:actions="extraActions = $event"
                          @update:statusLine="statusLine = $event"
                          @update:onSubmitStaging="onSubmitStaging = $event"
                          @update:enableFilter="enableFilter = $event"
                          @update:bodyStyle="styleNode.innerHTML = $event" />
            </b-col>
        </div>
        <nav v-if="!uvIsError && bottomBarNeeded" class="fix-bot">
            <div class="count-row">{{ statusLine }}</div>
            <div v-for="error in uvErrors"
                     :key="error"
                     class="error custom-danger"
                     variant="danger"
                     show>
                {{ $t('fetch_error', { msg: error }) }}
            </div>
            <div class="error custom-danger"
                     variant="danger"
                     v-if="settingsLastError !== null">
                {{ $t('settings_error', { msg: settingsLastError }) }}
            </div>
            <div class="error custom-danger"
                     variant="danger"
                     v-if="translationsLastError !== null">
                {{ $t('translations_error', { msg: translationsLastError }) }}
            </div>
            <div v-for="error in stagingErrors"
                     :key="error"
                     class="error custom-danger"
                     variant="danger"
                     show>
                {{ $t('submit_error', { msg: error }) }}
            </div>
            <div class="error custom-warning" variant="warning" v-if="!changes.isEmpty">
                <button class="error_button" @click="submitChangesWithHook" variant="primary">{{ $t('save') }}</button>
                {{ $t('pending_changes') }}
            </div>
        </nav>
    </div>
</template>
<style scoped >
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
        z-index: 1050;
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
        background-color: var(--MenuColor);
        width: 100%;
    }
    .head-menu_main-menu-button {
        color: var(--ButtonTextColor) !important;
        background: hsla(0,0%,100%,.3);
        line-height: normal;
        border: solid 1px var(--MenuColor);
        border-left: 0px;
        text-decoration: none;
        padding-left: 7px;
        padding-right: 7px;
        z-index: 1000;
        padding-bottom: 4px;
        padding-top: 4px;
        border-radius: 0 !important;
    }
    .fix-bot {
        padding: 0;
        line-height: normal;
        width: 100vw;
        white-space: nowrap;
        overflow-x: auto;
        overflow-y: hidden;
        text-align: right;
        margin-left: -1px !important;
        position: relative;
        background-color: var(--MenuColor) !important;
        z-index: 1030;
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
        z-index: 2000;
        line-height: normal;
        float: left;
        display: inline-block;
        margin-left: 2px;
        color: var(--ButtonTextColor)
    }
    .custom-warning {
        background-color: var(--MenuColor); 
        color: var(--ButtonTextColor);
        float: right;
    }
    .custom-danger {
        background-color: var(--DangerBackColor); 
        float: left;
        overflow-x: auto;
        overflow-y:hidden;
        width: 100%;
        text-align: left;
    }
    .custom-success {
        background-color: var(--SuccessBackColor)
    }
    .error {
        margin-left: 1px !important;
        margin: 0;
        padding: 0;
        border: 0;
        border-radius: inherit;
        display: inline-block;
        position: relative;
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
            .head-menu_main-menu-button {
                width: 100vw;
                text-align: left;
                border-top: 0 !important;
                border-right: 0 !important;
                border-left: 0 !important;
                box-sizing: content-box;
                display: block;
                border-radius: 0 !important;
            }
        }
    }
</style>
<script lang="ts">
    import { Route } from "vue-router"
    import { Component, Watch, Vue } from "vue-property-decorator"
    import { Action, namespace } from "vuex-class"

    import seq from "@/sequences"
    import * as Api from "@/api"
    import { setHeadTitle } from "@/elements"
    import { IUserViewArguments, UserViewResult, UserViewError, CurrentUserViews } from "@/state/user_view"
    import { CurrentTranslations } from "@/state/translations"
    import { CurrentChanges } from "@/state/staging_changes"
    import { IAction } from "@/components/ActionsMenu.vue"
    import { CurrentQuery, replaceSearch, defaultValuePrefix } from "@/state/query"

    const auth = namespace("auth")
    const userView = namespace("userView")
    const staging = namespace("staging")
    const settings = namespace("settings")
    const translations = namespace("translations")
    const query = namespace("query")

    const makeWordsRegex = () => {
        // Match words that doesn't start with quotes
        const wordRegex = `([^"'«„”\\s][^\\s]*)`
        const quotes = [
            [`"`, `"`],
            [`'`, `'`],
            [`«`, `»`],
            [`„`, `“`],
            [`”`, `”`],
        ]
        // Match fully-quoted words: e.g. `"foo bar"` will match but `"foo"b` or `"foo ` will not
        const quoteRegexes = quotes.map(([start, end]) => `${start}([^${end}]+)${end}(?:\\s|$)`)
        // Match any word
        const fallbackRegex = `([^\\s]+)`
        const regexes = [wordRegex].concat(quoteRegexes).concat([fallbackRegex])
        const regexesStr = regexes.map(reg => `(?:${reg})`).join("|")
        const fullRegex = `^\\s*(?:${regexesStr})`
        return fullRegex
    }
    const wordsRegexString = makeWordsRegex()

    const convertToWords = (str: string) => {
        const regex = new RegExp(wordsRegexString, "g")
        const words: string[] = []
        while (true) {
            const ret = regex.exec(str)
            if (ret === null) {
                break
            } else {
                const word = ret.slice(1).find(x => x !== undefined) as string
                words.push(word.toLowerCase())
            }
        }
        return words
    }

    const searchParam = "__q"

    @Component
    export default class RootUserView extends Vue {
        @auth.Action("logout") logout!: () => Promise<void>
        @userView.Mutation("clear") clearView!: () => void
        @userView.Action("getRootView") getRootView!: (_: IUserViewArguments) => Promise<void>
        @userView.State("current") userViews!: CurrentUserViews
        @userView.Mutation("removeError") uvRemoveError!: (errorIndex: number) => void
        @userView.State("errors") uvErrors!: string[]
        @staging.State("current") changes!: CurrentChanges
        @staging.State("currentSubmit") submitPromise!: Promise<void> | null
        @staging.Action("submit") submitChanges!: () => Promise<void>
        @staging.Action("reset") clearChanges!: () => Promise<void>
        @staging.Mutation("removeError") stagingRemoveError!: (errorIndex: number) => void
        @staging.State("errors") stagingErrors!: string[]
        @translations.State("lastError") translationsLastError!: string | null
        @translations.Mutation("clearError") translationsClearError!: () => void
        @settings.State("lastError") settingsLastError!: string | null
        @settings.Mutation("clearError") settingsClearError!: () => void
        @query.State("current") query!: CurrentQuery
        @query.Mutation("setRoute") setRoute!: (_: Route) => void

        private extraActions: IAction[] = []
        private statusLine: string = ""
        private filterString: string = ""
        private enableFilter: boolean = false
        private onSubmitStaging: (() => void) | null = null
        private styleNode: HTMLStyleElement

        constructor() {
            super()
            this.styleNode = document.createElement("style")
            this.styleNode.type = "text/css"
        }

        get filterWords() {
            const value = this.query.getSearch("q", String, "")
            if (value !== undefined) {
                return Array.from(new Set(convertToWords(value.toString())))
            }
            return []
        }

        // FIXME update when change not query.search
        @Watch("$route", { deep: true })
        private onRouteChanged() {
            this.setRoute(this.$route)
        }

        @Watch("query.rootViewArgs", { deep: true })
        private onViewArgsChanged() {
            this.updateView()
        }

        private submitFilter() {
            replaceSearch("q", this.filterString)
        }

        @Watch("query.search.root")
        private updateRootParams() {
            this.filterString = this.query.getSearch("q", String, "")
        }

        private created() {
            document.head.appendChild(this.styleNode)
            this.setRoute(this.$route)
        }

        private destroyed() {
            this.styleNode.remove()
        }

        get actions() {
            const actions: IAction[] = []
            actions.push(...this.extraActions)
            actions.push({ name: this.$tc("account"), href: Api.accountUrl })
            actions.push({ name: this.$tc("logout"), callback: this.logout })
            return actions
        }

        private updateView() {
            this.clearView()
            this.extraActions = []
            this.statusLine = ""
            this.onSubmitStaging = null
            this.enableFilter = false
            this.styleNode.innerHTML = ""

            if (this.query.rootViewArgs === null) {
                throw Error("Invalid root view arguments")
            }
            const args = this.query.rootViewArgs
            if (args.source.type !== "named") {
                throw Error("Anonymous user views are not supported")
            }
            setHeadTitle(`${args.source.ref.name} - FunApp`)
            this.getRootView(args)
        }

        private submitChangesWithHook() {
            this.submitChanges()
            if (this.submitPromise !== null) {
                this.submitPromise.then(() => {
                    if (this.onSubmitStaging !== null) {
                        this.onSubmitStaging()
                    }
                })
            }
        }

        get uv() {
            return this.userViews.rootView
        }

        get uvIsReady() {
            return this.uv instanceof UserViewResult
        }

        get uvIsError() {
            return this.uv instanceof UserViewError
        }

        get isMainView() {
            return this.$route.params.schema === "user" && this.$route.params.name === "Main"
        }

        get bottomBarNeeded() {
            return this.uvErrors.length > 0 ||
                this.settingsLastError !== null ||
                this.translationsLastError !== null ||
                this.stagingErrors.length > 0 ||
                !this.changes.isEmpty ||
                this.statusLine !== ""
        }

        get defaultValues() {
            return seq(this.query.search).mapMaybe<[string, any]>(([name, val]) => {
                if (name.startsWith(defaultValuePrefix)) {
                    return [name.slice(defaultValuePrefix.length), JSON.parse(val)]
                } else {
                    return undefined
                }
            }).toObject()
        }
    }
</script>

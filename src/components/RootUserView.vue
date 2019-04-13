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
            "logout": "Logout",
            "confirm_close": "You have unsaved changes, do you want to discard them?"
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
            "logout": "Выйти",
            "confirm_close": "У вас есть несохранённые изменения, отбросить их?"
        }
    }
</i18n>

<template>
    <b-container class="without_padding main_div">
        <!-- FIXME: This shouldn't depend on type! -->
        <div :class="uvIsReady && uv.attributes.Type === 'Menu' ? 'scrol_menu' : 'none_scrol'">
            <b-button-toolbar class="head_menu">
                <b-button v-if="!isMainView" :to="{ name: 'main' }" class="nav_batton, goto_nav" id="menu_btn">
                    {{ $t('goto_nav') }}
                </b-button>
                <ActionsMenu :title="$t('actions')" :actions="actions" />
                <div class="black_block" onklick>
                    <div></div>
                </div>
                <b-form v-if="enableFilter" v-on:submit.prevent="submitFilter()" inline class="find">
                    <b-input-group>
                        <b-form-input v-model="filterString" :value="filterString" class="find_in form-control" :placeholder="$t('search_placeholder')" />
                        <b-input-group-append>
                            <span v-if="filterString.length > 0" id="searchclear" class="glyphicon glyphicon-remove-circle" @click="filterString = ''">✖</span>
                        </b-input-group-append>
                    </b-input-group>
                </b-form>
            </b-button-toolbar>
            <b-col class="without_padding userview_div">
                <UserView :uv="uv"
                          :filter="filterWords"
                          isRoot
                          @update:actions="extraActions = $event"
                          @update:statusLine="statusLine = $event"
                          @update:onSubmitStaging="onSubmitStaging = $event"
                          @update:enableFilter="enableFilter = $event"
                          @update:bodyStyle="styleNode.innerHTML = $event" />
            </b-col>
        </div>
        <nav v-if="!uvIsError && bottomBarNeeded" class="fix-bot navbar fixed-bottom navbar-light bg-light">
            <div class="count_row">{{ statusLine }}</div>
            <b-alert v-for="error in uvErrors"
                     :key="error"
                     class="error custom_danger"
                     variant="danger"
                     show>
                {{ $t('fetch_error', { msg: error }) }}
            </b-alert>
            <b-alert class="error custom_danger"
                     variant="danger"
                     :show="settingsLastError !== null">
                {{ $t('settings_error', { msg: settingsLastError }) }}
            </b-alert>
            <b-alert class="error custom_danger"
                     variant="danger"
                     :show="translationsLastError !== null">
                {{ $t('translations_error', { msg: translationsLastError }) }}
            </b-alert>
            <b-alert v-for="error in stagingErrors"
                     :key="error"
                     class="error custom_danger"
                     variant="danger"
                     show>
                {{ $t('submit_error', { msg: error }) }}
            </b-alert>
            <b-alert class="error custom_warning" variant="warning" :show="!changes.isEmpty">
                <b-button @click="submitChangesWithHook" variant="primary">{{ $t('save') }}</b-button>
                {{ $t('pending_changes') }}
            </b-alert>
        </nav>
    </b-container>
</template>

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

    const auth = namespace("auth")
    const userView = namespace("userView")
    const staging = namespace("staging")
    const settings = namespace("settings")
    const translations = namespace("translations")

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
        const quoteRegexes = quotes.map(([start, end]) => `${start}([^${end}]+)${end}\b`)
        // Match any word
        const fallbackRegex = `[^\\s]+`
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
        @staging.Action("reset") clearChanges!: () => void
        @staging.Mutation("removeError") stagingRemoveError!: (errorIndex: number) => void
        @staging.State("errors") stagingErrors!: string[]
        @translations.State("lastError") translationsLastError!: string | null
        @translations.Mutation("clearError") translationsClearError!: () => void
        @settings.State("lastError") settingsLastError!: string | null
        @settings.Mutation("clearError") settingsClearError!: () => void

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
            const value = this.$route.query["search"]
            if (value !== undefined) {
                return Array.from(new Set(convertToWords(value.toString())))
            }
            return []
        }

        // FIXME update when change not query.search
        @Watch("$route.path")
        private onRouteChanged() {
            this.updateView()
        }

        private submitFilter() {
            if (this.filterString !== "") {
                this.$router.push({query: {search: this.filterString}})
            } else {
                this.$router.replace({query: {}})
            }
        }

        private created() {
            document.head.appendChild(this.styleNode)

            // init filterString
            const value = this.$route.query["search"]
            if (value !== undefined) {
                this.filterString = value.toString()
            }
            this.updateView()
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

            const name = this.$route.params.name
            setHeadTitle(`${name} - FunApp`)

            switch (this.$route.name) {
                case "view":
                    const query = seq(this.$route.query as Record<string, string | string[]>).map<[string, string]>(([argName, values]) => {
                        const val = Array.isArray(values) ? values[0] : values
                        return [argName, val]
                    }).toObject()
                    this.getRootView({ type: "named", source: name, args: query })
                    break
                case "view_create":
                    this.getRootView({ type: "named", source: name, args: null })
                    break
                default:
                    throw new Error(`Invalid route name: ${this.$route.name}`)
            }
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
            return this.$route.params.name === "Main"
        }

        get bottomBarNeeded() {
            return this.uvErrors.length > 0 ||
                this.settingsLastError !== null ||
                this.translationsLastError !== null ||
                this.stagingErrors.length > 0 ||
                !this.changes.isEmpty ||
                this.statusLine !== ""
        }
    }
</script>

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
            "logout": "Выйти",
            "confirm_close": "У вас есть несохранённые изменения, отбросить их?"
        }
    }
</i18n>

<template>
    <b-container class="without_padding main_div">
        <div :class="uv !== null && uv.attributes.Type === 'Menu' ? 'scrol_menu' : 'none_scrol'">
            <b-button-toolbar class="head_menu">
                <b-button v-if="!isMainView" :to="{ name: 'main' }" class="nav_batton, goto_nav" id="menu_btn">
                    {{ $t('goto_nav') }}
                </b-button>
                <ActionsMenu :title="$t('actions')" :actions="actions" />
                <div class="black_block" onklick>
                </div>
                <b-form v-if="enableFilter" inline class="find">
                    <b-input-group>
                        <b-form-input v-model="filter" class="find_in form-control" :value="filter" :placeholder="$t('search_placeholder')" />
                        <b-input-group-append>
                            <span v-if="filter" id="searchclear" class="glyphicon glyphicon-remove-circle" @click="filter=''">✖</span>
                        </b-input-group-append>
                    </b-input-group>
                </b-form>
            </b-button-toolbar>
            <b-col class="without_padding userview_div">
                <UserView :uv="uv"
                          :filter="filter"
                          isRoot
                          @update:actions="extraActions = $event"
                          @update:statusLine="statusLine = $event"
                          @update:onSubmitStaging="onSubmitStaging = $event"
                          @update:enableFilter="enableFilter = $event" />
            </b-col>
        </div>
        <nav :show="this.$children" class="fix-bot navbar fixed-bottom navbar-light bg-light">
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
    import { IUserViewArguments, UserViewResult, CurrentUserViews } from "@/state/user_view"
    import { CurrentTranslations } from "@/state/translations"
    import { CurrentChanges } from "@/state/staging_changes"
    import { IAction } from "@/components/ActionsMenu.vue"

    const auth = namespace("auth")
    const userView = namespace("userView")
    const staging = namespace("staging")
    const settings = namespace("settings")
    const translations = namespace("translations")

    @Component
    export default class RootUserView extends Vue {
        @Action("removeAuth") removeAuth!: () => void
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
        private filter: string = ""
        private enableFilter: boolean = false
        private onSubmitStaging: (() => void) | null = null

        @Watch("$route")
        private onRouteChanged() {
            this.updateView()
        }

        private created() {
            this.updateView()
        }

        get actions() {
            const actions: IAction[] = []
            actions.push({ name: this.$tc("logout"), callback: this.removeAuth })
            actions.push(...this.extraActions)
            return actions
        }

        private updateView() {
            this.clearView()
            this.extraActions = []
            this.statusLine = ""
            this.onSubmitStaging = null
            this.enableFilter = false

            switch (this.$route.name) {
                case "view":
                    const query = Object.entries(this.$route.query).map(([name, values]) => {
                        const val = Array.isArray(values) ? values[0] : values
                        return [name, val]
                    })
                    this.getRootView({ type: "named", source: this.$route.params.name, args: new URLSearchParams(query) })
                    break
                case "view_create":
                    this.getRootView({ type: "named", source: this.$route.params.name, args: null })
                    break
                default:
                    console.assert(false, `Invalid route name: ${this.$route.name}`)
                    break
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

        get isMainView() {
            return this.$route.params.name === "Main"
        }
    }
</script>

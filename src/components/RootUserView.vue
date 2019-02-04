<i18n>
    {
        "en-US": {
            "actions": "Actions",
            "create": "Create new",
            "fetch_error": "Failed to fetch user view: {msg}",
            "goto_nav": "Back to the top",
            "pending_changes": "Saving",
            "submit_error": "Error while submitting changes: {msg}",
            "settings_error": "Failed to fetch settings: {msg}",
            "translations_error": "Failed to fetch translations: {msg}",
            "save": "Save",
            "logout": "Logout",
            "confirm_close": "You have unsaved changes, do you want to discard them?"
        },
        "ru-RU": {
            "actions": "Действия",
            "create": "Создать новую",
            "fetch_error": "Ошибка получения представления: {msg}",
            "goto_nav": "Вернуться на главную",
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
            <b-button-toolbar key-nav class="head_menu">
                <b-button v-if="!isMainView" :to="{ name: 'main' }" class="nav_batton, goto_nav" id="menu_btn">
                    {{ $t('goto_nav') }}
                </b-button>
                <b-dropdown id="ddown1" class=" nav_batton, actions_btn, menu_btn" :text="$t('actions')" no-caret>
                    <b-dropdown-item v-for="action in actions" @click="action['action']" class="menu_btn" variant="primary">
                        {{ action["name"] }}
                    </b-dropdown-item>
                </b-dropdown>
                <div class="black_block" onklick>
                </div>
            </b-button-toolbar>
            <b-col class="without_padding userview_div">
                <UserView v-if="uv !== null && pendingTranslations === null"
                          :uv="uv"
                          isRoot
                          @update:actions="extraActions = $event"
                          @update:statusLine="statusLine = $event" />
            </b-col>
        </div>
        <nav :show="this.$children" class="fix-bot navbar fixed-bottom navbar-light bg-light">
            <div class="count_row">{{ statusLine }}</div>
            <b-alert class="error"
                     variant="danger"
                     :show="uvLastError !== null">
                {{ $t('fetch_error', { msg: uvLastError }) }}
            </b-alert>
            <b-alert class="error"
                     variant="danger"
                     :show="settingsLastError !== null">
                {{ $t('settings_error', { msg: settingsLastError }) }}
            </b-alert>
            <b-alert class="error"
                     variant="danger"
                     :show="translationsLastError !== null">
                {{ $t('translations_error', { msg: translationsLastError }) }}
            </b-alert>
            <b-alert class="error"
                     variant="danger"
                     :show="stagingLastError !== null">
                {{ $t('submit_error', { msg: stagingLastError }) }}
            </b-alert>
            <b-alert class="error" variant="warning" :show="!changesAreEmpty">
                <b-button @click="submitChanges" variant="primary">{{ $t('save') }}</b-button>
                {{ $t('pending_changes') }}
            </b-alert>
        </nav>
    </b-container>
</template>

<script lang="ts">
    import { Route } from "vue-router"
    import { Component, Watch, Vue } from "vue-property-decorator"
    import { Action, namespace } from "vuex-class"
    import { UserViewResult } from "@/state/user_view"
    import { ChangesMap } from "@/state/staging_changes"
    import UserView from "@/components/UserView.vue"
    import { CurrentTranslations } from "@/state/translations"

    const userView = namespace("userView")
    const staging = namespace("staging")
    const settings = namespace("settings")
    const translations = namespace("translations")

    export interface IAction {
        name: string
        action: () => void
    }

    @Component({
        components: {
            UserView,
        },
    })
    export default class RootUserView extends Vue {
        @Action("removeAuth") removeAuth!: () => void
        @userView.Mutation("clear") clearView!: () => void
        @userView.Action("getNamed") getNamed!: (_: { name: string, args: URLSearchParams }) => Promise<void>
        @userView.Action("getNamedInfo") getNamedInfo!: (_: string) => Promise<void>
        @userView.State("current") uv!: UserViewResult | null
        @userView.Mutation("clearError") uvClearError!: () => void
        @userView.State("lastError") uvLastError!: string | null
        @staging.State("changes") changes!: ChangesMap
        @staging.Action("submit") submitChanges!: () => Promise<void>
        @staging.Action("reset") clearChanges!: () => void
        @staging.Mutation("clearError") stagingClearError!: () => void
        @staging.State("lastError") stagingLastError!: string | null
        @staging.Getter("isEmpty") changesAreEmpty!: boolean
        @translations.State("pending") pendingTranslations!: Promise<CurrentTranslations> | null
        @translations.Action("getTranslations") getTranslations!: () => void
        @translations.State("lastError") translationsLastError!: string | null
        @translations.Mutation("clearError") translationsClearError!: () => void
        @settings.State("lastError") settingsLastError!: string | null
        @settings.Mutation("clearError") settingsClearError!: () => void

        extraActions: IAction[] = []
        statusLine: string = ""

        @Watch("$route")
        private onRouteChanged() {
            this.updateView()
        }

        private created() {
            this.updateView()
        }

        get actions() {
            const actions: IAction[] = []
            actions.push({ name: this.$tc("logout"), action: this.removeAuth })
            const createView = this.createView
            if (createView !== null) {
                actions.push({ name: this.$tc("create"), action: () => this.$router.push({ name: "view_create", params: { name: createView } }) })
            }
            actions.push(...this.extraActions)
            return actions
        }

        private updateView() {
            this.clearView()
            this.extraActions = []
            this.statusLine = ""
            switch (this.$route.name) {
                case "view":
                    const query = Object.keys(this.$route.query).map(name => {
                        const values = this.$route.query[name]
                        const val = Array.isArray(values) ? values[0] : values
                        return [name, val]
                    })
                    this.getNamed({ name: this.$route.params.name, args: new URLSearchParams(query) })
                    break
                case "view_create":
                    this.getNamedInfo(this.$route.params.name)
                    break
                default:
                    console.assert(false, `Invalid route name: ${this.$route.name}`)
                    break
            }
        }

        get createView() {
            if (this.uv === null) {
                return null
            } else {
                const attr = this.uv.attributes["CreateView"]
                return attr !== undefined ? String(attr) : null
            }
        }

        get isMainView() {
            return this.$route.params.name === "Main"
        }
    }
</script>

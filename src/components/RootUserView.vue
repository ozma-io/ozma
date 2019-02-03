<i18n>
    {
        "en-US": {
            "actions": "Actions",
            "create": "Create new",
            "fetch_error": "Failed to fetch user view: {msg}",
            "goto_nav": "Back to the top",
            "pending_changes": "Pending changes exist",
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
            "pending_changes": "Есть несохранённые изменения",
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
        <b-button-toolbar key-nav class="head_menu">
            <b-button v-if="!isMainView" :to="{ name: 'main' }" class="nav_batton, goto_nav" id="menu_btn">
                {{ $t('goto_nav') }}
            </b-button>
            <b-dropdown id="ddown1" class=" nav_batton, actions_btn, menu_btn" :text="$t('actions')" no-caret>
                <b-dropdown-item @click="removeAuth()" class="menu_btn" variant="primary">
                    {{ $t('logout') }}
                </b-dropdown-item>
                <b-dropdown-item v-if="createView !== null" :to="{ name: 'view_create', params: { name: createView } }" class="menu_btn" variant="primary">
                    {{ $t('create') }}
                </b-dropdown-item>
            </b-dropdown>
            <div class="black_block" onklick>
            </div>
        </b-button-toolbar>

        <b-col class="without_padding userview_div">
            <UserView v-if="uv !== null && pendingTranslations === null" :uv="uv" isRoot></UserView>
        </b-col>

        <nav v-show="this.$children" class="fix-bot navbar fixed-bottom navbar-light bg-light">
            <b-alert class="error" 
                     variant="danger"
                     dismissible
                     :show="uvLastError !== null"
                     @dismissed="uvClearError">
                {{ $t('fetch_error', { msg: uvLastError }) }}
            </b-alert>
            <b-alert class="error" 
                     variant="danger"
                     dismissible
                     :show="settingsLastError !== null"
                     @dismissed="settingsClearError">
                {{ $t('settings_error', { msg: settingsLastError }) }}
            </b-alert>
            <b-alert class="error" 
                     variant="danger"
                     dismissible
                     :show="translationsLastError !== null"
                     @dismissed="translationsClearError">
                {{ $t('translations_error', { msg: translationsLastError }) }}
            </b-alert>
            <b-alert class="error" 
                     variant="danger"
                     dismissible
                     :show="stagingLastError !== null"
                     @dismissed="stagingClearError">
                {{ $t('submit_error', { msg: stagingLastError }) }}
            </b-alert>
            <b-alert class="error" variant="warning" :show="!changesAreEmpty">
                {{ $t('pending_changes') }}
                <b-button @click="submitChanges" variant="primary">{{ $t('save') }}</b-button>
                <b-button @click="clearChanges" variant="secondary">{{ $t('revert_changes') }}</b-button>
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

    @Component({
        components: {
            UserView,
        },
    })
    export default class RootUserView extends Vue {
        @Action("removeAuth") removeAuth!: (_?: string) => void
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

        @Watch("$route")
        private onRouteChanged() {
            this.updateView()
        }

        private created() {
            this.updateView()
        }

        private updateView() {
            this.clearView()
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

        private delCountDiv() {
            const elem = document.getElementsByClassName("count_row")[0]
            if (elem) {
                const bot = document.getElementsByClassName("fix-bot")[0]
                if (this.isMainView  && bot.firstChild === elem) {
                    bot.removeChild(elem)
                }
            }
        }

    }
</script>

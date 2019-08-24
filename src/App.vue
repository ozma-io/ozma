<i18n>
    {
        "en": {
            "no_auth": "You were logged out. Refresh the page to log in again.",
            "auth_error": "Error during authentication: {msg}"
        },
        "ru": {
            "no_auth": "Вы вышли из системы. Обновите страницу чтобы зайти снова.",
            "auth_error": "Ошибка аутентификации: {msg}"
        }
    }
</i18n>

<template>
    <div id="app">
        <router-view v-if="currentAuth !== null || pendingAuth !== null"></router-view>
        <span v-else-if="authLastError !== null">
            {{ $t('auth_error', { msg: authLastError }) }}
        </span>
        <span v-else>
            {{ $t('no_auth') }}
        </span>
    </div>
</template>

<script lang="ts">
    import { Component, Vue, Watch } from "vue-property-decorator"
    import { namespace } from "vuex-class"
    import { CurrentSettings } from "@/state/settings"
    import { CurrentAuth } from "@/state/auth"

    const settings = namespace("settings")
    const auth = namespace("auth")
    const staging = namespace("staging")

    @Component
    export default class App extends Vue {
        @settings.State("current") settings!: CurrentSettings
        @auth.Action("startAuth") startAuth!: () => Promise<void>
        @auth.State("current") currentAuth!: CurrentAuth | null
        @auth.State("pending") pendingAuth!: Promise<CurrentAuth> | null
        @auth.State("lastError") authLastError!: string | null
        @staging.Mutation("setAutoSaveTimeout") setAutoSaveTimeout!: (_: number | null) => void

        created() {
            this.$router.onReady(() => this.startAuth())
        }

        @Watch("settings")
        private updateSettings() {
            // FIXME: Return to 3 once we fix https://trello.com/c/p26TEPWm
            const rawAutoSaveTimeout = Number(this.settings.getEntry("AutoSaveTimeout", String, "10"))
            const autoSaveTimeout = Number.isNaN(rawAutoSaveTimeout) ? null : rawAutoSaveTimeout * 1000
            this.setAutoSaveTimeout(autoSaveTimeout)
        }

        get styleSettings() {
            const values = {
                "NavigationBackColor": this.settings.getEntry("NavigationBackColor", String, "white"),
                "Font": this.settings.getEntry("Font", String, "Courier New, monospace"),
                "FontSize": `${this.settings.getEntry("FontSize", Number, 16)}px`,
                "MenuColor": this.settings.getEntry("MenuColor", String, "#F5C700"),
                "TableBackColor": this.settings.getEntry("TableBackColor", String, "white"),
                "TableSelectColor": this.settings.getEntry("TableSelectColor", String, "#CCCCCC"),
                "WarningBackColor": this.settings.getEntry("WarningBackColor", String, "#fff3cd"),
                "DangerBackColor": this.settings.getEntry("DangerBackColor", String, "#f8d7da"),
                "SuccessBackColor": this.settings.getEntry("SuccessBackColor", String, "#d4edda"),
                "SelectBorderColor": this.settings.getEntry("SelectBorderColor", String, "blue"),
                "ErrorBackColor": this.settings.getEntry("ErrorBackColor", String, "red"),
                "RequiredBackColor": this.settings.getEntry("RequiredBackColor", String, "yellow"),
                "ButtonTextColor": this.settings.getEntry("ButtonTextColor", String, "white"),
                "TableTextColor": this.settings.getEntry("TableTextColor", String, "#383838"),
                "SaveBackColor": this.settings.getEntry("SaveBackColor", String, "blue"),
                "NavigationTextColor": this.settings.getEntry("NavigationTextColor", String, "white"),
                "ControlDisableColor": this.settings.getEntry("ControlDisableColor", String, "#999999"),
            }
            return Object.entries(values).reduce((currSettings, [name, value]) => {
                currSettings[`--${name}`] = value
                return currSettings
            }, {} as Record<string, any>)
        }

        @Watch("styleSettings")
        private updateStyle() {
            Object.entries(this.styleSettings).forEach(([name, value]) => {
                document.documentElement.style.setProperty(name, value)
            })
        }
    }
</script>

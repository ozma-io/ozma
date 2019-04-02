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
        @auth.Action("startAuth") startAuth!: () => void
        @auth.State("current") currentAuth!: CurrentAuth | null
        @auth.State("pending") pendingAuth!: Promise<CurrentAuth> | null
        @auth.State("lastError") authLastError!: string | null
        @staging.Mutation("setAutoSaveTimeout") setAutoSaveTimeout!: (_: number | null) => void

        created() {
            this.$router.onReady(() => this.startAuth())
        }

        @Watch("settings")
        private updateSettings() {
            const rawAutoSaveTimeout = Number(this.settings.getEntry("AutoSaveTimeout", String, "3"))
            const autoSaveTimeout = Number.isNaN(rawAutoSaveTimeout) ? null : rawAutoSaveTimeout * 1000
            this.setAutoSaveTimeout(autoSaveTimeout)
        }

        get styleSettings() {
            const values = {
                "BackColor": this.settings.getEntry("BackColor", String, "white"),
                "NavigationBackColor": this.settings.getEntry("NavigationBackColor", String, "#F5C700"),
                "TableBorderColor": this.settings.getEntry("TableBorderColor", String, "#F5C700"),
                "FormBorderColor": this.settings.getEntry("FormBorderColor", String, "#F5C700"),
                "Font": this.settings.getEntry("Font", String, "Courier New, monospace"),
                "FontSize": `${this.settings.getEntry("FontSize", Number, 16)}px`,
                "MenuColor": this.settings.getEntry("MenuColor", String, "#F5C700"),
                "TableBackColor": this.settings.getEntry("TableBackColor", String, "white"),
                "TableSelectColor": this.settings.getEntry("TableSelectColor", String, "#CCCCCC"),
                "WarningBackColor": this.settings.getEntry("WarningBackColor", String, "#fff3cd"),
                "DangerBackColor": this.settings.getEntry("DangerBackColor", String, "#f8d7da"),
                "SuccessBackColor": this.settings.getEntry("SuccessBackColor", String, "#d4edda"),
                "SelectBorderColor": this.settings.getEntry("SelectBorderColor", String, "blue"),
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

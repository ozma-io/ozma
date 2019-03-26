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
    <div id="app" :style="styleSettings">
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
            const rawAutoSaveTimeout = Number(this.settings.getEntry("AutoSaveTimeout", "3"))
            const autoSaveTimeout = Number.isNaN(rawAutoSaveTimeout) ? null : rawAutoSaveTimeout * 1000
            this.setAutoSaveTimeout(autoSaveTimeout)
        }

        get styleSettings() {
            const values = {
                "BackColor": this.settings.getEntry("BackColor", "white"),
                "NavigationBackColor": this.settings.getEntry("NavigationBackColor", "#F5C700"),
                "TableBorderColor": this.settings.getEntry("TableBorderColor", "#F5C700"),
                "FormBorderColor": this.settings.getEntry("FormBorderColor", "#F5C700"),
                "Font": this.settings.getEntry("Font", "Courier New, monospace"),
                "FontSize": this.settings.getEntry("FontSize", "16px"),
                "MenuColor": this.settings.getEntry("MenuColor", "#F5C700"),
                "TableBackColor": this.settings.getEntry("TableBackColor", "white"),
                "TableSelectColor": this.settings.getEntry("TableSelectColor", "#CCCCCC"),
                "WarningBackColor": this.settings.getEntry("WarningBackColor", "#fff3cd"),
                "DangerBackColor": this.settings.getEntry("DangerBackColor", "#f8d7da"),
                "SuccessBackColor": this.settings.getEntry("SuccessBackColor", "#d4edda"),
            }
            return Object.entries(values).reduce((currSettings, [name, value]) => {
                currSettings[`--${name}`] = value
                return currSettings
            }, {} as Record<string, any>)
        }
    }
</script>

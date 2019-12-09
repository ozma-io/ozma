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
        <ModalPortalTarget name="tabbed-modal" multiple />
        <router-view v-if="currentAuth !== null || pendingAuth !== null"></router-view>
        <template v-else-if="authErrors.length > 0">
            <span v-for="error in authErrors" :key="error">
                {{ $t('auth_error', { msg: error }) }}
            </span>
        </template>
        <span v-else>
            {{ $t('no_auth') }}
        </span>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import { namespace } from "vuex-class";
import { CurrentSettings } from "@/state/settings";
import { CurrentAuth } from "@/state/auth";
import ModalPortalTarget from "@/components/modal/ModalPortalTarget";
import { ErrorKey } from "@/state/errors";

const settings = namespace("settings");
const auth = namespace("auth");
const errors = namespace("errors");
const staging = namespace("staging");

@Component({ components: { ModalPortalTarget } })
export default class App extends Vue {
    @settings.State("current") settings!: CurrentSettings;
    @auth.Action("startAuth") startAuth!: () => Promise<void>;
    @auth.State("current") currentAuth!: CurrentAuth | null;
    @auth.State("pending") pendingAuth!: Promise<CurrentAuth> | null;
    @errors.State("errors") rawErrors!: Record<ErrorKey, string[]>;
    @staging.Mutation("setAutoSaveTimeout") setAutoSaveTimeout!: (_: number | null) => void;

    created() {
        this.$router.onReady(() => this.startAuth());
    }

    get authErrors() {
        return this.rawErrors["auth"] || [];
    }

    @Watch("settings")
    private updateSettings() {
        // FIXME: Return to 3 once we fix https://trello.com/c/p26TEPWm
        const rawAutoSaveTimeout = Number(this.settings.getEntry("AutoSaveTimeout", String, "3"));
        const autoSaveTimeout = Number.isNaN(rawAutoSaveTimeout) ? null : rawAutoSaveTimeout * 1000;
        this.setAutoSaveTimeout(autoSaveTimeout);
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

            "MainTextColor": this.settings.getEntry("MainTextColor", String, "#b2b2b2"),
            "MainBackgroundColor": this.settings.getEntry("MainBackgroundColor", String, "#292b2e"),
            "MainTextColorLight": this.settings.getEntry("MainTextColorLight", String, "#8a8a8a"),
            "MainBorderColor": this.settings.getEntry("MainBorderColor", String, "#2c936f"),

            "SuccessColor": this.settings.getEntry("SuccessColor", String, "#28a745"),
            "FailColor": this.settings.getEntry("FailColor", String, "#dc3545"),
        };
        return Object.entries(values).reduce((currSettings, [name, value]) => {
            currSettings[`--${name}`] = value;
            return currSettings;
        }, {} as Record<string, any>);
    }

    @Watch("styleSettings")
    private updateStyle() {
        Object.entries(this.styleSettings).forEach(([name, value]) => {
            document.documentElement.style.setProperty(name, value);
        });
    }
}
</script>

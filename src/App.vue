<template>
    <div id="app" :style="styleSettings">
        <router-view></router-view>
    </div>
</template>

<script lang="ts">
    import { Component, Vue } from "vue-property-decorator"
    import { namespace } from "vuex-class"
    import { CurrentSettings } from "@/state/settings"

    const settings = namespace("settings")

    @Component
    export default class App extends Vue {
        @settings.Getter("entry") settingsEntry!: (_1: string, _2: string) => string

        get styleSettings() {
            const values = {
                "BackgroundColor": this.settingsEntry("backround-color", "#ffffff"),
                "NavigationBackColor": this.settingsEntry("NavigationBackColor", "#F5C700"),
                "TableBorderColor": this.settingsEntry("TableBorderColor", "#F5C700"),
                "Font": this.settingsEntry("Font", "Courier New, monospace"),
                "FontSize": this.settingsEntry("FontSize", "16px"),
                "MenuColor": this.settingsEntry("MenuColor", "#F5C700"),
                "ColorTableBg": this.settingsEntry("ColorTableBg", "white"),
                "ColorTableSelect": this.settingsEntry("ColorTableSelect", "#CCCCCC"),
                "WarningBackColor": this.settingsEntry("WarningBackColor", "#fff3cd"),
                "DangerBackColor": this.settingsEntry("DangerBackColor", "#f8d7da"),
                "SuccessBackColor": this.settingsEntry("SuccessBackColor", "#d4edda"),
            }
            return Object.entries(values).reduce((currSettings, [name, value]) => {
                currSettings[`--${name}`] = value
                return currSettings
            }, {} as Record<string, any>)
        }
    }
</script>

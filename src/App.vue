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
        @settings.State("current") settings!: CurrentSettings

        get styleSettings() {
            const values = {
                "BackgroundColor": this.settings.getEntry("backround-color", "#ffffff"),
                "NavigationBackColor": this.settings.getEntry("NavigationBackColor", "#F5C700"),
                "TableBorderColor": this.settings.getEntry("TableBorderColor", "#F5C700"),
                "FormBorderColor": this.settings.getEntry("FormBorderColor", "#F5C700"),
                "Font": this.settings.getEntry("Font", "Courier New, monospace"),
                "FontSize": this.settings.getEntry("FontSize", "16px"),
                "MenuColor": this.settings.getEntry("MenuColor", "#F5C700"),
                "ColorTableBg": this.settings.getEntry("ColorTableBg", "white"),
                "ColorTableSelect": this.settings.getEntry("ColorTableSelect", "#CCCCCC"),
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

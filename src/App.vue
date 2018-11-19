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
                "background-color": this.settingsEntry("backround-color", "#ffffff"),
                "navigation-back-color": this.settingsEntry("backround-color", "#F5C700"),
            }
            return Object.entries(values).reduce((currSettings, [name, value]) => {
                currSettings[`--${name}`] = value
                return currSettings
            }, {} as Record<string, any>)
        }
    }
</script>

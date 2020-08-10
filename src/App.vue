<i18n>
    {
        "en": {
            "auth_error": "Error during authentication: {msg}"
        },
        "ru": {
            "auth_error": "Ошибка аутентификации: {msg}"
        }
    }
</i18n>

<template>
  <div
    id="app"
    :style="styleSettings"
  >
    <ModalPortalTarget
      name="tabbed-modal"
      multiple
    />
    <template v-if="authErrors.length > 0">
      <span
        v-for="error in authErrors"
        :key="error"
      >
        {{ $t('auth_error', { msg: error }) }}
      </span>
    </template>
    <router-view v-else />
    <FabCluster />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import { namespace } from "vuex-class";
import { CurrentSettings } from "@/state/settings";
import { CurrentAuth } from "@/state/auth";
import ModalPortalTarget from "@/components/modal/ModalPortalTarget";
import FabCluster from "@/components/FabCluster/FabCluster.vue";
import { ErrorKey } from "@/state/errors";

const settings = namespace("settings");
const auth = namespace("auth");
const errors = namespace("errors");
const staging = namespace("staging");

@Component({ components: { ModalPortalTarget, FabCluster } })
export default class App extends Vue {
  @settings.State("current") settings!: CurrentSettings;
  @auth.Action("startAuth") startAuth!: () => Promise<void>;
  @settings.Action("getSettings") getSettings!: () => Promise<void>;
  @auth.State("current") currentAuth!: CurrentAuth | null;
  @auth.State("pending") pendingAuth!: Promise<CurrentAuth> | null;
  @errors.State("errors") rawErrors!: Record<ErrorKey, string[]>;
  @staging.Mutation("setAutoSaveTimeout") setAutoSaveTimeout!: (_: number | null) => void;

  created() {
    this.$router.onReady(async () => {
      await this.startAuth();
      await this.getSettings();
    });
  }

  get authErrors() {
    return this.rawErrors["auth"] || [];
  }

  @Watch("settings")
  private updateSettings() {
    const rawAutoSaveTimeout = Number(this.settings.getEntry("auto_save_timeout", String, "3"));
    const autoSaveTimeout = Number.isNaN(rawAutoSaveTimeout) ? null : rawAutoSaveTimeout * 1000;
    this.setAutoSaveTimeout(autoSaveTimeout);
  }

  get styleSettings() {
    const values = {
      // "NavigationBackColor": this.settings.getEntry("navigation_back_color", String, "white"),
      "Font": this.settings.getEntry("font", String, "Courier New, monospace"),
      "FontSize": `${this.settings.getEntry("font_size", Number, 16)}px`,
      "MenuColor": this.settings.getEntry("menu_color", String, "#F5C700"),
      "TableBackColor": this.settings.getEntry("table_back_color", String, "white"),
      "TableSelectColor": this.settings.getEntry("table_select_color", String, "#CCCCCC"),
      "WarningBackColor": this.settings.getEntry("warning_back_color", String, "#fff3cd"),
      "DangerBackColor": this.settings.getEntry("danger_back_color", String, "#f8d7da"),
      "SuccessBackColor": this.settings.getEntry("success_back_color", String, "#d4edda"),
      "SelectBorderColor": this.settings.getEntry("select_border_color", String, "blue"),
      "ButtonTextColor": this.settings.getEntry("button_text_color", String, "white"),
      "TableTextColor": this.settings.getEntry("table_text_color", String, "#383838"),
      "SaveBackColor": this.settings.getEntry("save_back_color", String, "blue"),
      "NavigationTextColor": this.settings.getEntry("navigation_text_color", String, "white"),
      "ControlDisableColor": this.settings.getEntry("control_disable_color", String, "#999999"),

      // Light Theme, do not remove
      "MainTextColor": this.settings.getEntry("main_text_color", String, "black"),
      "MainBackgroundColor": this.settings.getEntry("main_background_color", String, "white"),
      "MainTextColorLight": this.settings.getEntry("main_text_color_light", String, "#68766d"),
      "MainBorderColor": this.settings.getEntry("main_border_color", String, "#dee2e6"),
      "MainBorderTextColor": this.settings.getEntry("main_border_text_color", String, "white"),

      // Dark Theme, do not remove
      // "MainTextColor": this.settings.getEntry("main_text_color", String, "#b2b2b2"),
      // "MainBackgroundColor": this.settings.getEntry("main_background_color", String, "#292b2e"),
      // "MainTextColorLight": this.settings.getEntry("main_text_color_light", String, "#8a8a8a"),
      // "MainBorderColor": this.settings.getEntry("main_border_color", String, "#2c936f"),

      "SuccessColor": this.settings.getEntry("success_color", String, "#28a745"),
      "FailColor": this.settings.getEntry("fail_color", String, "#dc3545"),
      "WarningColor": this.settings.getEntry("fail_color", String, "#ffc107"),
      "StateTextColor": this.settings.getEntry("state_text_color", String, "white"),
    };
    return Object.entries(values).reduce((currSettings, [name, value]) => {
      currSettings[`--${name}`] = value;
      return currSettings;
    }, {} as Record<string, any>);
  }
}
</script>

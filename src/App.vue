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
    :style="[styleSettings, colorVariables]"
  >
    <AlertBanner
      v-if="bannerMessage"
      :message="bannerMessage"
      :color-variables="bannerColorVariables"
      @banner-close="onBannerClose"
    />
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
import R from "ramda";
import { Component, Vue, Watch } from "vue-property-decorator";
import { namespace } from "vuex-class";
import { CurrentSettings } from "@/state/settings";
import ModalPortalTarget from "@/components/modal/ModalPortalTarget";
import FabCluster from "@/components/FabCluster/FabCluster.vue";
import AlertBanner from "@/components/AlertBanner.vue";
import { ErrorKey } from "@/state/errors";
import { getColorVariables, loadColorVariants } from "@/utils_colors";

const settings = namespace("settings");
const auth = namespace("auth");
const errors = namespace("errors");
const staging = namespace("staging");

@Component({ components: { ModalPortalTarget, FabCluster, AlertBanner } })
export default class App extends Vue {
  @settings.State("current") settings!: CurrentSettings;
  @auth.Action("startAuth") startAuth!: () => Promise<void>;
  @errors.State("errors") rawErrors!: Record<ErrorKey, string[]>;
  @staging.Mutation("setAutoSaveTimeout") setAutoSaveTimeout!: (_: number | null) => void;
  private colorVariables: any = null;

  created() {
    void this.startAuth();

    /* eslint-disable @typescript-eslint/unbound-method */
    document.addEventListener("copy", this.onCopy);
    document.addEventListener("cut", this.onCut);
    document.addEventListener("paste", this.onPaste);
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  destroyed() {
    /* eslint-disable @typescript-eslint/unbound-method */
    document.removeEventListener("copy", this.onCopy);
    document.removeEventListener("cut", this.onCut);
    document.removeEventListener("paste", this.onPaste);
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  private onCopy(event: ClipboardEvent) {
    this.$root.$emit("copy", event);
  }

  private onCut(event: ClipboardEvent) {
    this.$root.$emit("cut", event);
  }

  private onPaste(event: ClipboardEvent) {
    this.$root.$emit("paste", event);
  }

  get authErrors() {
    return this.rawErrors["auth"] || [];
  }

  @Watch("settings")
  private updateSettings() {
    const rawAutoSaveTimeout = Number(this.settings.getEntry("auto_save_timeout", String, "3"));
    const autoSaveTimeout = Number.isNaN(rawAutoSaveTimeout) ? null : rawAutoSaveTimeout * 1000;
    this.setAutoSaveTimeout(autoSaveTimeout);
    void this.loadColors();

    const html = document.querySelector("html");
    if (html) {
      html.style.fontSize = `${this.fontSize}px`;
    }
  }

  private async loadColors() {
    const colorVariants = await loadColorVariants();
    // TODO: genenrating variables for each component is not the best solution, would be cool to fix this.
    const componentsNames = [
      "table",
      "input",
      "form",
      "table",
      "tableCell",
      "menuEntry",
      "kanban",
      "kanbanCard",
      "interface",
      "refernece",
    ];

    const background = this.styleSettings["--OldMainBackgroundColor"];
    const foreground = this.styleSettings["--OldMainTextColor"];
    const border = this.styleSettings["--OldMainBorderColor"];
    const defaultVariant = getColorVariables("default", { background, foreground, border });

    this.colorVariables = R.mergeAll([
      defaultVariant,
      ...componentsNames.map(componentName => getColorVariables(componentName, "default")),
      ...colorVariants.map((variant: any) => getColorVariables(variant.name, variant)),
    ]);

    return Promise.resolve();
  }

  private get fontSize(): number {
    const defaultSize = 14;
    const normalSize = this.settings.getEntry("font_size", Number, defaultSize);
    const mobileSize = this.settings.getEntry("font_size_mobile", Number, 0);
    return this.$isMobile && mobileSize !== 0
      ? mobileSize
      : normalSize;
  }

  get styleSettings() {
    const values = {
      // "NavigationBackColor": this.settings.getEntry("navigation_back_color", String, "white"),
      "Font": this.settings.getEntry("font", String, "Courier New, monospace"),
      "FontSize": `${this.fontSize}px`,
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
      "OldMainTextColor": this.settings.getEntry("main_text_color", String, "#292b2c"),
      "OldMainBackgroundColor": this.settings.getEntry("main_background_color", String, "white"),
      "SecondaryBackgroundColor": this.settings.getEntry("secondary_background_color", String, "#f8f9fa"),
      "OldMainTextColorLight": this.settings.getEntry("main_text_color_light", String, "#6c757d"),
      "OldMainBorderColor": this.settings.getEntry("main_border_color", String, "#dee2e6"),
      "MainBorderTextColor": this.settings.getEntry("main_border_text_color", String, "#68766d"),

      // Dark Theme, do not remove
      // "MainTextColor": this.settings.getEntry("main_text_color", String, "#b2b2b2"),
      // "MainBackgroundColor": this.settings.getEntry("main_background_color", String, "#292b2e"),
      // "MainTextColorLight": this.settings.getEntry("main_text_color_light", String, "#8a8a8a"),
      // "MainBorderColor": this.settings.getEntry("main_border_color", String, "#2c936f"),

      "SuccessColor": this.settings.getEntry("success_color", String, "#28a745"),
      "FailColor": this.settings.getEntry("fail_color", String, "#dc3545"),
      "FailPlaceholderColor": this.settings.getEntry("fail_placeholder_color", String, "#2c0b0e"),
      "WarningColor": this.settings.getEntry("fail_color", String, "#ffc107"),
      "WarningPlaceholderColor": this.settings.getEntry("warning_placeholder_color", String, "#4c3a02"),
      "StateTextColor": this.settings.getEntry("state_text_color", String, "white"),

      "CellSelectColor": this.settings.getEntry("cell_select_color", String, "rgba(238,238,238,0.3)"),
    };
    return Object.entries(values).reduce((currSettings, [name, value]) => {
      currSettings[`--${name}`] = value;
      return currSettings;
    }, {} as Record<string, unknown>);
  }

  private get bannerMessage() {
    const message = this.settings.getEntry("banner_message", String, "");
    const isImportant = this.settings.getEntry("banner_important", Boolean, false);
    const viewedMessage = localStorage.getItem("viewed-banner-message");
    if (message.trim() === "" || (!isImportant && message === viewedMessage)) return "";
    return message;
  }

  private onBannerClose() {
    localStorage.setItem("viewed-banner-message", this.bannerMessage);
  }

  private get bannerColorVariables() {
    const variant = this.settings.getEntry("banner_variant", String, null);
    if (variant) {
      try {
        const parsed = JSON.parse(variant);
        return getColorVariables("banner", parsed);
      } catch {
        return getColorVariables("banner", variant);
      }
    }

    return null;
  }
}
</script>

<style lang="scss" scoped>
  #app {
    --MainTextColor: var(--default-foregroundColor, var(--OldMainTextColor)) !important;
    --MainTextColorLight: var(--default-foregroundDarkerColor, var(--OldMainTextColorLight)) !important;
    --MainBackgroundColor: var(--default-backgroundColor, var(--OldMainBackgroundColor)) !important;
    --MainBorderColor: var(--default-borderColor, var(--OldMainBorderColor)) !important;

    background-color: var(--default-backgroundColor);
    color: var(--default-foregroundColor);
  }
</style>

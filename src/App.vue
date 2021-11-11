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
    class="default-variant default-local-variant"
  >
    <AlertBanner
      v-if="bannerMessage"
      :message="bannerMessage"
      :show-invite-button="showInviteButtonInBanner"
      :color-variables="bannerColorVariables"
      @banner-close="onBannerClose"
    />

    <div class="app-container">
      <div v-if="!bannerMessage" class="main-buttons-wrapper">
        <ButtonsPanel
          class="main-buttons"
          :buttons="mainButtons"
          @goto="$emit('goto', $event)"
        />
      </div>

      <ModalPortalTarget
        name="tabbed-modal"
        multiple
      />

      <ReadonlyDemoInstanceModal
        v-if="isReadonlyDemoInstance"
        ref="readonlyDemoInstanceModal"
      />

      <InviteUserModal
        v-if="authToken"
        ref="inviteUserModal"
        :auth-token="authToken"
      />

      <HelpModal
        v-if="helpPageInfo"
        ref="helpModal"
        :markup="helpPageInfo.markup"
        @closed="onHelpModalClose"
        @dismiss="dismissHelpPage"
        @dismiss-all="dismissAllHelpPages"
      />

      <template v-if="authErrors.length > 0">
        <span
          v-for="error in authErrors"
          :key="error"
        >
          {{ $t("auth_error", { msg: error }) }}
        </span>
      </template>
      <router-view v-else />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import { namespace, Action } from "vuex-class";
import { IViewExprResult, IUserViewRef } from "ozma-api";

import { CurrentAuth, INoAuth } from "@/state/auth";
import { CurrentSettings } from "@/state/settings";
import ModalPortalTarget from "@/components/modal/ModalPortalTarget";
import FabCluster from "@/components/FabCluster/FabCluster.vue";
import { ErrorKey } from "@/state/errors";
import { colorVariantsToCssRules, bootstrapColorVariants, colorVariantFromRaw, transparentVariant } from "@/utils_colors";
import type { ThemeName } from "@/utils_colors";
import { eventBus } from "@/main";
import Api, { isReadonlyDemoInstance } from "@/api";
import { Button } from "./components/buttons/buttons";
import InviteUserModal from "./components/InviteUserModal.vue";

const settings = namespace("settings");
const auth = namespace("auth");
const errors = namespace("errors");
const staging = namespace("staging");

@Component({
  components: {
    ModalPortalTarget,
    FabCluster,
    InviteUserModal,
    AlertBanner: () => ({
      component: import("@/components/AlertBanner.vue") as any,
    }),
    ReadonlyDemoInstanceModal: () => ({
      component: import("@/components/ReadonlyDemoInstanceModal.vue") as any,
    }),
    HelpModal: () => ({
      component: import("@/components/HelpModal.vue") as any,
    }),
  },
})
export default class App extends Vue {
  @settings.State("current") settings!: CurrentSettings;
  @settings.State("currentTheme") currentTheme!: ThemeName;
  @auth.State("current") currentAuth!: CurrentAuth | INoAuth | null;
  @auth.Action("startAuth") startAuth!: () => Promise<void>;
  @Action("callProtectedApi") callProtectedApi!: (_: { func: ((_1: string, ..._2: any[]) => Promise<any>); args?: any[] }) => Promise<any>;
  @errors.State("errors") rawErrors!: Record<ErrorKey, string[]>;
  @staging.Mutation("setAutoSaveTimeout") setAutoSaveTimeout!: (_: number | null) => void;

  private helpPageInfo: {
    userViewRef: IUserViewRef;
    markupName: string;
    markup: string;
  } | null = null;

  created() {
    void this.startAuth();

    /* eslint-disable @typescript-eslint/unbound-method */
    document.addEventListener("copy", this.onCopy);
    document.addEventListener("cut", this.onCut);
    document.addEventListener("paste", this.onPaste);

    eventBus.on("showReadonlyDemoModal", this.showDemoModal);
    eventBus.on("showInviteUserModal", this.showInviteUserModal);
    eventBus.on("showHelpModal", this.showHelpModal);
    eventBus.on("updateMainButtons", this.updateMainButtons);
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  destroyed() {
    /* eslint-disable @typescript-eslint/unbound-method */
    document.removeEventListener("copy", this.onCopy);
    document.removeEventListener("cut", this.onCut);
    document.removeEventListener("paste", this.onPaste);

    eventBus.off("showReadonlyDemoModal", this.showDemoModal);
    eventBus.off("showInviteUserModal", this.showInviteUserModal);
    eventBus.off("showHelpModal", this.showHelpModal);
    eventBus.off("updateMainButtons", this.updateMainButtons);
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

  private mainButtons: Button[] = [];
  private updateMainButtons(mainButtons?: Button[]) {
    if (!mainButtons) return;

    this.mainButtons = mainButtons;
  }

  private get isReadonlyDemoInstance() {
    return isReadonlyDemoInstance;
  }

  private get authToken(): string | null {
    return this.currentAuth?.token ?? null;
  }

  get authErrors() {
    return this.rawErrors["auth"] ?? [];
  }

  private showDemoModal() {
    (this.$refs?.readonlyDemoInstanceModal as any)?.show();
  }

  private showInviteUserModal() {
    (this.$refs?.inviteUserModal as any)?.show();
  }

  private showHelpModal(args?: { userViewRef: IUserViewRef; markupName: string }) {
    if (this.helpPageInfo) return;

    if (!args) {
      console.error("No args for showHelpModal");
      return;
    }
    const { userViewRef, markupName } = args;

    const ref = { schema: "funapp", name: "iframe_markup_by_name" };
    void (this.callProtectedApi({
      func: Api.getNamedUserView.bind(Api),
      args: [ref, { "name": markupName }],
    }) as Promise<IViewExprResult>).then(res => {
      const markupRaw = (res.result.rows[0]?.values[0].value as string | undefined) ?? null;
      const markup = markupRaw ?? `Help page markup with name "${markupName}" not found.`;
      this.helpPageInfo = { userViewRef, markupName, markup };
    });
  }

  private onHelpModalClose() {
    this.helpPageInfo = null;
  }

  private dismissHelpPage() {
    if (!this.helpPageInfo) return;

    const { schema, name } = this.helpPageInfo.userViewRef;
    localStorage.setItem(`watched-help-page_${schema}.${name}`, this.helpPageInfo.markupName);
    eventBus.emit("localStorageUpdated");

    this.helpPageInfo = null;
  }

  private dismissAllHelpPages() {
    localStorage.setItem("dismiss-help-pages", "true");
    eventBus.emit("localStorageUpdated");
  }

  @Watch("settings")
  private updateSettings() {
    const rawAutoSaveTimeout = Number(this.settings.getEntry("auto_save_timeout", String, "3"));
    const autoSaveTimeout = Number.isNaN(rawAutoSaveTimeout) ? null : rawAutoSaveTimeout * 1000;
    this.setAutoSaveTimeout(autoSaveTimeout);

    const html = document.querySelector("html");
    if (html) {
      // `rem` in CSS is calculated only from `font-size` on `<html>`.
      html.style.fontSize = `${this.fontSize}px`;
    }

    const gtmId = this.settings.getEntry("google_tag_manager_container_id", String, null);
    if (gtmId) {
      const gtmScript = document.createElement("script");
      gtmScript.type = "text/javascript";
      gtmScript.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`;
      document.head.appendChild(gtmScript);
    }

    this.loadColors();
  }

  @Watch("currentTheme", { immediate: true })
  private loadColors() {
    const currentTheme = this.settings.themes.find(theme => theme.themeName.name === this.currentTheme);

    const background = this.styleSettings["--OldMainBackgroundColor"];
    const foreground = this.styleSettings["--OldMainTextColor"];
    const border = this.styleSettings["--OldMainBorderColor"];
    const oldDefaultVariant = colorVariantFromRaw({ background, foreground, border });
    const defaultVariant = currentTheme?.colorVariants["default"] ?? oldDefaultVariant;
    const interfaceButton = {
      ...transparentVariant,
      backgroundDarker1: "rgba(0, 0, 0, 0.2)",
      backgroundDarker2: "rgba(0, 0, 0, 0.4)",
      foreground: defaultVariant.foreground,
      foregroundContrast: defaultVariant.foregroundContrast,
      foregroundDarker: defaultVariant.foregroundDarker,
    };
    const defaultColorVariants = {
      default: defaultVariant,
      interfaceButton,
      menuEntry: interfaceButton,
    };
    const colorVariants = { ...bootstrapColorVariants, ...defaultColorVariants, ...currentTheme?.colorVariants };
    const rules = colorVariantsToCssRules(colorVariants);
    const sheet = (document.getElementById("theme-styles") as any)?.sheet as CSSStyleSheet | undefined;
    if (sheet) {
      while (sheet.cssRules.length > 0) {
        sheet.deleteRule(0);
      }

      for (const rule of rules) {
        sheet.insertRule(rule);
      }
    }
    /* console.log(sheet); */
  }

  private get showInviteButtonInBanner() {
    return this.settings.getEntry("show_invite_button_in_banner", Boolean, false) && this.authToken !== null;
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
      "Font": this.settings.getEntry("font", String, "Open Sans"),
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
      "OldMainTextColor": this.settings.getEntry("main_text_color", String, "#rgba(51, 51, 51, 1)"),
      "OldMainBackgroundColor": this.settings.getEntry("main_background_color", String, "white"),
      "SecondaryBackgroundColor": this.settings.getEntry("secondary_background_color", String, "#f8f9fa"),
      "OldMainTextColorLight": this.settings.getEntry("main_text_color_light", String, "rgba(153, 153, 153, 1)"),
      "OldMainBorderColor": this.settings.getEntry("main_border_color", String, "rgb(204, 204, 204)"),
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
    // TODO FIXME
    /*     const variant = this.settings.getEntry("banner_variant", String, null);
 *     if (variant) {
 *       try {
 *         const parsed = JSON.parse(variant);
 *         return getColorVariables("banner", parsed);
 *       } catch {
 *         return getColorVariables("banner", variant);
 *       }
 *     }
 *  */
    return null;
  }
}
</script>

<style lang="scss" scoped>
  #app {
    --MainTextColor: var(--foregroundColor, var(--OldMainTextColor)) !important;
    --MainTextColorLight: var(--foregroundDarkerColor, var(--OldMainTextColorLight)) !important;
    --MainBackgroundColor: var(--backgroundColor, var(--OldMainBackgroundColor)) !important;
    --MainBorderColor: var(--borderColor, var(--OldMainBorderColor)) !important;

    background-color: var(--backgroundDarker1Color);
    color: var(--foregroundColor);
  }

  @include variant-to-local("default");

  .app-container {
    position: relative;
    height: 100%;
    overflow: auto;
  }

  .main-buttons-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    padding: 0.2rem;
    background-color: var(--backgroundDarker1Color);
    border-bottom-right-radius: 0.25rem;
    z-index: 1000;
  }
</style>

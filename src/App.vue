<i18n>
    {
        "en": {
            "auth_error": "Error during authentication: {msg}"
        },
        "ru": {
            "auth_error": "Ошибка аутентификации: {msg}"
        },
        "es": {
            "auth_error": "El error durante la autenticación: {msg}"
        }
    }
</i18n>

<template>
  <div
    id="app"
    :data-window="uid"
    :style="styleSettings"
    class="default-variant default-local-variant"
  >
    <AlertBanner
      v-if="bannerMessage"
      :message="bannerMessage"
      :show-contact-button="showContactButtonInBanner"
      :show-sign-up-button="showSignUpButtonInBanner"
      :show-invite-button="showInviteButtonInBanner"
      :color-variables="bannerColorVariables"
      @banner-close="onBannerClose"
    />

    <div class="app-container">
      <div v-if="!bannerMessage" class="main-buttons-wrapper">
        <portal-target name="main-buttons" />
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
        v-if="hasAuth"
        ref="inviteUserModal"
      />

      <HelpModal
        v-if="helpPageInfo"
        ref="helpModal"
        :markup="helpPageInfo.markup"
        @closed="onHelpModalClose"
        @dismiss="dismissHelpPage"
        @dismiss-all="dismissAllHelpPages"
        @goto="push({ ...$event, key: null })"
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
import { IViewExprResult } from "ozma-api";
import moment from "moment";

// TODO: import all languages from instance settings
import "moment/locale/es";
import "moment/locale/ru";

import { CurrentAuth, INoAuth } from "@/state/auth";
import { CurrentSettings } from "@/state/settings";
import type { WindowKey } from "@/state/windows";
import ModalPortalTarget from "@/components/modal/ModalPortalTarget";
import { ErrorKey } from "@/state/errors";
import { colorVariantsToCssRules, bootstrapColorVariants, colorVariantFromRaw, transparentVariant, IThemeRef, ITheme } from "@/utils_colors";
import { eventBus, IShowHelpModalArgs } from "@/main";
import Api, { IEmbeddedPageRef } from "@/api";
import InviteUserModal from "./components/InviteUserModal.vue";
import { EntityRef } from "./links";
import { safeJsonParse } from "./utils";
import { equalEntityRef } from "./values";
import { IQuery, QueryKey } from "./state/query";
import { Language } from "./state/translations";

const settings = namespace("settings");
const auth = namespace("auth");
const errors = namespace("errors");
const staging = namespace("staging");
const windows = namespace("windows");
const query = namespace("query");
const translations = namespace("translations");
import { type UserString } from "@/state/translations";
import { setHeadMeta, setHeadLink } from "@/elements";

@Component({
  components: {
    ModalPortalTarget,
    InviteUserModal,
    AlertBanner: () => import("@/components/AlertBanner.vue"),
    ReadonlyDemoInstanceModal: () => import("@/components/ReadonlyDemoInstanceModal.vue"),
    HelpModal: () => import("@/components/HelpModal.vue"),
  },
})
export default class App extends Vue {
  @Action("callProtectedApi") callProtectedApi!: (_: { func: ((_1: string, ..._2: any[]) => Promise<any>); args?: any[] }) => Promise<any>;
  @settings.State("current") settings!: CurrentSettings;
  @settings.State("currentThemeRef") currentThemeRef!: IThemeRef | null;
  @settings.Getter("language") language!: string;
  @auth.State("current") currentAuth!: CurrentAuth | INoAuth | null;
  @auth.Action("startAuth") startAuth!: () => Promise<void>;
  @errors.State("errors") rawErrors!: Record<ErrorKey, string[]>;
  @errors.State("silent") silentErrors!: boolean;
  @staging.Mutation("setAutoSaveTimeout") setAutoSaveTimeout!: (_: number | null) => void;
  @windows.Mutation("createWindow") createWindow!: (_: WindowKey) => void;
  @windows.Mutation("destroyWindow") destroyWindow!: (_: WindowKey) => void;
  @query.Action("push") push!: (_: { key: QueryKey; query: IQuery }) => Promise<void>;
  @translations.Action("getTranslations") getTranslations!: (_: Language) => Promise<void>;

  private helpPageInfo: {
    key: string | null;
    ref: IEmbeddedPageRef;
    markup: string;
  } | null = null;

  created() {
    void this.startAuth();

    this.createWindow(this.uid);

    /* eslint-disable @typescript-eslint/unbound-method */
    document.addEventListener("copy", this.onCopy);
    document.addEventListener("cut", this.onCut);
    document.addEventListener("paste", this.onPaste);

    eventBus.on("show-readonly-demo-modal", this.showDemoModal);
    eventBus.on("show-invite-user-modal", this.showInviteUserModal);
    eventBus.on("show-help-modal", this.showHelpModal);
    eventBus.on("close-all-toasts", this.closeAllToasts);
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  destroyed() {
    /* eslint-disable @typescript-eslint/unbound-method */
    document.removeEventListener("copy", this.onCopy);
    document.removeEventListener("cut", this.onCut);
    document.removeEventListener("paste", this.onPaste);

    eventBus.off("show-readonly-demo-modal", this.showDemoModal);
    eventBus.off("show-invite-user-modal", this.showInviteUserModal);
    eventBus.off("show-help-modal", this.showHelpModal);
    eventBus.off("close-all-toasts", this.closeAllToasts);
    /* eslint-enable @typescript-eslint/unbound-method */

    this.destroyWindow(this.uid);
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

  private get isReadonlyDemoInstance() {
    return this.settings.getEntry("is_read_only_demo_instance", Boolean, false) && !this.hasAuth;
  }

  private get hasAuth() {
    return Boolean(this.currentAuth?.refreshToken);
  }

  get authErrors() {
    return this.silentErrors ? [] : (this.rawErrors["auth"] ?? []);
  }

  private showDemoModal() {
    (this.$refs?.readonlyDemoInstanceModal as any)?.show();
  }

  private showInviteUserModal() {
    (this.$refs?.inviteUserModal as any)?.show();
  }

  private showHelpModal(args: IShowHelpModalArgs) {
    void (async () => {
      if (this.helpPageInfo) return;

      if (args.skipIfShown) {
        const dismissHelpPages = Boolean(localStorage.getItem("dismissHelpPages"));
        if (dismissHelpPages) {
          return;
        }

        if (args.key !== null) {
          const watchedRef = EntityRef.safeParse(safeJsonParse(localStorage.getItem(`watchedHelpPage_${args.key}`)));
          const alreadyWatched = watchedRef.success ? equalEntityRef(args.ref, watchedRef.data) : false;
          if (alreadyWatched) {
            return;
          }
        }
      }

      const uvRef = { schema: "funapp", name: "embedded_page_by_name" };
      const res: IViewExprResult = await this.callProtectedApi({
        func: Api.getNamedUserView.bind(Api),
        args: [uvRef, args.ref],
      });

      const markupRaw = (res.result.rows[0]?.values[0].value as string | undefined) ?? null;
      const markup = markupRaw ?? `Help page markup with name "${args.ref.schema}"."${args.ref.name}" not found.`;
      this.helpPageInfo = { key: args.key, ref: args.ref, markup };
    })();
  }

  private onHelpModalClose() {
    this.helpPageInfo = null;
  }

  private dismissHelpPage() {
    if (!this.helpPageInfo) return;

    localStorage.setItem(`watchedHelpPage_${this.helpPageInfo.key}`, JSON.stringify(this.helpPageInfo.ref));

    this.helpPageInfo = null;
  }

  private dismissAllHelpPages() {
    localStorage.setItem("dismissHelpPages", "true");
    this.helpPageInfo = null;
  }

  private closeAllToasts() {
    this.$bvToast.hide();
  }

  get url(): UserString {
    return `${window.location.protocol}://${window.location.host}${this.$route.fullPath}`;
  }

  @Watch("language", { immediate: true })
  private updateLanguage() {
    this.$root.$i18n.locale = this.language;
  }

  @Watch("$i18n.locale", { immediate: true })
  private loadLanguage(language: string) {
    moment.locale(language);
    void this.getTranslations(language);
  }

  @Watch("settings", { immediate: true })
  private updateSettings() {
    const rawAutoSaveTimeout = Number(this.settings.getEntry("auto_save_timeout", String, "1"));
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

  @Watch("url", { immediate: true })
  private updateUrl(url: UserString) {
    const urlString = `${this.$ust(url)}`;
    setHeadLink("canonical", urlString);
    setHeadMeta("property", "og:url", urlString);
  }

  /* So, about themeing:
   * 1. We use color variants to theme components.
   *    Color variant is set of colors: several shades of background color, several shades of foreground color, border color, etc.
   *    We need to define at least main background-color and others will be generated based on it.
   * 2. Color varaints can be static and custom.
   *    Static ones are defined in system table funapp.color_variants, custom ones are defined right in attributes.
   * 3. Variants are bound to specific color theme.
   *    We have two "magic" themes, "ligth" and "dark", and custom ones can be created.
   * 4. We have hard-coded variants with colors from Bootstrap-variants and some others not so hard-coded, like "interfaceButton".
   *    For example, variant "default" is used for almost everything if not otherwise specified.
   * 5. After loading tables with themes and variants we generate text of CSS-stylesheet (yep) with class for each variant for current theme.
   *    Each class (with names like `.default-variant`) contains CSS-variable definition for each color in variant with format `--{color name}Color`, like `--backgroundColor`.
   *    And we inject this stylesheet into DOM.
   * 6. So now we need to get variables for some components.
   *    For this we need to use SCSS-mixin `variant-to-local`, for example `@include variant-to-local('componentName')`,
   *    which creates CSS-class `componentName-local-variant`, which translates variables to format `--{componentName}-{color name}Color`,
   *    so we can "just" apply to our component our desired varaint-class and local-variant-class (like `class="primary-variant button-local-variant"` for button and variant "primary")
   *    and we can use variables like `--button-backgroundColor` in styles.
   *    And it supports CSS-cascading and doesn't affected by scoping, so we have `class="default-variant default-local-variant"` in <App /> and we use this variables in many places.
   * 7. Custom/inline variants works similar but a little simpler, but I'm too tired to explain, sorry.
   */
  get themeStyleSettings() {
    let currentTheme: ITheme | undefined;
    if (this.currentThemeRef !== null) {
      currentTheme = this.settings.themes[this.currentThemeRef.schema][this.currentThemeRef.name];
    }

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
    return colorVariantsToCssRules(colorVariants);
  }

  @Watch("themeStyleSettings", { immediate: true })
  private loadColors() {
    const sheet = (document.getElementById("theme-styles") as any)?.sheet as CSSStyleSheet | undefined;
    if (sheet) {
      while (sheet.cssRules.length > 0) {
        sheet.deleteRule(0);
      }

      for (const rule of this.themeStyleSettings) {
        sheet.insertRule(rule);
      }
    }
  }

  private get showContactButtonInBanner() {
    return this.settings.getEntry("show_contact_button_in_banner", Boolean, false);
  }

  private get showSignUpButtonInBanner() {
    return this.settings.getEntry("show_sign_up_button_in_banner", Boolean, false);
  }

  private get showInviteButtonInBanner() {
    return this.settings.getEntry("show_invite_button_in_banner", Boolean, false) && this.hasAuth;
  }

  private get fontSize(): number {
    const defaultSize = 14;
    const normalSize = this.settings.getEntry("font_size", Number, defaultSize);
    const mobileSize = this.settings.getEntry("font_size_mobile", Number, 14);
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

    background-color: var(--backgroundColor);
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
    padding-top: 0.75rem;
    padding-bottom: 0.6rem;
    padding-left: 0.9rem;
    padding-right: 0.5rem;
    top: 0;
    left: 0;
    background-color: var(--backgroundColor);
    border-bottom-right-radius: 0.25rem;
    z-index: 1000;
  }
</style>

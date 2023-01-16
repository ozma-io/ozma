<i18n>
    {
        "en": {
            "new_entry": "New entry",
            "search_placeholder": "Type to search",
            "pending_changes": "Saving",
            "loading": "Now loading",
            "save": "Save (Ctrl+S)",
            "saved": "All changes saved",
            "auto_save_disabled": "Auto-save disabled. Data will be saved on manual save or on jump to different user view.",
            "show_errors": "Show errors",
            "clear_changes": "Reset changes after last save",
            "clear_changes_confirm": "Reset changes after last save?",
            "clear_changes_ok": "Clear",
            "cancel": "Cancel",
            "account": "Account",
            "theme": "Theme",
            "invite_user": "Invite",
            "workspaces": "Workspaces",
            "documentation": "Documentation",
            "login": "Login",
            "logout": "Logout",
            "auth_error": "Authentication error: {msg}",
            "user_view_error": "Failed to fetch user view: {msg}",
            "staging_error": "Error while submitting changes: {msg}",
            "settings_error": "Failed to fetch settings: {msg}",
            "select_user_view_error": "Failed to select an entry: {msg}",
            "base_user_view_error": "Failed to perform an operation: {msg}",
            "error": "Error",
            "forget_dismissed_help_pages": "Forget dismissed help pages",
            "enable_development_mode": "Enable development mode",
            "disable_development_mode": "Disable development mode",
            "development_mode_indicator": "Development mode is on",
            "change_language": "Language",
            "en": "English",
            "es": "Spanish (Español)",
            "ru": "Russian (Русский)",
            "authed_link": "Copy link with authorization"
        },
        "ru": {
            "new_entry": "Новая запись",
            "search_placeholder": "Поиск",
            "pending_changes": "Сохраняется",
            "loading": "Загрузка данных",
            "save": "Сохранить (Ctrl+S)",
            "saved": "Все изменения сохранены",
            "auto_save_disabled": "Автосохранение отключено. Данные сохранятся при ручном сохранении или при переходе на другое представление.",
            "show_errors": "Показать ошибки",
            "clear_changes": "Сбросить все изменения",
            "clear_changes_confirm": "Сбросить все изменения с последнего сохранения?",
            "clear_changes_ok": "Сбросить",
            "cancel": "Отмена",
            "account": "Профиль",
            "theme": "Тема",
            "invite_user": "Пригласить",
            "workspaces": "Базы",
            "documentation": "Документация",
            "login": "Войти",
            "logout": "Выйти",
            "auth_error": "Ошибка авторизации: {msg}",
            "user_view_error": "Ошибка получения представления: {msg}",
            "staging_error": "Ошибка сохранения изменений: {msg}",
            "settings_error": "Ошибка получения настроек: {msg}",
            "select_user_view_error": "Ошибка выбора записи: {msg}",
            "base_user_view_error": "Ошибка выполнения операции: {msg}",
            "error": "Ошибка",
            "forget_dismissed_help_pages": "Сбросить пропущенные страницы помощи",
            "enable_development_mode": "Включить режим разработки",
            "disable_development_mode": "Выключить режим разработки",
            "development_mode_indicator": "Включён режим разработки",
            "change_language": "Язык",
            "en": "Английский (English)",
            "es": "Испанский (Español)",
            "ru": "Русский",
            "authed_link": "Скопировать ссылку с авторизацией"
        },
        "es": {
            "new_entry": "La nueva entrada",
            "search_placeholder": "Teclea para buscar",
            "pending_changes": "La grabación",
            "loading": "Ahora está cargando",
            "save": "Guarder (Ctrl+S)",
            "saved": "Todos los cambios estuvieron guardados",
            "auto_save_disabled": "El guardado automático desactivado. Los datos se guardarán en el guardado manual o en el salto a una vista de usuario diferente",
            "show_errors": "Mostrar los  errores",
            "clear_changes": "Restablecer los cambios después del último guardado",
            "clear_changes_confirm": "¿Restablecer los cambios después del último guardado?",
            "clear_changes_ok": "Eliminar",
            "cancel": "Cancelar",
            "account": "La cuenta",
            "theme": "El tema",
            "invite_user": "Invitar",
            "workspaces": "Espacios de Trabajo",
            "documentation": "La documentación",
            "login": "La sesión",
            "logout": "Cerrar la sesión",
            "auth_error": "El error de la autenticación: {msg}",
            "user_view_error": "El error al recuperar la vista de usuario: {msg}",
            "staging_error": "El error al enviar cambios: {msg}",
            "settings_error": "El error al recuperar la configuración: {msg}",
            "select_user_view_error": "El error al seleccionar una entrada: {msg}",
            "base_user_view_error": "El error al realizar una operación: {msg}",
            "error": "El error",
            "forget_dismissed_help_pages": "Olvidar de las páginas de ayuda",
            "enable_development_mode": "Habilitar el modo de desarrollo",
            "disable_development_mode": "Deshabilitar el modo de desarrollo",
            "development_mode_indicator": "El modo de desarrollo está activado",
            "change_language": "El idioma",
            "en": "Inglés (English)",
            "es": "Español",
            "ru": "Ruso (Русский)",
            "authed_link": "Copiar el enlace con autorización"
        }
    }
</i18n>

<template>
  <div class="main-div">
    <portal to="main-buttons">
      <ButtonsPanel
        class="main-buttons"
        :buttons="mainButtons"
        @goto="pushRoot"
      />
    </portal>
    <template v-if="query !== null">
      <ModalUserView
        v-for="(window, i) in query.windows"
        ref="modalUserViews"
        :key="window.key"
        is-root
        :view="window.query"
        :autofocus="query.selectedWindow === i"
        @close="closeWindow(i)"
        @go-back-window="goBackWindow(i)"
        @goto-previous="gotoPreviousWindow(i)"
        @goto="pushWindow({index: i, query: $event})"
      />
    </template>

    <div :class="'userview-upper-div'">
      <HeaderPanel
        :title="titleOrNewEntry ?? undefined"
        :buttons="buttons"
        :is-enable-filter="enableFilter"
        :filter-string="query.root.search"
        :type="'root'"
        @update:filter-string="replaceRootSearch($event)"
        @goto="pushRoot"
      >
        <template #main-buttons>
          <ButtonsPanel
            :buttons="mainButtons"
            @goto="pushRoot"
          />
        </template>
      </HeaderPanel>
      <div
        class="userview-div"
      >
        <UserView
          is-root
          is-top-level
          in-container
          :args="query.root.args"
          :filter="filterWords"
          :default-values="query.root.defaultValues"
          scope="root"
          @goto="pushRoot"
          @goto-previous="gotoPreviousRoot"
          @update:buttons="buttons = $event"
          @update:status-line="statusLine = $event"
          @update:enable-filter="enableFilter = $event"
          @update:body-style="styleNode.innerHTML = $event"
          @update:title="title = $event"
          @update:current-page="replaceRootPage($event)"
        />
      </div>
    </div>
    <nav
      v-if="bottomBarNeeded"
      class="fix-bot"
    >
      <div class="status-line">
        {{ statusLine }}
      </div>
    </nav>

    <div
      :class="[
        'save-cluster',
        {
          'is-mobile': $isMobile,
        },
      ]"
    >
      <transition name="fade-2">
        <button
          v-if="canClearUnsavedChanges"
          v-b-tooltip.hover.right.noninteractive="{
            title: $t('clear_changes').toString(),
            disabled: $isMobile,
          }"
          class="save-cluster-button reset-changes-button shadow"
          @click="resetChanges"
        >
          <span
            class="material-icons md-36"
          >
            restart_alt
          </span>
        </button>
      </transition>

      <transition name="fade-2">
        <button
          v-if="errors.length > 0"
          v-b-tooltip.hover.right.noninteractive="{
            title: $t('show_errors').toString(),
            disabled: $isMobile,
          }"
          class="save-cluster-button show-errors-button shadow"
          @click="makeErrorToast"
        >
          <span
            class="material-icons md-36"
          >
            help_outline
          </span>
        </button>
      </transition>

      <transition name="fade-2" mode="out-in">
        <div
          v-if="( !changes.isEmpty && isSaving ) || isLoading"
          class="saving-spinner spinner-border"
        />
        <div
          v-else-if="!changes.isEmpty"
        >
          <div
            v-if="Object.keys(autoSaveLocks).length > 0"
            v-b-tooltip.hover.right.noninteractive="{
              title: $t('auto_save_disabled').toString(),
              disabled: $isMobile,
            }"
            class="auto-save-indicator"
          >
            <span
              class="material-icons md-36"
            >
              timer_off
            </span>
          </div>
          <button
            v-b-tooltip.hover.right.noninteractive="{
              title: $t('save').toString(),
              disabled: $isMobile,
            }"
            :class="['save-cluster-button save-button shadow', {
              'save': !changes.isEmpty,
            }]"
            @click.capture.stop="saveView"
          >
            <span
              class="material-icons md-36"
            >
              save
            </span>
          </button>
        </div>
        <div
          v-else-if="( !$isMobile || savedRecently.show )"
          v-b-tooltip.hover.right.noninteractive="{
            title: $t('saved').toString(),
            disabled: $isMobile,
          }"
          class="save-cluster-indicator"
        >
          <span
            class="material-icons md-36"
          >
            cloud_done
          </span>
        </div>
      </transition>

      <div
        v-if="allowBusinessMode && !settingsPending && developmentModeEnabled"
        v-b-tooltip.hover.right.noninteractive="{
          title: $t('development_mode_indicator').toString(),
        }"
        class="development-mode-indicator"
      >
        <span class="material-icons md-36">developer_mode</span>
      </div>
    </div>
    <QRCodeScannerModal
      ref="scanner"
      multi-scan
      :link="currentQRCodeLink"
      @before-push-root="currentQRCodeLink = null"
    />
  </div>
</template>

<script lang="ts">
import { Route } from "vue-router";
import { Component, Vue, Watch } from "vue-property-decorator";
import { namespace } from "vuex-class";

import * as Api from "@/api";
import { eventBus } from "@/main";
import { setHeadTitle } from "@/elements";
import { ErrorKey } from "@/state/errors";
import { CombinedTransactionResult, CurrentChanges, ISubmitResult, ScopeName } from "@/state/staging_changes";
import ModalUserView from "@/components/ModalUserView.vue";
import ProgressBar from "@/components/ProgressBar.vue";
import { CurrentAuth, getAuthedLink, INoAuth } from "@/state/auth";
import { IQuery, ICurrentQueryHistory } from "@/state/query";
import { convertToWords, homeLink } from "@/utils";
import { Link } from "@/links";
import type { Button } from "@/components/buttons/buttons";
import HeaderPanel from "@/components/panels/HeaderPanel.vue";
import { CurrentSettings, DisplayMode } from "@/state/settings";
import { interfaceButtonVariant, defaultVariantAttribute, bootstrapVariantAttribute, IThemeRef } from "@/utils_colors";
import QRCodeScannerModal from "./qrcode/QRCodeScannerModal.vue";
import { UserString } from "@/state/translations";

const auth = namespace("auth");
const staging = namespace("staging");
const settings = namespace("settings");
const query = namespace("query");
const errors = namespace("errors");

@Component({
  components: {
    ModalUserView,
    ProgressBar,
    QRCodeScannerModal,
    HeaderPanel,
  },
  /* Two hooks below catches only browser navigation buttons,
   * other ways of changing current page are handled in query module.
   */
  async beforeRouteUpdate(this: TopLevelUserView, to: Route, from: Route, next: any) {
    try {
      await this.submitChanges({ errorOnIncomplete: true });
      next();
    } catch (_) {
      next(false);
    }
  },
  async beforeRouteLeave(this: TopLevelUserView, to: Route, from: Route, next: any) {
    try {
      await this.submitChanges({ errorOnIncomplete: true });
      next();
    } catch (_) {
      next(false);
    }
  },
})
export default class TopLevelUserView extends Vue {
  @auth.State("current") currentAuth!: CurrentAuth | INoAuth | null;
  @auth.State("pending") authPending!: Promise<void> | null;
  @auth.State("protectedCalls") protectedCalls!: number;
  @auth.Action("login") login!: () => Promise<void>;
  @auth.Action("logout") logout!: () => Promise<void>;
  @staging.State("current") changes!: CurrentChanges;
  @staging.Action("submit") submitChanges!: (_: { scope?: ScopeName; preReload?: () => Promise<void>; errorOnIncomplete?: boolean }) => Promise<ISubmitResult>;
  @staging.Action("reset") clearChanges!: () => Promise<void>;
  @query.State("current") query!: ICurrentQueryHistory | null;
  @query.Action("resetRoute") resetRoute!: (_: Route) => void;
  @query.Action("pushRoot") pushRoot!: (_: IQuery) => Promise<void>;
  @query.Action("replaceRootSearch") replaceRootSearch!: (_: string) => Promise<void>;
  @query.Action("replaceRootPage") replaceRootPage!: (_: number) => Promise<void>;
  @query.Action("closeWindow") closeWindow!: (_: number) => Promise<void>;
  @query.Action("pushWindow") pushWindow!: (_: { index: number; query: IQuery }) => Promise<void>;
  @query.Action("goBackRoot") goBackRoot!: () => Promise<void>;
  @query.Action("goBackWindow") goBackWindow!: (windowIndex: number) => Promise<void>;
  @errors.Mutation("removeError") removeError!: (params: { key: ErrorKey; index: number }) => void;
  @errors.Mutation("reset") resetErrors!: () => void;
  @errors.State("errors") rawErrors!: Record<ErrorKey, string[]>;
  @errors.State("silent") silentErrors!: boolean;
  @settings.State("current") currentSettings!: CurrentSettings;
  @settings.State("pending") settingsPending!: Promise<CurrentSettings> | null;
  @settings.State("userIsRoot") userIsRoot!: boolean;
  @settings.Getter("developmentModeEnabled") developmentModeEnabled!: boolean;
  @settings.Action("setCurrentTheme") setCurrentTheme!: (theme: IThemeRef) => Promise<void>;
  @staging.State("autoSaveLocks") autoSaveLocks!: Object | null;
  @settings.Action("setDisplayMode") setDisplayMode!: (mode: DisplayMode) => Promise<void>;
  @settings.Action("writeUserSettings") writeUserSettings!: (setting: { name: string; value: string }) => Promise<void>;

  private statusLine = "";
  private enableFilter = false;
  private styleNode!: HTMLStyleElement;
  private title: UserString | null = null;

  private buttons: Button[] = [];

  private savedRecently: { show: boolean; timeoutId: NodeJS.Timeout | null } = {
    show: false,
    timeoutId: null,
  };

  private currentQRCodeLink: Link | null = null;

  private get isSaving(): boolean {
    return this.protectedCalls > 0;
  }

  get titleOrNewEntry(): string | null {
    if (this.query === null) {
      return null;
    }
    if (this.query.root.args.args === null) {
      return this.$t("new_entry").toString();
    } else {
      return this.title ? this.$ust(this.title) : null;
    }
  }

  get stringTitle(): string | null {
    return this.title ? this.$ust(this.title) : null;
  }

  private get mainButtons(): Button[] {
    return [
      {
        type: "callback",
        icon: "arrow_back",
        variant: interfaceButtonVariant,
        /* disabled: !this.query?.root.previous, */
        /* callback: () => this.goBackRoot(), */
        callback: () => this.$router.go(-1),
      },
      {
        type: "link",
        icon: "home",
        variant: interfaceButtonVariant,
        link: homeLink,
      },
      this.burgerButton,
    ];
  }

  mounted() {
    /* eslint-disable @typescript-eslint/unbound-method */
    this.$root.$on("open-qrcode-scanner", this.openQRCodeScanner);
    document.addEventListener("keydown", this.onKeydown);
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  destroyed() {
    this.styleNode.remove();

    /* eslint-disable @typescript-eslint/unbound-method */
    this.$root.$off("open-qrcode-scanner", this.openQRCodeScanner);
    document.removeEventListener("keydown", this.onKeydown);
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  private get themeButtons(): Button[] {
    const locale = this.$i18n.locale;
    return Object.entries(this.currentSettings.themes).flatMap(([schemaName, themesSchema]) => {
      return Object.entries(themesSchema).map(([themeName, theme]) => {
        const ref = {
          schema: schemaName,
          name: themeName,
        };
        let name: string;
        if (locale in theme.localized) {
          name = theme.localized[locale];
        } else if ("en" in theme.localized) {
          name = theme.localized["en"];
        } else {
          name = `${schemaName}.${themeName}`;
        }
        return {
          caption: name,
          variant: defaultVariantAttribute,
          type: "callback",
          callback: () => this.setCurrentTheme(ref),
        };
      });
    });
  }

  private onKeydown(event: KeyboardEvent) {
    // 83 is code for `s`/`ы` key.
    if ((event.ctrlKey || event.metaKey) && (event.key === "s" || event.keyCode === 83)) {
      event.preventDefault();
      void this.saveView();
    }

    if (event.ctrlKey && event.key === "D") {
      event.preventDefault();

      this.toggleDeveloperMode();
    }
  }

  private openQRCodeScanner(link: Link | null) {
    if (link !== null) {
      this.currentQRCodeLink = link;
      (this.$refs.scanner as QRCodeScannerModal).scan();
    }
  }

  get errors() {
    if (this.silentErrors) {
      return [];
    } else {
      return Object.entries(this.rawErrors).flatMap(([key, keyErrors]) => keyErrors.map(error => {
        const translationKey = `${key}_error`;
        if (this.$te(translationKey)) {
          return this.$t(translationKey, { msg: error });
        } else {
          return error;
        }
      }));
    }
  }

  get isLoading(): boolean {
    return this.authPending !== null || this.protectedCalls > 0;
  }

  get filterWords() {
    const value = this.query!.root.search;
    if (value !== undefined) {
      return Array.from(new Set(convertToWords(value.toString())));
    }
    return [];
  }

  private gotoPreviousRoot() {
    const previous = this.query?.root.previous;
    if (previous) {
      void this.pushRoot(previous);
    }
  }

  private gotoPreviousWindow(i: number) {
    const previous = this.query?.windows[i].query.previous;
    if (previous) {
      void this.pushWindow({ index: i, query: previous });
    }
  }

  private makeErrorToast() {
    this.$bvToast.hide();
    this.errors.forEach(error => {
      this.$bvToast.toast(error.toString(), {
        title: this.$t("error").toString(),
        variant: "danger",
        solid: true,
        autoHideDelay: 10000,
      });
    });
  }

  private get canClearUnsavedChanges() {
    return this.errors.length !== 0 && !this.changes.isEmpty;
  }

  @Watch("$route", { deep: true, immediate: true })
  private onRouteChanged() {
    this.resetRoute(this.$route);
  }

  @Watch("errors")
  private errorsChanged() {
    if (this.errors.length > 0) {
      this.makeErrorToast();
    }
  }

  @Watch("stringTitle", { immediate: true })
  private updateTitle(title: string | null) {
    const head = title ? `${title} — Ozma` : "Ozma";
    setHeadTitle(head);
  }

  private created() {
    this.styleNode = document.createElement("style");
    document.head.appendChild(this.styleNode);
  }

  private async resetChanges() {
    try {
      await this.$bvModal.msgBoxConfirm(this.$t("clear_changes_confirm").toString(), {
        okTitle: this.$t("clear_changes_ok").toString(),
        cancelTitle: this.$t("cancel").toString(),
        okVariant: "danger",
        cancelVariant: "outline-secondary",
        centered: true,
      });
    } catch (e) {
      return;
    }
    await this.clearChanges();
    this.resetErrors();
    this.$bvToast.hide();
  }

  private async saveChanges(): Promise<CombinedTransactionResult[]> {
    const scopes = Object.keys(this.changes.scopes);
    if (scopes.length === 0) {
      const ret = await this.submitChanges({ errorOnIncomplete: true });
      return ret.results;
    } else {
      const results: CombinedTransactionResult[] = [];
      for (const scope of scopes) {
        // eslint-disable-next-line no-await-in-loop
        const ret = await this.submitChanges({ scope, errorOnIncomplete: true });
        results.push(...ret.results);
      }
      return results;
    }
  }

  private async saveView() {
    await this.saveChanges();

    if (this.errors.length === 0) {
      this.$bvToast.hide();
    }

    if (this.savedRecently.timeoutId !== null) {
      clearTimeout(this.savedRecently.timeoutId);
    }
    this.savedRecently.show = true;
    this.savedRecently.timeoutId = setTimeout(() => {
      this.savedRecently.show = false;
    }, 5000);
  }

  private get allowBusinessMode() {
    return this.currentSettings.getEntry("allow_business_mode", Boolean, false);
  }

  private toggleDeveloperMode() {
    if (this.allowBusinessMode && this.userIsRoot) {
      void this.setDisplayMode(this.developmentModeEnabled ? "business" : "development");
    }
  }

  get burgerButton() {
    const buttons: Button[] = [];

    if (this.currentAuth?.refreshToken) {
      buttons.push({
        icon: "person_add",
        caption: this.$t("invite_user").toString(),
        variant: defaultVariantAttribute,
        type: "callback",
        callback: () => eventBus.emit("show-invite-user-modal"),
      });
    }

    if (this.themeButtons.length > 0) {
      buttons.push({
        icon: "palette",
        caption: this.$t("theme").toString(),
        type: "button-group",
        buttons: this.themeButtons,
        variant: defaultVariantAttribute,
      });
    }

    buttons.push({
      icon: "language",
      caption: this.$t("change_language").toString(),
      variant: defaultVariantAttribute,
      type: "button-group",
      buttons: ["en", "es", "ru"].map(language =>
        ({
          caption: this.$t(language).toString(),
          variant: defaultVariantAttribute,
          type: "callback",
          callback: () => {
            void this.writeUserSettings({ name: "language", value: language });
          },
        })),
    });

    if (this.currentAuth?.refreshToken) {
      if (this.allowBusinessMode && this.userIsRoot) {
        buttons.push({
          icon: "developer_mode",
          caption: this.$t(this.developmentModeEnabled ? "disable_development_mode" : "enable_development_mode").toString() + " (Ctrl+Shift+D)",
          type: "callback",
          callback: () => this.toggleDeveloperMode(),
          variant: this.developmentModeEnabled ? bootstrapVariantAttribute("warning") : bootstrapVariantAttribute("info"),
          keepButtonGroupOpened: true,
        });
      }

      if (this.developmentModeEnabled) {
        buttons.push({
          icon: "help_center",
          caption: this.$t("documentation").toString(),
          variant: bootstrapVariantAttribute("info"),
          type: "link",
          link: { type: "href", href: "https://wiki.ozma.io", target: "blank" },
        });

        buttons.push({
          icon: "view_list",
          caption: this.$t("workspaces").toString(),
          variant: bootstrapVariantAttribute("info"),
          type: "link",
          link: { type: "href", href: "https://admin.ozma.io", target: "blank" },
        });

        if (Api.developmentMode) {
          const currentAuth = this.currentAuth;
          buttons.push({
            icon: "link",
            caption: this.$t("authed_link").toString(),
            variant: bootstrapVariantAttribute("info"),
            type: "callback",
            callback: () => {
              const link = getAuthedLink(currentAuth);
              void navigator.clipboard.writeText(link);
            },
          });
        }

        buttons.push({
          icon: "layers_clear",
          caption: this.$t("forget_dismissed_help_pages").toString(),
          variant: bootstrapVariantAttribute("info"),
          type: "callback",
          callback: () => {
            const allKeys = Object.keys(localStorage);
            const keys = ["dismissHelpPages", ...allKeys.filter(key => key.startsWith("watchedHelpPage_"))];
            for (const key of keys) {
              localStorage.removeItem(key);
            }
          },
        });
      }
      buttons.push({
        icon: "perm_identity",
        caption: this.$t("account").toString(),
        type: "link",
        link: { href: Api.accountUrl, type: "href", target: "blank" },
        variant: defaultVariantAttribute,
      });
      buttons.push({
        icon: "exit_to_app",
        caption: this.$t("logout").toString(),
        type: "callback",
        callback: () => void this.logout(),
        variant: defaultVariantAttribute,
      });
    } else {
      buttons.push({
        icon: "login",
        caption: this.$t("login").toString(),
        type: "callback",
        callback: () => void this.login(),
        variant: defaultVariantAttribute,
      });
    }

    const burgerButton: Button = {
      icon: "menu",
      variant: interfaceButtonVariant,
      buttons,
      type: "button-group",
    };

    return burgerButton;
  }

  get isMainView() {
    return this.$route.params.schema === "user" && this.$route.params.name === "main";
  }

  get bottomBarNeeded() {
    return this.statusLine !== "";
  }
}
</script>

<style lang="scss" scoped>
  .main-div {
    padding: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: auto;
  }

  .userview-div {
    width: 100%;
    height: 100%;
    overflow: auto;
  }

  .userview-upper-div {
    overflow: hidden;
    height: inherit;
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 0; /* вся страница, кроме низа */
  }

  .fix-bot {
    padding: 0.1rem;
    padding-left: 0.5rem;
    line-height: normal;
    white-space: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    text-align: right;
    margin-left: -1px !important;
    position: relative;
    background-color: var(--interface-backgroundColor) !important;
    color: var(--interface-foregroundColor);
    border-top: 1px solid var(--interface-borderColor);
    z-index: 500; /* низ страницы */
    display: -webkit-box;
    display: -ms-flexbox;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
  }

  .status-line {
    position: relative;
    bottom: 0;
    z-index: 600; /* кол-во записей внизу */
    line-height: normal;
    float: left;
    margin-left: 5px;
    color: var(--interface-foregroundColor);
  }

  .save-cluster {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 1000;

    &.is-mobile {
      bottom: 1rem;
      right: 1rem;
    }
  }

  .save-cluster-button {
    height: 3rem;
    width: 3rem;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
  }

  .save-cluster-indicator {
    height: 3rem;
    width: 3rem;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    color: var(--default-backgroundDarker2Color);

    .material-icons {
      font-size: 2rem;
    }
  }

  .reset-changes-button {
    height: 3rem;
    width: 3rem;
    margin-bottom: 0.5rem;
    background-color: #df4151;
    color: #831721;
  }

  .show-errors-button {
    height: 3rem;
    width: 3rem;
    margin-bottom: 0.5rem;
    background-color: #6c757d;
    color: #2b2e31;
  }

  .auto-save-indicator {
    position: absolute;
    height: 3rem;
    width: 3rem;
    transform: translateX(-100%);
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    color: var(--default-backgroundDarker2Color);
  }

  .save-button {
    color: var(--StateTextColor);

    &.save {
      background-color: #39ac00;
    }
  }

  .shadow {
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5) !important;
  }

  .saving-spinner {
    height: 3rem;
    width: 3rem;
    border-color: #39ac00;
    border-right-color: transparent;
    border-width: 0.5rem;
    opacity: 0.5;
  }

  .development-mode-indicator {
    position: fixed;
    left: 1rem;
    bottom: 1rem;
    color: var(--default-foregroundDarkerColor);
    opacity: 0.75;
  }

  @media screen and (max-aspect-ratio: 13/9) {
    @media screen and (max-device-width: 480px) {
      .head-menu_back-button,
      .head-menu_main-menu-button {
        text-align: left;
        box-sizing: content-box;
        display: inline-block;
        height: 1em;
        vertical-align: bottom;
      }
    }
  }
</style>

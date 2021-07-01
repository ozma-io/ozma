<i18n>
    {
        "en": {
            "new_entry": "New entry",
            "search_placeholder": "Type to search",
            "pending_changes": "Saving",
            "loading": "Now loading",
            "save": "Save (Ctrl+S)",
            "saved": "All changes saved",
            "show_errors": "Show errors",
            "clear_changes": "Reset changes after last save",
            "clear_changes_confirm": "Reset changes after last save?",
            "clear_changes_ok": "Clear",
            "cancel": "Cancel",
            "account": "Account",
            "theme": "Theme",
            "contacts": "Contacts",
            "login": "Login",
            "logout": "Logout",
            "auth_error": "Authentication error: {msg}",
            "user_view_error": "Failed to fetch user view: {msg}",
            "staging_error": "Error while submitting changes: {msg}",
            "settings_error": "Failed to fetch settings: {msg}",
            "select_user_view_error": "Failed to select an entry: {msg}",
            "base_user_view_error": "Failed to perform an operation: {msg}",
            "error": "Error",
            "authed_link": "Copy link with authorization"
        },
        "ru": {
            "new_entry": "Новая запись",
            "search_placeholder": "Поиск",
            "pending_changes": "Сохраняется",
            "loading": "Загрузка данных",
            "save": "Сохранить (Ctrl+S)",
            "saved": "Все изменения сохранены",
            "show_errors": "Показать ошибки",
            "clear_changes": "Сбросить все изменения",
            "clear_changes_confirm": "Сбросить все изменения с последнего сохранения?",
            "clear_changes_ok": "Сбросить",
            "cancel": "Отмена",
            "account": "Профиль",
            "theme": "Тема",
            "contacts": "Контакты",
            "login": "Войти",
            "logout": "Выйти",
            "auth_error": "Ошибка авторизации: {msg}",
            "user_view_error": "Ошибка получения представления: {msg}",
            "staging_error": "Ошибка сохранения изменений: {msg}",
            "settings_error": "Ошибка получения настроек: {msg}",
            "select_user_view_error": "Ошибка выбора записи: {msg}",
            "base_user_view_error": "Ошибка выполнения операции: {msg}",
            "error": "Ошибка",
            "authed_link": "Скопировать ссылку с авторизацией"
        }
    }
</i18n>

<template>
  <div class="main-div">
    <ProgressBar v-show="isLoading" />

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
        :title="titleOrNewEntry"
        :buttons="buttons"
        :is-enable-filter="enableFilter"
        :filter-string="query.root.search"
        is-root
        @update:filterString="replaceRootSearch($event)"
        @goto="$emit('goto', $event)"
      >
        <template #main-buttons>
          <ButtonsPanel
            :buttons="mainButtons"
            @goto="$emit('goto', $event)"
          />
        </template>
      </HeaderPanel>
      <div
        class="userview-div"
      >
        <UserView
          :args="query.root.args"
          :filter="filterWords"
          is-top-level
          is-root
          :default-values="query.root.defaultValues"
          scope="root"
          @goto="pushRoot"
          @goto-previous="gotoPreviousRoot"
          @update:buttons="buttons = $event"
          @update:statusLine="statusLine = $event"
          @update:enableFilter="enableFilter = $event"
          @update:bodyStyle="styleNode.innerHTML = $event"
          @update:title="updateTitle"
          @update:isLoading="isUserViewLoading = $event"
          @update:paginationPage="replaceRootPage($event)"
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
          v-if="!changes.isEmpty && isSaving"
          class="saving-spinner spinner-border"
        />
        <button
          v-else-if="!changes.isEmpty"
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
        <div
          v-else-if="savedRecently.show"
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
    </div>

    <QRCodeScanner
      v-if="wasOpenedQRCodeScanner"
      :open-scanner="isOpenQRCodeScanner"
      multi-scan
      :link="currentQRCodeLink"
    />
  </div>
</template>

<script lang="ts">
import * as R from "ramda";
import { Route } from "vue-router";
import { Component, Vue, Watch } from "vue-property-decorator";
import { namespace } from "vuex-class";

import * as Api from "@/api";
import { eventBus } from "@/main";
import { setHeadTitle } from "@/elements";
import { ErrorKey } from "@/state/errors";
import { CombinedTransactionResult, CurrentChanges, ScopeName } from "@/state/staging_changes";
import ModalUserView from "@/components/ModalUserView.vue";
import ProgressBar from "@/components/ProgressBar.vue";
import { CurrentAuth, getAuthedLink, INoAuth } from "@/state/auth";
import { IQuery, ICurrentQueryHistory } from "@/state/query";
import { convertToWords, homeLink, nextRender } from "@/utils";
import { Link } from "@/links";
import type { Button } from "@/components/buttons/buttons";
import HeaderPanel from "@/components/panels/HeaderPanel.vue";
import { CurrentSettings } from "@/state/settings";
import { getColorVariables, Theme } from "@/utils_colors";
import { ISocialLinks } from "./CommunicationsButton.vue";

const auth = namespace("auth");
const staging = namespace("staging");
const settings = namespace("settings");
const query = namespace("query");
const errors = namespace("errors");

@Component({
  components: {
    ModalUserView,
    ProgressBar,
    QRCodeScanner: () => import("@/components/qrcode/QRCodeScanner.vue"),
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
  @staging.Action("submit") submitChanges!: (_: { scope?: ScopeName; preReload?: () => Promise<void>; errorOnIncomplete?: boolean }) => Promise<CombinedTransactionResult[]>;
  @staging.Action("reset") clearChanges!: () => Promise<void>;
  @query.State("current") query!: ICurrentQueryHistory | null;
  @query.Action("resetRoute") resetRoute!: (_: Route) => void;
  @query.Action("pushRoot") pushRoot!: (_: IQuery) => Promise<void>;
  @query.Action("replaceRootSearch") replaceRootSearch!: (_: string) => Promise<void>;
  @query.Action("replaceRootPage") replaceRootPage!: (_: string) => Promise<void>;
  @query.Action("closeWindow") closeWindow!: (_: number) => Promise<void>;
  @query.Action("pushWindow") pushWindow!: (_: { index: number; query: IQuery }) => Promise<void>;
  @query.Action("goBackRoot") goBackRoot!: () => Promise<void>;
  @query.Action("goBackWindow") goBackWindow!: (windowIndex: number) => Promise<void>;
  @errors.Mutation("removeError") removeError!: (params: { key: ErrorKey; index: number }) => void;
  @errors.Mutation("reset") resetErrors!: () => void;
  @errors.State("errors") rawErrors!: Record<ErrorKey, string[]>;
  @settings.State("current") currentSettings!: CurrentSettings;
  @settings.Action("setTheme") setTheme!: (theme: Theme) => Promise<void>;

  private statusLine = "";
  private enableFilter = false;
  private styleNode: HTMLStyleElement;
  private title = "";
  private isUserViewLoading = false;

  private buttons: Button[] = [];
  private themeButtons: Button[] = [];
  private communicationButtons: Button[] = [];

  private savedRecently: { show: boolean; timeoutId: NodeJS.Timeout | null } = {
    show: false,
    timeoutId: null,
  };

  private wasOpenedQRCodeScanner = false;
  private isOpenQRCodeScanner = false;
  private currentQRCodeLink: Link | null = null;

  private get isSaving(): boolean {
    return this.protectedCalls > 0;
  }

  private get titleOrNewEntry() {
    if (this.query === null) return "";
    const isNewEntry = this.query.root.args.args === null;
    return isNewEntry ? this.$t("new_entry").toString() : this.title;
  }

  private get mainButtons(): Button[] {
    return [
      {
        type: "callback",
        icon: "arrow_back",
        variant: "interfaceButton",
        disabled: !this.query?.root.previous,
        colorVariables: getColorVariables("button", "interfaceButton"), // FIXME TODO: Manual settings of `colorVariables` is ugly, unsafe and stupid, refactor this.
        callback: () => this.goBackRoot(),
      },
      {
        type: "link",
        icon: "home",
        variant: "interfaceButton",
        colorVariables: getColorVariables("button", "interfaceButton"),
        link: homeLink,
      },
      this.burgerButton,
    ];
  }

  constructor() {
    super();
    this.styleNode = document.createElement("style");
    this.styleNode.type = "text/css";
  }

  mounted() {
    /* eslint-disable @typescript-eslint/unbound-method */
    this.$root.$on("open-qrcode-scanner", this.openQRCodeScanner);
    document.addEventListener("keydown", this.onKeydown);
    eventBus.on("closeAllToasts", this.closeAllToasts);
    /* eslint-enable @typescript-eslint/unbound-method */

    void this.loadBurgerButtons();
  }

  private destroyed() {
    this.styleNode.remove();

    /* eslint-disable @typescript-eslint/unbound-method */
    this.$root.$off("open-qrcode-scanner", this.openQRCodeScanner);
    document.removeEventListener("keydown", this.onKeydown);
    eventBus.off("closeAllToasts", this.closeAllToasts);
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  @Watch("currentSettings")
  private loadBurgerButtons() {
    const themes = this.currentSettings.themes;
    const locale = this.$i18n.locale;
    const translate = (theme: Theme) => (typeof theme.localized?.[locale] === "string") ? theme.localized[locale] : theme.name;
    this.themeButtons = themes.map(theme => ({ caption: translate(theme), type: "callback", callback: () => this.setTheme(theme) }));

    this.communicationButtons = [
      this.communicationStrings.email
        ? {
          caption: "E-mail",
          icon: "email",
          type: "link",
          link: { type: "href", href: "mailto:" + this.communicationStrings.email, target: "_blank" },
        }
        : undefined,
      this.communicationStrings.whatsapp
        ? {
          caption: "WhatsApp",
          icon: "phone",
          type: "link",
          link: { type: "href", href: this.communicationStrings.whatsapp, target: "_blank" },
        }
        : undefined,
      this.communicationStrings.telegram
        ? {
          caption: "Telegram",
          icon: "send",
          type: "link",
          link: { type: "href", href: this.communicationStrings.telegram, target: "_blank" },
        }
        : undefined,
    ].filter(R.identity) as Button[];
  }

  private get communicationStrings(): ISocialLinks {
    return {
      telegram: this.currentSettings.getEntry("instance_help_telegram", String, undefined),
      whatsapp: this.currentSettings.getEntry("instance_help_whatsapp", String, undefined),
      email: this.currentSettings.getEntry("instance_help_email", String, undefined),
    };
  }

  private onKeydown(event: KeyboardEvent) {
    // 83 is code for `s`/`ы` key.
    if ((event.ctrlKey || event.metaKey) && (event.key === "s" || event.keyCode === 83)) {
      event.preventDefault();

      void this.saveView();
    }
  }

  private openQRCodeScanner(link: Link | null) {
    if (link !== null) {
      this.currentQRCodeLink = link;
      this.wasOpenedQRCodeScanner = true;
      void nextRender().then(() => {
        this.isOpenQRCodeScanner = !this.isOpenQRCodeScanner;
      });
    }
  }

  get errors() {
    return Object.entries(this.rawErrors).flatMap(([key, keyErrors]) => keyErrors.map(error => {
      return this.$t(`${key}_error`, { msg: error });
    }));
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

  private closeAllToasts() {
    this.$bvToast.hide();
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

  private updateTitle(title: string) {
    this.title = title;
    setHeadTitle(`${title} — Ozma`);
  }

  private created() {
    document.head.appendChild(this.styleNode);
  }

  private resetChanges() {
    this.$bvModal.msgBoxConfirm(this.$t("clear_changes_confirm").toString(), {
      okTitle: this.$t("clear_changes_ok").toString(),
      cancelTitle: this.$t("cancel").toString(),
      okVariant: "danger",
      cancelVariant: "outline-secondary",
      centered: true,
    }).then(this.clearChanges)
      .then(this.resetErrors)
      .then(() => this.closeAllToasts())
      .catch(err => {
      });
  }

  private async saveChanges() {
    const scopes = Object.keys(this.changes.scopes);
    const nonRootScopes = scopes.filter(scope => scope !== "root");

    const results: CombinedTransactionResult[] = [];
    for (const scope of nonRootScopes) {
      // eslint-disable-next-line no-await-in-loop
      results.push(...await this.submitChanges({ scope, errorOnIncomplete: true }));
    }

    results.push(...await this.submitChanges({ scope: "root", errorOnIncomplete: true }));
    return results;
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

  get burgerButton() {
    const buttons: Button[] = [];

    if (this.themeButtons.length > 0) {
      buttons.push({
        icon: "contacts",
        caption: this.$t("contacts").toString(),
        variant: "info",
        type: "button-group",
        buttons: this.communicationButtons,
      });
    }

    if (this.themeButtons.length > 0) {
      buttons.push({ icon: "palette", caption: this.$t("theme").toString(), type: "button-group", buttons: this.themeButtons });
    }

    if (this.currentAuth?.token) {
      if (Api.developmentMode) {
        const currentAuth = this.currentAuth;
        buttons.push({ icon: "link",
          caption: this.$t("authed_link").toString(),
          callback: () => {
            const link = getAuthedLink(currentAuth);
            void navigator.clipboard.writeText(link);
          },
          type: "callback" });
      }
      buttons.push({ icon: "perm_identity", caption: this.$t("account").toString(), type: "link", link: { href: Api.accountUrl, type: "href", target: "_self" } });
      buttons.push({ icon: "exit_to_app", caption: this.$t("logout").toString(), type: "callback", callback: this.logout });
    } else {
      buttons.push({ icon: "login", caption: this.$t("login").toString(), type: "callback", callback: this.login });
    }

    const burgerButton: Button = {
      icon: "menu",
      variant: "interfaceButton",
      colorVariables: getColorVariables("button", "interfaceButton"),
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

  @media print {
    .head-menu {
      display: none !important;
    }
  }

  @media screen and (max-aspect-ratio: 13/9) {
    @media screen and (max-device-width: 480px) {
      .head-menu {
        width: 100%;
      }
    }
  }

  .head-menu {
    display: flex;
    white-space: nowrap;
    background-color: var(--interface-backgroundColor);
    color: var(--interface-foregroundColor);
    border-bottom: 1px solid var(--interface-borderColor);
    width: 100%;
    padding: 2px 10px;
    z-index: 999;
  }

  .head-menu_back-button {
    padding-top: 3px;
    padding-bottom: 3px;
    margin-left: 0 !important;
    background-color: transparent;
  }

  .head-menu_back-button,
  .head-menu_main-menu-button {
    border: none;
    text-decoration: none;
    padding: 0;
    margin-right: 5px;
    position: relative;
    z-index: 1000;
  }

  .head-menu_title {
    margin: 1px 2px 0;
    margin-right: auto;
    font-weight: 600;
    font-size: 1.25em;
    color: var(--MainTextColor);
    overflow: hidden;
    text-overflow: ellipsis;

    &.is-loading {
      color: var(--MainTextColorLight);
      opacity: 0.6;
    }

    &:focus {
      outline: none;
    }
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
    bottom: 2rem;
    right: 2rem;
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
    height: 4rem;
    width: 4rem;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
  }

  .save-cluster-indicator {
    height: 4rem;
    width: 4rem;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    color: var(--default-backgroundDarker2Color);
  }

  .reset-changes-button {
    height: 3rem;
    width: 3rem;
    margin-bottom: 0.5rem;
    background-color: #dc354533;
    color: #dc3545cc;
  }

  .show-errors-button {
    height: 3rem;
    width: 3rem;
    margin-bottom: 0.5rem;
    background-color: #6c757d33;
    color: #6c757dcc;
  }

  .save-button {
    color: var(--StateTextColor);

    &.save {
      background-color: #97d777;
    }
  }

  .saving-spinner {
    height: 4rem;
    width: 4rem;
    border-color: #97d777;
    border-right-color: transparent;
    border-width: 0.5rem;
    opacity: 0.5;
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

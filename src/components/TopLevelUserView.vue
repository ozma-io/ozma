<i18n>
    {
        "en": {
            "new_entry": "New entry",
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
            "settings_error": "Failed to fetch settings: {msg}",
            "select_user_view_error": "Failed to select an entry: {msg}",
            "base_user_view_error": "Failed to perform an operation: {msg}",
            "error": "Error",
            "development_mode_indicator": "Development mode is on"
        },
        "ru": {
            "new_entry": "Новая запись",
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
            "settings_error": "Ошибка получения настроек: {msg}",
            "select_user_view_error": "Ошибка выбора записи: {msg}",
            "base_user_view_error": "Ошибка выполнения операции: {msg}",
            "error": "Ошибка",
            "development_mode_indicator": "Включён режим разработки"
        },
        "es": {
            "new_entry": "La nueva entrada",
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
            "settings_error": "El error al recuperar la configuración: {msg}",
            "select_user_view_error": "El error al seleccionar una entrada: {msg}",
            "base_user_view_error": "El error al realizar una operación: {msg}",
            "error": "El error",
            "development_mode_indicator": "El modo de desarrollo está activado"
        }
    }
</i18n>

<template>
  <div class="main-div">
    <template v-if="query !== null">
      <ModalUserView
        v-for="window in query.windows"
        ref="modalUserViews"
        :key="window.key"
        is-root
        :view="window.query"
        :autofocus="query.selectedWindow === window.key"
        @close="closeWindow(window.key)"
        @goto-previous="goBack(window.key)"
        @go-back="$router.back()"
        @goto="push({ ...$event, key: window.key })"
      />
    </template>

    <div :class="'userview-upper-div'">
      <HeaderPanel
        :title="titleOrNewEntry ?? undefined"
        :buttons="buttons"
        :is-enable-filter="enableFilter"
        :filter-string="query.root.search"
        :type="'root'"
        :argumentEditorProps="argumentEditorProps"
        @update:filter-string="replaceSearch({ key: null, search: $event })"
        @goto="push({ ...$event, key: null })"
      >
        <template #left-slot>
          <ButtonsPanel
            :buttons="navigationButtons"
            @goto="push({ ...$event, key: null })"
          />
        </template>

        <template #right-slot>
          <div class="profile-button-wrapper">
            <ProfileButton />
          </div>
        </template>
      </HeaderPanel>
      <div class="userview-div">
        <UserView
          ref="userViewRef"
          is-root
          is-top-level
          in-container
          :args="query.root.args"
          :filter="filterWords"
          :default-values="query.root.defaultValues"
          scope="root"
          @goto="push({ ...$event, key: null })"
          @goto-previous="goBack(null)"
          @update:buttons="buttons = $event"
          @update:status-line="statusLine = $event"
          @update:enable-filter="enableFilter = $event"
          @update:body-style="userViewStyle = $event"
          @update:title="title = $event"
          @update:description="description = $event"
          @update:url="url = $event"
          @update:current-page="replacePage({ key: null, page: $event })"
          @update:argument-editor-props="argumentEditorProps = $event"
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
          v-b-tooltip.hover.d1000.right.noninteractive="{
            title: $t('clear_changes').toString(),
            disabled: $isMobile,
          }"
          class="save-cluster-button reset-changes-button"
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
          v-b-tooltip.hover.d1000.right.noninteractive="{
            title: $t('show_errors').toString(),
            disabled: $isMobile,
          }"
          class="save-cluster-button show-errors-button"
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
          v-if="(autoSaveInProgress || savingInProgress) && errors.length === 0"
          class="save-cluster-button saving-indicator"
        >
          <div class="spinner-border saving-indicator-spinner" />
        </div>
        <div
          v-else-if="isLoading"
          class="spinner-border loading-spinner"
        />
        <div v-else-if="!changes.isEmpty">
          <button
            v-b-tooltip.hover.d1000.right.noninteractive="{
              title: $t('save').toString(),
              disabled: $isMobile,
            }"
            class="save-cluster-button save-button save"
            @click.capture.stop="saveView"
          >
            <span class="material-icons md-36">
              save
            </span>
          </button>
        </div>
      </transition>

      <div
        v-if="allowBusinessMode && !settingsPending && developmentModeEnabled"
        v-b-tooltip.hover.d1000.right.noninteractive="{
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
      @before-handler="currentQRCodeLink = null"
    />
  </div>
</template>

<script lang="ts">
import { Route } from "vue-router";
import { Component, Vue, Watch } from "vue-property-decorator";
import { namespace } from "vuex-class";

import { setHeadTitle, setHeadMeta } from "@/elements";
import { ErrorKey } from "@/state/errors";
import { CombinedTransactionResult, CurrentChanges, ISubmitResult, ScopeName } from "@/state/staging_changes";
import ModalUserView from "@/components/ModalUserView.vue";
import ProgressBar from "@/components/ProgressBar.vue";
import { CurrentAuth, INoAuth } from "@/state/auth";
import { IQuery, ICurrentQueryHistory, QueryKey, QueryWindowKey } from "@/state/query";
import { convertToWords, homeLink } from "@/utils";
import { interfaceButtonVariant } from "@/utils_colors";
import { Link } from "@/links";
import type { Button } from "@/components/buttons/buttons";
import HeaderPanel from "@/components/panels/HeaderPanel.vue";
import { CurrentSettings, DisplayMode } from "@/state/settings";
import QRCodeScannerModal from "./qrcode/QRCodeScannerModal.vue";
import { UserString } from "@/state/translations";
import { IArgumentEditorProps } from "./ArgumentEditor.vue";
import ProfileButton from "./ProfileButton.vue";

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
    ProfileButton,
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
  @staging.State("currentSubmit") autoSaveInProgress!: true | null;
  @staging.Action("submit") submitChanges!: (_: { scope?: ScopeName; preReload?: () => Promise<void>; errorOnIncomplete?: boolean }) => Promise<ISubmitResult>;
  @staging.Action("reset") clearChanges!: () => Promise<void>;
  @query.State("current") query!: ICurrentQueryHistory | null;
  @query.Action("resetRoute") resetRoute!: (_: Route) => void;
  @query.Action("replaceSearch") replaceSearch!: (_: { search: string; key: QueryKey }) => Promise<void>;
  @query.Action("replacePage") replacePage!: (_: { page: number | null; key: QueryKey }) => Promise<void>;
  @query.Action("closeWindow") closeWindow!: (_: QueryWindowKey) => Promise<void>;
  @query.Action("push") push!: (_: { key: QueryKey; query: IQuery; replace?: boolean }) => Promise<void>;
  @query.Action("goBack") goBack!: (key: QueryKey) => Promise<void>;
  @errors.Mutation("removeError") removeError!: (params: { key: ErrorKey; index: number }) => void;
  @errors.Mutation("reset") resetErrors!: () => void;
  @errors.State("errors") rawErrors!: Record<ErrorKey, string[]>;
  @errors.State("silent") silentErrors!: boolean;
  @settings.State("current") currentSettings!: CurrentSettings;
  @settings.State("pending") settingsPending!: Promise<CurrentSettings> | null;
  @settings.State("userIsRoot") userIsRoot!: boolean;
  @settings.Getter("developmentModeEnabled") developmentModeEnabled!: boolean;
  @staging.State("autoSaveLocks") autoSaveLocks!: Object | null;
  @settings.Action("setDisplayMode") setDisplayMode!: (mode: DisplayMode) => Promise<void>;
  @settings.Action("writeUserSettings") writeUserSettings!: (setting: { name: string; value: string }) => Promise<void>;

  private statusLine = "";
  private enableFilter = false;
  private styleNode!: HTMLStyleElement;
  private userViewStyle: string | null = null;
  private finalSettingsStyle: string | null = null;
  private title: UserString | null = null;
  private description: UserString | null = null;
  private url: UserString | null = null;

  private buttons: Button[] = [];
  private argumentEditorProps: IArgumentEditorProps | null = null;

  private currentQRCodeLink: Link | null = null;

  private get isSaving(): boolean {
    return this.protectedCalls > 0;
  }

  private get navigationButtons(): Button[] {
    return [
      {
        type: "callback",
        icon: "arrow_back",
        variant: interfaceButtonVariant,
        callback: () => this.$router.back(),
      },
      {
        type: "link",
        icon: "home",
        variant: interfaceButtonVariant,
        link: homeLink,
      },
    ];
  }

  get titleOrNewEntry(): string | null {
    if (this.query === null) {
      return null;
    }
    if (this.query.root.args.args === null) {
      return this.$t("new_entry").toString();
    } else {
      return this.title ? this.$ustOrEmpty(this.title) : null;
    }
  }

  get stringTitle(): string | null {
    return this.title ? this.$ustOrEmpty(this.title) : null;
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

  @Watch("description", { immediate: true })
  private updateDescription(description: UserString | null) {
    if (description) {
      const descriptionString = `${this.$ustOrEmpty(description)}`;
      setHeadMeta("name", "description", descriptionString);
      setHeadMeta("property", "og:description", descriptionString);
      setHeadMeta("property", "twitter:description", descriptionString);
    }
  }

  @Watch("stringTitle", { immediate: true })
  private updateTitle(title: string | null) {
    let titleString = "ozma.io";
    if (title) {
      titleString = `ozma.io - ${title}`;
    }
    setHeadTitle(titleString);
    setHeadMeta("property", "og:title", titleString);
    setHeadMeta("property", "twitter:title", titleString);
  }

  private created() {
    this.styleNode = document.createElement("style");
    this.onFinalStyleChanged();
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

  private savingInProgress = false;
  private async saveView() {
    this.savingInProgress = true;
    await this.saveChanges();
    this.savingInProgress = false;

    if (this.errors.length === 0) {
      this.$bvToast.hide();
    }
  }

  private get allowBusinessMode() {
    return this.currentSettings.getEntry("allow_business_mode", Boolean, false);
  }

  private toggleDeveloperMode() {
    if (this.allowBusinessMode && this.userIsRoot) {
      void this.setDisplayMode(this.developmentModeEnabled ? "business" : "development");
    }
  }

  private get settingsStyle(): string {
    return this.currentSettings.getEntry("custom_css", String, "");
  }

  // async to import additional sanitizeCSS module
  @Watch("settingsStyle", { deep: true, immediate: true })
  private async customStyle(styleString: string): Promise<void> {
    if (styleString !== "") {
      try {
        // import sanitizeCSS from file custom_css to avoid import for all users
        const { sanitizeCSS } = await import("@/sanitize_css");
        this.finalSettingsStyle = sanitizeCSS(styleString);
      } catch (error) {
        console.error("Invalid custom_css setting:", error);
      }
    }
  }

  @Watch("finalStyle", { deep: true, immediate: true })
  private onFinalStyleChanged() {
    if (this.styleNode) {
      this.styleNode.innerHTML = this.finalStyle;
    }
  }

  private get finalStyle() {
    return this.finalSettingsStyle ?? "" + this.userViewStyle ?? "";
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
  .profile-button-wrapper {
    padding-left: 1rem;
    padding-right: 1.75rem;
    display: flex;
    align-items: center;
  }

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
    bottom: 3rem;
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
    height: 3rem;
    width: 3rem;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
  }

  .reset-changes-button {
    margin-bottom: 0.5rem;
    background-color: #F2F4F7;
    color: #777C87;
  }

  .show-errors-button {
    margin-bottom: 0.5rem;
    background-color: #F2F4F7;
    color: #777C87;
  }

  .save-button {
    color: white;
    background-color: #2361FF;
  }

  .saving-indicator {
    color: white;
    background-color: #2361FF;
  }

  .loading-spinner {
    height: 3rem;
    width: 3rem;
    border-right-color: transparent;
    border-width: 0.5rem;
    opacity: 0.5;

    &.saving-spinner {
      border-color: #2361FF;
      border-right-color: transparent;
    }
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

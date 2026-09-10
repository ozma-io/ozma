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
    :data-theme-style="themeStyleName"
    :style="styleSettings"
    class="default-variant default-local-variant"
  >
    <transition name="selection-panel-fade">
      <div v-if="selectionPanel" class="selection-buttons-wrapper">
        <div class="selection-buttons-label">{{ selectionPanel.label }}</div>
        <div class="selection-buttons-panel">
          <ButtonsPanel :buttons="selectionPanel.buttons" />
        </div>
      </div>
    </transition>

    <div class="app-container">
      <ModalPortalTarget name="tabbed-modal" multiple />

      <portal-target name="input-popup-portal" multiple />

      <ReadonlyDemoInstanceModal
        v-if="isReadonlyDemoInstance"
        ref="readonlyDemoInstanceModal"
      />

      <InviteUserModal v-if="hasInvites" ref="inviteUserModal" />

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
        <span v-for="error in authErrors" :key="error">
          {{ $t('auth_error', { msg: error }) }}
        </span>
      </template>
      <router-view v-else />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import { namespace, Action } from 'vuex-class'
import { IViewExprResult } from '@ozma-io/ozmadb-js/client'
import moment from 'moment'

// TODO: import all languages from instance settings
import 'moment/locale/es'
import 'moment/locale/ru'

import * as Api from '@/api'
import type { ICallApi } from '@/state/auth'
import { CurrentAuth, INoAuth } from '@/state/auth'
import { CurrentSettings } from '@/state/settings'
import type { WindowKey } from '@/state/windows'
import ModalPortalTarget from '@/components/modal/ModalPortalTarget'
import { ErrorKey } from '@/state/errors'
import {
  colorVariantsToCssRules,
  bootstrapColorVariants,
  colorVariantFromRaw,
  transparentVariant,
  IThemeRef,
  ITheme,
} from '@/utils_colors'
import { eventBus, IShowHelpModalArgs, ISelectionPanelArgs } from '@/main'
import ButtonsPanel from '@/components/panels/ButtonsPanel.vue'
import InviteUserModal from '@/components/InviteUserModal.vue'
import { EntityRef } from '@/links'
import { safeJsonParse } from '@/utils'
import { equalEntityRef } from '@/values'
import { IQuery, QueryKey } from '@/state/query'
import { Language } from '@/state/translations'

const settings = namespace('settings')
const auth = namespace('auth')
const errors = namespace('errors')
const staging = namespace('staging')
const windows = namespace('windows')
const query = namespace('query')
const translations = namespace('translations')
import { type UserString } from '@/state/translations'
import { setHeadMeta, setHeadLink } from '@/elements'

@Component({
  components: {
    ModalPortalTarget,
    InviteUserModal,
    ButtonsPanel,
    ReadonlyDemoInstanceModal: () =>
      import('@/components/ReadonlyDemoInstanceModal.vue'),
    HelpModal: () => import('@/components/HelpModal.vue'),
  },
})
export default class App extends Vue {
  @Action('callApi') callApi!: ICallApi

  selectionPanel: ISelectionPanelArgs | null = null
  @settings.State('current') settings!: CurrentSettings
  @settings.State('currentThemeRef') currentThemeRef!: IThemeRef | null
  @settings.Getter('language') language!: string
  @auth.State('current') currentAuth!: CurrentAuth | INoAuth | null
  @auth.Action('startAuth') startAuth!: () => Promise<void>
  @errors.State('errors') rawErrors!: Record<ErrorKey, string[]>
  @errors.State('silent') silentErrors!: boolean
  @staging.Mutation('setAutoSaveTimeout') setAutoSaveTimeout!: (
    _: number | null,
  ) => void
  @windows.Mutation('createWindow') createWindow!: (_: WindowKey) => void
  @windows.Mutation('destroyWindow') destroyWindow!: (_: WindowKey) => void
  @query.Action('push') push!: (_: {
    key: QueryKey
    query: IQuery
  }) => Promise<void>
  @translations.Action('getTranslations') getTranslations!: (
    _: Language,
  ) => Promise<void>

  helpPageInfo: {
    key: string | null
    ref: Api.IEmbeddedPageRef
    markup: string
  } | null = null

  created() {
    void this.startAuth()

    this.createWindow(this.uid)

    /* eslint-disable @typescript-eslint/unbound-method */
    document.addEventListener('copy', this.onCopy)
    document.addEventListener('cut', this.onCut)
    document.addEventListener('paste', this.onPaste)

    eventBus.on('show-readonly-demo-modal', this.showDemoModal)
    eventBus.on('show-invite-user-modal', this.showInviteUserModal)
    eventBus.on('show-help-modal', this.showHelpModal)
    eventBus.on('close-all-toasts', this.closeAllToasts)
    eventBus.on('show-selection-panel', this.showSelectionPanel)
    eventBus.on('hide-selection-panel', this.hideSelectionPanel)
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  destroyed() {
    /* eslint-disable @typescript-eslint/unbound-method */
    document.removeEventListener('copy', this.onCopy)
    document.removeEventListener('cut', this.onCut)
    document.removeEventListener('paste', this.onPaste)

    eventBus.off('show-readonly-demo-modal', this.showDemoModal)
    eventBus.off('show-invite-user-modal', this.showInviteUserModal)
    eventBus.off('show-help-modal', this.showHelpModal)
    eventBus.off('close-all-toasts', this.closeAllToasts)
    eventBus.off('show-selection-panel', this.showSelectionPanel)
    eventBus.off('hide-selection-panel', this.hideSelectionPanel)
    /* eslint-enable @typescript-eslint/unbound-method */

    this.destroyWindow(this.uid)
  }

  private onCopy(event: ClipboardEvent) {
    this.$root.$emit('copy', event)
  }

  private onCut(event: ClipboardEvent) {
    this.$root.$emit('cut', event)
  }

  private onPaste(event: ClipboardEvent) {
    this.$root.$emit('paste', event)
  }

  get isReadonlyDemoInstance() {
    return (
      this.settings.getEntry('is_read_only_demo_instance', Boolean, false) &&
      !this.hasAuth
    )
  }

  get hasAuth() {
    return Boolean(this.currentAuth?.refreshToken)
  }

  get hasInvites() {
    return this.hasAuth && Api.invitesServiceUrl !== undefined
  }

  get authErrors() {
    return this.silentErrors ? [] : (this.rawErrors['auth'] ?? [])
  }

  private showDemoModal() {
    ;(this.$refs?.readonlyDemoInstanceModal as any)?.show()
  }

  private showInviteUserModal() {
    ;(this.$refs?.inviteUserModal as any)?.show()
  }

  private showHelpModal(args: IShowHelpModalArgs) {
    void (async () => {
      if (this.helpPageInfo) return

      if (args.skipIfShown) {
        const dismissHelpPages = Boolean(
          localStorage.getItem('dismissHelpPages'),
        )
        if (dismissHelpPages) {
          return
        }

        if (args.key !== null) {
          const watchedRef = EntityRef.safeParse(
            safeJsonParse(localStorage.getItem(`watchedHelpPage_${args.key}`)),
          )
          const alreadyWatched = watchedRef.success
            ? equalEntityRef(args.ref, watchedRef.data)
            : false
          if (alreadyWatched) {
            return
          }
        }
      }

      const uvRef = { schema: 'funapp', name: 'embedded_page_by_name' }
      const res: IViewExprResult = await this.callApi({
        func: (api) => api.getNamedUserView(uvRef, args.ref as any),
      })

      const markupRaw =
        (res.result.rows[0]?.values[0].value as string | undefined) ?? null
      const markup =
        markupRaw ??
        `Help page markup with name "${args.ref.schema}"."${args.ref.name}" not found.`
      this.helpPageInfo = { key: args.key, ref: args.ref, markup }
    })()
  }

  onHelpModalClose() {
    this.helpPageInfo = null
  }

  dismissHelpPage() {
    if (!this.helpPageInfo) return

    localStorage.setItem(
      `watchedHelpPage_${this.helpPageInfo.key}`,
      JSON.stringify(this.helpPageInfo.ref),
    )

    this.helpPageInfo = null
  }

  dismissAllHelpPages() {
    localStorage.setItem('dismissHelpPages', 'true')
    this.helpPageInfo = null
  }

  private closeAllToasts() {
    this.$bvToast.hide()
  }

  private showSelectionPanel(args: ISelectionPanelArgs) {
    this.selectionPanel = args
  }

  private hideSelectionPanel({ sourceId }: { sourceId: symbol }) {
    if (this.selectionPanel?.sourceId === sourceId) {
      this.selectionPanel = null
    }
  }

  get url(): UserString {
    return `${window.location.protocol}://${window.location.host}${this.$route.fullPath}`
  }

  @Watch('language', { immediate: true })
  private updateLanguage() {
    this.$root.$i18n.locale = this.language
  }

  @Watch('$i18n.locale', { immediate: true })
  private loadLanguage(language: string) {
    moment.locale(language)
    void this.getTranslations(language)
  }

  get themeStyleName(): string {
    return this.currentThemeRef?.name ?? 'default'
  }

  @Watch('themeStyleName', { immediate: true })
  private syncThemeStyleName(themeStyleName: string) {
    document.documentElement.setAttribute('data-theme-style', themeStyleName)
    document.body?.setAttribute('data-theme-style', themeStyleName)
    document.documentElement.classList.add(
      'default-variant',
      'default-local-variant',
    )
    document.body?.classList.add('default-variant', 'default-local-variant')
  }

  @Watch('styleSettings', { immediate: true, deep: true })
  private syncGlobalStyleSettings(styleSettings: Record<string, unknown>) {
    const applyVars = (element: HTMLElement | null) => {
      if (!element) return
      for (const [name, value] of Object.entries(styleSettings)) {
        element.style.setProperty(name, String(value))
      }
    }

    applyVars(document.documentElement)
    applyVars(document.body)
  }

  @Watch('settings', { immediate: true })
  private updateSettings() {
    const rawAutoSaveTimeout = Number(
      this.settings.getEntry('auto_save_timeout', String, '1'),
    )
    const autoSaveTimeout = Number.isNaN(rawAutoSaveTimeout)
      ? null
      : rawAutoSaveTimeout * 1000
    this.setAutoSaveTimeout(autoSaveTimeout)
    const html = document.querySelector('html')
    if (html) {
      // `rem` in CSS is calculated only from `font-size` on `<html>`.
      html.style.fontSize = `${this.fontSize}px`
    }

    const gtmId = this.settings.getEntry(
      'google_tag_manager_container_id',
      String,
      null,
    )
    if (gtmId) {
      const gtmScript = document.createElement('script')
      gtmScript.type = 'text/javascript'
      gtmScript.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`
      document.head.appendChild(gtmScript)
    }

    this.loadColors()
  }

  @Watch('url', { immediate: true })
  private updateUrl(url: UserString) {
    const urlString = `${this.$ustOrEmpty(url)}`
    setHeadLink('canonical', urlString)
    setHeadMeta('property', 'og:url', urlString)
  }

  /* So, about themeing:
   * 1. We use color variants to theme components.
   *    Color variant is set of colors: several shades of background color, several shades of foreground color, border color, etc.
   *    We need to define at least main background-color and others will be generated based on it.
   * 2. Color varaints can be static and custom.
   *    Static ones are defined in system table ozma.color_variants, custom ones are defined right in attributes.
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
    let currentTheme: ITheme | undefined
    if (this.currentThemeRef !== null) {
      // Themes may not be loaded yet — `currentThemeRef` is restored from
      // localStorage before settings arrive.
      currentTheme =
        this.settings.themes[this.currentThemeRef.schema]?.[
          this.currentThemeRef.name
        ]
    }

    const background = this.styleSettings['--OldMainBackgroundColor']
    const foreground = this.styleSettings['--OldMainTextColor']
    const border = this.styleSettings['--OldMainBorderColor']
    const oldDefaultVariant = colorVariantFromRaw({ background })
    const defaultVariant =
      currentTheme?.colorVariants['default'] ?? oldDefaultVariant
    const pageBackgroundVariant =
      currentTheme?.colorVariants['pageBackground'] ??
      colorVariantFromRaw({ background: defaultVariant.backgroundDarker1 })
    const existingTableVariant =
      currentTheme?.colorVariants['table'] ??
      currentTheme?.colorVariants['table-background']
    const tableVariant =
      existingTableVariant ??
      colorVariantFromRaw({ background: defaultVariant.background })
    const interfaceButton = {
      ...transparentVariant,
      backgroundDarker1: defaultVariant.backgroundDarker1,
      backgroundDarker2: defaultVariant.backgroundDarker2,
      foreground: defaultVariant.foreground,
      foregroundContrast: defaultVariant.foregroundContrast,
      foregroundDarker: defaultVariant.foregroundDarker,
    }
    const menuEntry = {
      ...interfaceButton,
    }
    const menuHeader = {
      ...interfaceButton,
    }
    const outlinedInterfaceButton = {
      ...interfaceButton,
      border: defaultVariant.border,
    }
    const ctaButton = colorVariantFromRaw({
      background: '#2361FF',
      foreground: '#FFF',
      border: '#2361FF',
    })
    const defaultColorVariants = {
      default: defaultVariant,
      'global-userview-background': pageBackgroundVariant,
      table: tableVariant,
      interfaceButton,
      outlinedInterfaceButton,
      menuEntry,
      menuHeader,
      ctaButton,
    }
    const colorVariants = {
      ...bootstrapColorVariants,
      ...defaultColorVariants,
      ...currentTheme?.colorVariants,
    }
    return colorVariantsToCssRules(colorVariants)
  }

  @Watch('themeStyleSettings', { immediate: true })
  private loadColors() {
    // While the chosen theme is still loading, keep the cached styles injected
    // by index.html instead of overwriting them with default-built rules.
    const themeIsPending =
      this.currentThemeRef !== null &&
      this.settings.themes[this.currentThemeRef.schema]?.[
        this.currentThemeRef.name
      ] === undefined
    if (themeIsPending) return

    const sheet = (document.getElementById('theme-styles') as any)?.sheet as
      | CSSStyleSheet
      | undefined
    if (sheet) {
      while (sheet.cssRules.length > 0) {
        sheet.deleteRule(0)
      }

      for (const rule of this.themeStyleSettings) {
        sheet.insertRule(rule)
      }
    }

    // Cache the generated rules so the inline script in index.html can apply
    // them before the app boots, avoiding a light-theme flash. Only cache once
    // the actual theme is loaded — earlier the rules are built from defaults.
    if (
      this.currentThemeRef !== null &&
      this.settings.themes[this.currentThemeRef.schema]?.[
        this.currentThemeRef.name
      ] !== undefined
    ) {
      try {
        localStorage.setItem(
          'themeStylesCache',
          JSON.stringify({
            theme: `${this.currentThemeRef.schema}.${this.currentThemeRef.name}`,
            rules: this.themeStyleSettings,
          }),
        )
      } catch (e) {
        // Quota errors are not critical here.
      }
    }
  }

  private get fontSize(): number {
    const defaultSize = 16
    const normalSize = this.settings.getEntry('font_size', Number, defaultSize)
    const mobileSize = this.settings.getEntry('font_size_mobile', Number, 14)
    return this.$isMobile && mobileSize !== 0 ? mobileSize : normalSize
  }

  get styleSettings() {
    const values = {
      // "NavigationBackColor": this.settings.getEntry("navigation_back_color", String, "white"),
      FontSize: `${this.fontSize}px`,
      MenuColor: this.settings.getEntry('menu_color', String, '#F5C700'),
      TableBackColor: this.settings.getEntry(
        'table_back_color',
        String,
        'white',
      ),
      TableSelectColor: this.settings.getEntry(
        'table_select_color',
        String,
        '#CCCCCC',
      ),
      WarningBackColor: this.settings.getEntry(
        'warning_back_color',
        String,
        '#fff3cd',
      ),
      DangerBackColor: this.settings.getEntry(
        'danger_back_color',
        String,
        '#f8d7da',
      ),
      SuccessBackColor: this.settings.getEntry(
        'success_back_color',
        String,
        '#d4edda',
      ),
      SelectBorderColor: this.settings.getEntry(
        'select_border_color',
        String,
        'blue',
      ),
      ButtonTextColor: this.settings.getEntry(
        'button_text_color',
        String,
        'white',
      ),
      TableTextColor: this.settings.getEntry(
        'table_text_color',
        String,
        '#383838',
      ),
      SaveBackColor: this.settings.getEntry('save_back_color', String, 'blue'),
      NavigationTextColor: this.settings.getEntry(
        'navigation_text_color',
        String,
        'white',
      ),
      ControlDisableColor: this.settings.getEntry(
        'control_disable_color',
        String,
        '#999999',
      ),

      // Light Theme, do not remove
      OldMainTextColor: this.settings.getEntry(
        'main_text_color',
        String,
        '#rgba(51, 51, 51, 1)',
      ),
      OldMainBackgroundColor: this.settings.getEntry(
        'main_background_color',
        String,
        'white',
      ),
      SecondaryBackgroundColor: this.settings.getEntry(
        'secondary_background_color',
        String,
        '#f8f9fa',
      ),
      OldMainTextColorLight: this.settings.getEntry(
        'main_text_color_light',
        String,
        'rgba(153, 153, 153, 1)',
      ),
      OldMainBorderColor: this.settings.getEntry(
        'main_border_color',
        String,
        'rgb(204, 204, 204)',
      ),
      MainBorderTextColor: this.settings.getEntry(
        'main_border_text_color',
        String,
        '#68766d',
      ),

      // Dark Theme, do not remove
      // "MainTextColor": this.settings.getEntry("main_text_color", String, "#b2b2b2"),
      // "MainBackgroundColor": this.settings.getEntry("main_background_color", String, "#292b2e"),
      // "MainTextColorLight": this.settings.getEntry("main_text_color_light", String, "#8a8a8a"),
      // "MainBorderColor": this.settings.getEntry("main_border_color", String, "#2c936f"),

      SuccessColor: this.settings.getEntry('success_color', String, '#28a745'),
      FailColor: this.settings.getEntry('fail_color', String, '#dc3545'),
      FailPlaceholderColor: this.settings.getEntry(
        'fail_placeholder_color',
        String,
        '#2c0b0e',
      ),
      WarningColor: this.settings.getEntry('fail_color', String, '#ffc107'),
      WarningPlaceholderColor: this.settings.getEntry(
        'warning_placeholder_color',
        String,
        '#4c3a02',
      ),
      StateTextColor: this.settings.getEntry(
        'state_text_color',
        String,
        'white',
      ),

      CellSelectColor: this.settings.getEntry(
        'cell_select_color',
        String,
        'rgba(238,238,238,0.3)',
      ),
    }
    return Object.entries(values).reduce(
      (currSettings, [name, value]) => {
        currSettings[`--${name}`] = value
        return currSettings
      },
      {} as Record<string, unknown>,
    )
  }
}
</script>

<style lang="scss" scoped>
#app {
  --MainTextColor: var(--foregroundColor, var(--OldMainTextColor)) !important;
  --MainTextColorLight: var(
    --foregroundDarkerColor,
    var(--OldMainTextColorLight)
  ) !important;
  --MainBackgroundColor: var(
    --backgroundColor,
    var(--OldMainBackgroundColor)
  ) !important;
  --MainBorderColor: var(--borderColor, var(--OldMainBorderColor)) !important;

  --userview-background-color: var(--userview-background, var(--default-backgroundDarker1Color, #f2f4f7));

  background-color: var(--backgroundColor);
  color: var(--foregroundColor);
}

@include variant-to-local('default');

.app-container {
  position: relative;
  height: 100%;
  overflow: auto;
}

.input-popup-portal {
  position: relative;
  z-index: 200001;
}

.selection-buttons-wrapper {
  position: fixed;
  bottom: 3rem;
  left: 50%;
  transform: translate(-50%, 0);
  z-index: 200001;
  border-radius: 0.5rem;
  background-color: #000a;
  padding: 0.5rem;

  .selection-buttons-label {
    padding: 0.5rem;
    padding-top: 0;
    color: white;
    text-align: center;
  }

  ::v-deep .buttons-panel {
    gap: 0.5rem;
  }
}

.selection-panel-fade-enter-active,
.selection-panel-fade-leave-active {
  transition: opacity 0.4s, transform 0.4s;
}

.selection-panel-fade-enter,
.selection-panel-fade-leave-to {
  transform: translate(-50%, 1rem);
  opacity: 0;
}
</style>

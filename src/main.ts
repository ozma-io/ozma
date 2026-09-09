import Vue from 'vue'

Vue.config.devtools = process.env['NODE_ENV'] !== 'production'
Vue.config.performance = process.env['NODE_ENV'] !== 'production'

import Vuex from 'vuex'
import mitt from 'mitt'
import TextareaAutosize from 'vue-textarea-autosize'

import * as Modules from '@/modules'
import { setHeadTitle, setHeadMeta } from '@/elements'

import UserView from '@/components/UserView.vue'
import OzmaLink from '@/components/OzmaLink'
import ButtonsPanel from '@/components/panels/ButtonsPanel.vue'
import ButtonGroup from '@/components/buttons/ButtonGroup.vue'
import FormControl from '@/components/FormControl.vue'
import { VueIsMobile } from '@/components'
import App from '@/App.vue'

import authModule from '@/state/auth'
import settingsModule from '@/state/settings'
import entitiesModule from '@/state/entities'
import entriesModule from '@/state/entries'
import stagingChangesModule from '@/state/staging_changes'
import queryModule from '@/state/query'
import errorsModule from '@/state/errors'
import reloadModule from '@/state/reload'
import windowsModule from '@/state/windows'
import translationsModule from '@/state/translations'

import '@/styles/style.scss'
import { apiUrl, IEmbeddedPageRef } from '@/api'

export interface IShowHelpModalArgs {
  // `null` when we don't store "page is read" state.
  key: string | null
  skipIfShown?: boolean
  ref: IEmbeddedPageRef
}

export interface ISelectionPanelContent {
  label: string
  buttons: import('@/components/buttons/buttons').Button[]
}

export interface ISelectionPanelArgs extends ISelectionPanelContent {
  sourceId: symbol
}

type Events = {
  ['show-readonly-demo-modal']?: string
  ['show-invite-user-modal']?: string
  ['show-help-modal']: IShowHelpModalArgs
  ['close-all-toasts']?: string
  ['show-selection-panel']: ISelectionPanelArgs
  ['hide-selection-panel']: { sourceId: symbol }
}

export const eventBus = mitt<Events>()

export const store = new Vuex.Store({
  // Big performance hog on dev!
  // strict: process.env["NODE_ENV"] !== "production",
  modules: {
    auth: authModule,
    settings: settingsModule,
    entities: entitiesModule,
    entries: entriesModule,
    staging: stagingChangesModule,
    query: queryModule,
    errors: errorsModule,
    reload: reloadModule,
    windows: windowsModule,
    translations: translationsModule,
  },
})

const getThemeHeaderValue = (): string => {
  const themeRef = (store.state as any)?.settings?.currentThemeRef

  if (
    themeRef !== null &&
    themeRef !== undefined &&
    typeof themeRef.schema === 'string' &&
    typeof themeRef.name === 'string'
  ) {
    return `${themeRef.schema}.${themeRef.name}`
  }

  try {
    const rawStored = localStorage.getItem('preferredTheme')
    if (rawStored !== null) {
      const stored = JSON.parse(rawStored) as { schema?: unknown; name?: unknown }
      if (typeof stored.schema === 'string' && typeof stored.name === 'string') {
        return `${stored.schema}.${stored.name}`
      }
    }
  } catch {
    // Ignore malformed localStorage value.
  }

  // Тема из настроек инстанса приезжает уже после первых запросов, и в
  // localStorage её нет, пока пользователь не выбрал тему руками. Её слепок
  // лежит в кэше стилей — берём тему оттуда, иначе первый запрос уходит с
  // 'default' и current_theme() в user view врёт.
  try {
    const rawCache = localStorage.getItem('themeStylesCache')
    if (rawCache !== null) {
      const cached = JSON.parse(rawCache) as { theme?: unknown }
      if (typeof cached.theme === 'string' && cached.theme !== '') {
        return cached.theme
      }
    }
  } catch {
    // Ignore malformed localStorage value.
  }

  return 'default'
}

const installThemeHeaderFetchInterceptor = () => {
  const originalFetch = window.fetch.bind(window)
  const apiBase = new URL(apiUrl, window.location.origin)

  const shouldInjectThemeHeader = (input: RequestInfo): boolean => {
    const url = new URL(
      typeof input === 'string' || input instanceof URL ? String(input) : input.url,
      window.location.origin,
    )

    return (
      url.origin === apiBase.origin &&
      (url.pathname === apiBase.pathname ||
        url.pathname.startsWith(`${apiBase.pathname}/`))
    )
  }

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!shouldInjectThemeHeader(input as RequestInfo)) {
      return originalFetch(input, init)
    }

    const headers = new Headers(input instanceof Request ? input.headers : undefined)
    if (init?.headers !== undefined) {
      const initHeaders = new Headers(init.headers)
      initHeaders.forEach((value, key) => {
        headers.set(key, value)
      })
    }

    if (!headers.has('X-OzmaDB-Theme')) {
      headers.set('X-OzmaDB-Theme', getThemeHeaderValue())
    }

    return originalFetch(input, { ...init, headers })
  }
}

installThemeHeaderFetchInterceptor()

const CHUNK_RELOAD_KEY = 'ozma:chunk-reload-once'
let hasAttemptedChunkReload = false

const extractErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') {
      return message
    }
  }

  return ''
}

const isChunkLoadError = (error: unknown): boolean => {
  const message = extractErrorMessage(error).toLowerCase()
  return (
    message.includes('chunkloaderror') ||
    message.includes('loading chunk') ||
    message.includes('failed to fetch dynamically imported module')
  )
}

const didAttemptChunkReload = (): boolean => {
  if (hasAttemptedChunkReload) {
    return true
  }

  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1') {
      hasAttemptedChunkReload = true
      return true
    }
  } catch {
    // sessionStorage might be unavailable (privacy mode / browser policy).
  }

  return false
}

const markChunkReloadAttempt = (): void => {
  hasAttemptedChunkReload = true

  try {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
  } catch {
    // Ignore storage write errors and still proceed with reload.
  }
}

const reloadOnChunkLoadError = (error: unknown): void => {
  if (!isChunkLoadError(error) || didAttemptChunkReload()) {
    return
  }

  markChunkReloadAttempt()
  window.location.reload()
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
Vue.use(TextareaAutosize)
Vue.use(VueIsMobile)

Vue.component('UserView', UserView)
Vue.component('ButtonsPanel', ButtonsPanel)
Vue.component('ButtonGroup', ButtonGroup)
Vue.component('FormControl', FormControl)
Vue.component('OzmaLink', OzmaLink)

Vue.directive('visible', (el, bind) => {
  el.style.visibility = bind.value ? 'visible' : 'hidden'
})

Modules.router.beforeResolve((to, from, next) => {
  // Reset page title and meta tags
  const titleDefault = 'ozma.io — a low-code platform for CRM and ERP solutions'
  const descriptionDefault =
    'ozma.io — an enterprise-level CRM and ERP platform, less expensive than Salesforce and Microsoft, fully customizable by any developer in a few hours.'
  setHeadTitle('ozma.io — a low-code platform for CRM and ERP solutions')
  setHeadMeta('name', 'description', descriptionDefault)
  setHeadMeta('property', 'og:title', titleDefault)
  setHeadMeta('property', 'og:description', descriptionDefault)
  setHeadMeta('property', 'twitter:title', titleDefault)
  setHeadMeta('property', 'twitter:description', descriptionDefault)
  next()
})

Modules.router.onError((error) => {
  reloadOnChunkLoadError(error)
})

window.addEventListener('error', (event) => {
  reloadOnChunkLoadError(event.error ?? event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  reloadOnChunkLoadError(event.reason)
})

export const app = new Vue({
  router: Modules.router,
  i18n: Modules.i18n,
  store,
  render: (f) => f(App),
}).$mount('#app')

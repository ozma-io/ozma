import { Module } from 'vuex'
import FunDBAPI, {
  OzmaDBError,
  IEntityRef,
  IPermissionsInfo,
  ITransaction,
  IUserViewRef,
  IViewExprResult,
  RowKey,
  goodName,
} from '@ozma-io/ozmadb-js/client'

import { IRef, convertString, waitTimeout } from '@/utils'
import { funappSchema } from '@/api'
import { CancelledError } from '@/modules'
import {
  ThemesMap,
  loadThemes,
  getPreferredTheme,
  IThemeRef,
} from '@/utils_colors'

const errorKey = 'settings'

export interface ICommunicationLinks {
  email: string | null
  whatsapp: string | null
  telegram: string | null
}

const getCommunicationButtons = (
  settings: CurrentSettings,
): ICommunicationLinks => {
  const emailLink = settings.getEntry('instance_help_email', String, null)
  const whatsappLink = settings.getEntry('instance_help_whatsapp', String, null)
  const telegramLink = settings.getEntry('instance_help_telegram', String, null)

  return {
    email: emailLink === '' ? null : emailLink,
    whatsapp: whatsappLink === '' ? null : whatsappLink,
    telegram: telegramLink === '' ? null : telegramLink,
  }
}

const getEditViewQuery = (settings: CurrentSettings): IUserViewRef => {
  const editViewQuery = settings.getEntry(
    'edit_view_query_custom_view',
    String,
    '',
  )

  let schema = funappSchema
  let name = 'user_view_by_name'

  const namePartRegex = '[a-zA-Z0-9_]+'
  const nameRegex = `(?:"(${namePartRegex})"|(${namePartRegex}))`
  const userViewRegex = new RegExp(`^${nameRegex}\\.${nameRegex}$`)

  const schemaNameMatch = userViewRegex.exec(editViewQuery)
  if (schemaNameMatch !== null) {
    const [rawSchema, rawName] = schemaNameMatch.slice(1).filter(Boolean)
    if (goodName(rawSchema) && goodName(rawName)) {
      schema = rawSchema
      name = rawName
    }
  }

  return {
    schema,
    name,
  }
}

export class CurrentSettings {
  settings: Record<string, string>
  communicationLinks: ICommunicationLinks
  editViewQuery: IUserViewRef
  themes: ThemesMap

  constructor(settings: Record<string, string>, themes: ThemesMap) {
    this.settings = settings
    this.themes = themes
    this.communicationLinks = getCommunicationButtons(this)
    this.editViewQuery = getEditViewQuery(this)
  }

  getEntry<T>(name: string, constructor: (_: string) => T, defValue: T): T {
    const ret = this.settings[name]
    if (ret === undefined) {
      return defValue
    } else {
      return convertString(ret, constructor, defValue)
    }
  }
}

export type DisplayMode = 'development' | 'business'
const emptySettings = new CurrentSettings({}, {})

export interface ISettingsState {
  current: CurrentSettings
  pending: Promise<CurrentSettings> | null
  userId: number | null
  currentThemeRef: IThemeRef | null
  userIsRoot: boolean
  displayMode: DisplayMode
}

const settingsModule: Module<ISettingsState, {}> = {
  namespaced: true,
  state: {
    current: emptySettings,
    pending: null,
    userId: null,
    currentThemeRef: null,
    userIsRoot: false,
    displayMode: 'business',
  },
  getters: {
    developmentModeEnabled: (state) => state.displayMode === 'development',
    businessModeEnabled: (state) => state.displayMode === 'business',
    language: (state) => {
      const browserLocale = navigator.languages[0].split('-')[0]
      return state.current.getEntry('language', String, browserLocale)
    },
  },
  mutations: {
    setSettings: (state, settings: CurrentSettings) => {
      state.current = settings
      state.pending = null
    },
    setPending: (state, pending: Promise<CurrentSettings> | null) => {
      state.pending = pending
    },
    clearSettings: (state) => {
      state.current = emptySettings
      state.pending = null
    },
    setCurrentTheme: (state, theme: IThemeRef | null) => {
      state.currentThemeRef = theme
    },
    setUserIsRoot: (state, isRoot: boolean) => {
      state.userIsRoot = isRoot
    },
    setDisplayMode: (state, mode: DisplayMode) => {
      state.displayMode = mode
    },
    setUserId: (state, userId: number | null) => {
      state.userId = userId
    },
  },
  actions: {
    setAuth: {
      root: true,
      handler: async ({ dispatch }) => {
        await dispatch('getSettings')
      },
    },
    setCurrentTheme: ({ commit }, ref: IThemeRef) => {
      localStorage.setItem('preferredTheme', JSON.stringify(ref))
      commit('setCurrentTheme', ref)
    },
    setUserIsRoot: ({ commit }, isRoot: boolean) => {
      commit('setUserIsRoot', isRoot)
    },
    setDisplayMode: ({ commit }, mode: DisplayMode) => {
      localStorage.setItem('display-mode', mode)
      commit('setDisplayMode', mode)
    },
    setError: ({ commit }, error: string) => {
      commit('errors/setError', { key: errorKey, error }, { root: true })
      commit('setPending', null)
    },
    writeUserSettings: async (
      { state, dispatch, commit },
      { name, value }: { name: string; value: string },
    ) => {
      const values = { ...state.current.settings, [name]: value }
      const settings = new CurrentSettings(values, state.current.themes)
      commit('setSettings', settings)

      if (state.userId === null) return // We can't write settings to the serever if user isn't signed in.

      const entity: IEntityRef = {
        schema: funappSchema,
        name: 'user_settings',
      }
      const id: RowKey = { alt: 'name', keys: { user_id: state.userId, name } }

      const updateTransaction: ITransaction = {
        operations: [
          {
            type: 'update',
            entity,
            id,
            fields: { user_id: state.userId, name, value },
          },
        ],
      }
      const insertTransaction: ITransaction = {
        operations: [
          {
            type: 'insert',
            entity,
            fields: { user_id: state.userId, name, value },
          },
        ],
      }

      try {
        await dispatch(
          'callApi',
          {
            func: (api: FunDBAPI) => api.runTransaction(updateTransaction),
          },
          { root: true },
        )
      } catch (e) {
        // If we can't update entry because it doesn't exist, we insert it.
        if (
          !(e instanceof OzmaDBError) ||
          e.body.error !== 'transaction' ||
          e.body.inner.error !== 'entryNotFound'
        )
          throw e

        await dispatch(
          'callApi',
          {
            func: (api: FunDBAPI) => api.runTransaction(insertTransaction),
          },
          { root: true },
        )
      }
    },
    getSettings: ({ state, commit, dispatch }) => {
      if (state.pending !== null) {
        return state.pending
      }
      const pending: IRef<Promise<CurrentSettings>> = {}
      pending.ref = (async () => {
        await waitTimeout() // Delay promise so that it gets saved to `pending` first.
        try {
          const promises = ['settings', 'my_user_id'].map((name) =>
            dispatch(
              'callApi',
              {
                func: (api: FunDBAPI) =>
                  api.getNamedUserView({ schema: funappSchema, name }),
              },
              { root: true },
            ),
          )
          const [settingsRes, userIdRes] = (await Promise.all(promises)) as [
            IViewExprResult,
            IViewExprResult,
          ]

          const userId = userIdRes.result.rows[0]?.values[0]?.value ?? null
          commit('setUserId', userId)

          if (state.pending !== pending.ref) {
            throw new CancelledError()
          }
          const nameColumnIndex = settingsRes.info.columns.findIndex(
            (column) => column.name === 'name',
          )
          const valueColumnIndex = settingsRes.info.columns.findIndex(
            (column) => column.name === 'value',
          )
          const values = Object.fromEntries(
            settingsRes.result.rows.map((row) => {
              const key = String(row.values[nameColumnIndex].value)
              const value = String(row.values[valueColumnIndex].value)
              return [key, value]
            }),
          )

          // Commit before themes for more resposive loading.
          commit('setSettings', new CurrentSettings(values, {}))

          const themes = await loadThemes()
          const currentThemeName = getPreferredTheme(
            themes,
            values['themes_schema'],
          )

          const settings = new CurrentSettings(values, themes)
          commit('setSettings', settings)

          if (settings.getEntry('allow_business_mode', Boolean, false)) {
            const userPermissions: IPermissionsInfo = await dispatch(
              'callApi',
              {
                func: (api: FunDBAPI) => api.getPermissions(),
              },
              { root: true },
            )
            const savedDisplayMode = localStorage.getItem('display-mode')

            await dispatch('setUserIsRoot', userPermissions.isRoot)
            await dispatch('setDisplayMode', savedDisplayMode ?? 'business')
          } else {
            await dispatch('setDisplayMode', 'development')
          }

          commit('setCurrentTheme', currentThemeName)
          commit('errors/resetErrors', errorKey, { root: true })

          return settings
        } catch (e) {
          if (state.pending === pending.ref) {
            void dispatch('setError', String(e))
          }
          throw e
        }
      })()
      commit('setPending', pending.ref)
      return pending.ref
    },
  },
}

export default settingsModule

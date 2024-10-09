import { Module } from 'vuex'
import FunDBAPI, {
  IViewExprResult,
  SchemaName,
} from '@ozma-io/ozmadb-js/client'
import { z } from 'zod'
import Vue from 'vue'

import { IRef, waitTimeout } from '@/utils'
import { ozmaSchema } from '@/api'

const userString = z.union([z.string(), z.record(z.string(), z.string())])

export type Language = string

export interface ITranslatedString {
  default: Language
  strings: Record<Language, string>
}

export interface IMessageString {
  schema: SchemaName
  message: string
}

export type UserString = string | ITranslatedString | IMessageString

export const isUserString = (us: unknown): us is UserString => {
  if (typeof us === 'string') {
    return true
  }
  if (typeof us === 'object' && us !== null) {
    if ('default' in us && 'strings' in us) {
      return true
    }
    if ('schema' in us && 'message' in us) {
      return true
    }
  }
  return false
}

export const isOptionalUserString = (
  us: unknown,
): us is UserString | undefined => {
  if (us === undefined) {
    return true
  }
  return isUserString(us)
}

const errorKey = 'translations'

export type TranslationsMap = Record<SchemaName, Record<string, string>>

export class CurrentTranslations {
  language: Language
  translations: TranslationsMap

  constructor(language: Language, translations: TranslationsMap) {
    this.language = language
    this.translations = translations
  }
}

const emptyTranslations = new CurrentTranslations('', {})

export interface ITranslationsState {
  current: CurrentTranslations
  pending: Promise<CurrentTranslations> | null
}

const translationsModule: Module<ITranslationsState, {}> = {
  namespaced: true,
  state: {
    current: emptyTranslations,
    pending: null,
  },
  mutations: {
    setTranslations: (state, translations: CurrentTranslations) => {
      state.current = translations
      state.pending = null
    },
    setPending: (state, pending: Promise<CurrentTranslations> | null) => {
      state.pending = pending
    },
    clearTranslations: (state) => {
      state.current = emptyTranslations
      state.pending = null
    },
  },
  actions: {
    getTranslations: ({ state, commit, dispatch }, language: Language) => {
      const pending: IRef<Promise<CurrentTranslations>> = {}
      pending.ref = (async () => {
        await waitTimeout() // Delay promise so that it gets saved to `pending` first.
        try {
          const res = (await dispatch(
            'callApi',
            {
              func: (api: FunDBAPI) =>
                api.getNamedUserView(
                  { schema: ozmaSchema, name: 'translations_by_language' },
                  { language },
                ),
            },
            { root: true },
          )) as IViewExprResult

          if (state.pending !== pending.ref) {
            return state.pending!
          }

          const schemaColumnIndex = res.info.columns.findIndex(
            (column) => column.name === 'schema_name',
          )
          const messageColumnIndex = res.info.columns.findIndex(
            (column) => column.name === 'message',
          )
          const translationColumnIndex = res.info.columns.findIndex(
            (column) => column.name === 'translation',
          )
          const translationsMap = {} as TranslationsMap
          for (const row of res.result.rows) {
            const schemaName = row.values[schemaColumnIndex].value as SchemaName
            const message = row.values[messageColumnIndex].value as string
            const translation = row.values[translationColumnIndex]
              .value as string

            let schemaTranslations = translationsMap[schemaName]
            if (schemaTranslations === undefined) {
              schemaTranslations = {}
              translationsMap[schemaName] = schemaTranslations
            }
            schemaTranslations[message] = translation
          }
          const translations = new CurrentTranslations(
            language,
            translationsMap,
          )
          commit('setTranslations', translations)
          commit('errors/resetErrors', errorKey, { root: true })

          return translations
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

declare module 'vue/types/vue' {
  // eslint-disable-next-line no-shadow
  interface Vue {
    $ustOrEmpty: (str: UserString) => string
  }
}

Vue.mixin({
  methods: {
    // eslint-disable-next-line func-names
    $ustOrEmpty(str: UserString | null | undefined): string {
      if (!str) {
        return ''
      }
      if (typeof str === 'string') {
        return str
      } else {
        const currentLocale = this.$i18n.locale
        if ('strings' in str) {
          if (currentLocale in str.strings) {
            return str.strings[currentLocale]
          } else {
            return str.default
          }
        } else if ('message' in str) {
          const currentTranslations = (
            this.$store.state.translations as ITranslationsState
          ).current
          if (currentTranslations.language === currentLocale) {
            const translation =
              currentTranslations.translations[str.schema]?.[str.message]
            if (translation !== undefined) {
              return translation
            }
          }
          return str.message
        } else {
          throw new Error('Invalid UserString')
        }
      }
    },
  },
})

export const rawToUserString = (raw: unknown): UserString | null => {
  const ret = userString.safeParse(raw)
  if (!ret.success) {
    return null
  } else if (typeof ret.data === 'string') {
    return ret.data
  } else if ('message' in ret.data && 'schema' in ret.data) {
    return {
      schema: ret.data.schema,
      message: ret.data.message,
    }
  } else {
    let defaultLang: Language | undefined
    if ('default' in ret.data) {
      const defLang = ret.data['default']
      if (defLang in ret.data) {
        delete ret.data[defLang]
        defaultLang = defLang
      }
    }
    if ('en' in ret.data) {
      defaultLang = 'en'
    }
    const variants = Object.keys(ret.data)
    if (variants.length === 1) {
      defaultLang = variants[0]
    }

    if (defaultLang) {
      return {
        default: defaultLang,
        strings: ret.data,
      }
    } else {
      return null
    }
  }
}

export default translationsModule

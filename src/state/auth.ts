import { Module, ActionContext } from 'vuex'
import { v4 as uuidv4 } from 'uuid'
import jwtDecode from 'jwt-decode'
import { z } from 'zod'
import FunDBAPI, { FunDBError } from 'ozma-api'

import { IRef } from '@/utils'
import {
  disableAuth,
  authClientId,
  authUrl,
  developmentMode,
  apiUrl,
} from '@/api'
import * as Utils from '@/utils'
import { router, getQueryValue, CancelledError } from '@/modules'

export class CurrentAuth {
  createdTime: number
  token: string | null
  refreshToken: string
  idToken: string
  decodedToken: Record<string, string> | null
  decodedRefreshToken: Record<string, string>
  decodedIdToken: Record<string, string>

  constructor(
    token: string | null,
    refreshToken: string,
    idToken: string,
    createdTime?: number,
  ) {
    this.createdTime = createdTime !== undefined ? createdTime : Utils.sse()
    this.decodedToken = token ? jwtDecode(token) : null
    this.decodedRefreshToken = jwtDecode(refreshToken)
    this.decodedIdToken = jwtDecode(idToken)
    this.token = token
    this.refreshToken = refreshToken
    this.idToken = idToken
  }

  get username() {
    return this.decodedIdToken['preferred_username']
  }

  get email() {
    return this.decodedIdToken['email']
  }

  get refreshValidFor(): number {
    return (
      Number(this.decodedRefreshToken['exp']) -
      Number(this.decodedRefreshToken['iat'])
    )
  }

  get validFor(): number {
    return this.decodedToken
      ? Number(this.decodedToken['exp']) - Number(this.decodedToken['iat'])
      : 0
  }

  /* get session(): string {
    return this.decodedToken["session_state"];
  } */

  resetToken() {
    this.token = null
    this.decodedToken = null
  }
}

export interface IAuthState {
  current: CurrentAuth | INoAuth | null
  renewalTimeoutId: NodeJS.Timeout | null
  pending: Promise<void> | null
  protectedCalls: number // Used for tracking fetch requests and displaying a progress bar.
  api: FunDBAPI
}

export interface INoAuth {
  refreshToken: null
}

interface IOIDCState {
  path: string
  nonce: string
}

const AuthPersistedState = z.object({
  token: z.nullable(z.string()),
  refreshToken: z.string(),
  idToken: z.string(),
  createdTime: z.number(),
})

type IAuthPersistedState = z.infer<typeof AuthPersistedState>

const authKey = 'auth'
const authNonceKey = 'authNonce'

const redirectUri = () => {
  const returnPath = router.resolve({ name: 'auth_response' }).href
  return `${window.location.protocol}//${window.location.host}${returnPath}`
}

const persistCurrentAuth = (auth: CurrentAuth) => {
  const dump: IAuthPersistedState = {
    token: auth.token,
    refreshToken: auth.refreshToken,
    idToken: auth.idToken,
    createdTime: auth.createdTime,
  }
  localStorage.setItem(authKey, JSON.stringify(dump))
}

const dropCurrentAuth = () => {
  localStorage.removeItem(authKey)
}

const loadCurrentAuth = () => {
  let dump: IAuthPersistedState | undefined
  try {
    const dumpStr = localStorage.getItem(authKey)
    if (dumpStr !== null) {
      dump = AuthPersistedState.parse(JSON.parse(dumpStr))
    }
  } catch (e) {
    console.error(`Failed to get persisted auth data: ${e}`)
  }

  if (dump) {
    const auth = new CurrentAuth(
      dump.token,
      dump.refreshToken,
      dump.idToken,
      dump.createdTime,
    )
    const timestamp = Utils.sse()
    if (auth.createdTime + auth.refreshValidFor > timestamp) {
      return auth
    } else {
      return null
    }
  } else {
    return null
  }
}

const requestToken = async (
  params: Record<string, string>,
): Promise<CurrentAuth> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  }
  const newParams = { ...params, client_id: authClientId }
  const paramsString = new URLSearchParams(newParams).toString()

  const ret = await Utils.fetchJson(`${authUrl}/token`, {
    method: 'POST',
    headers,
    body: paramsString,
  })

  return new CurrentAuth(
    ret.access_token as string,
    ret.refresh_token as string,
    ret.id_token as string,
  )
}

// Forces login on error.
const tryGetToken = (
  context: ActionContext<IAuthState, {}>,
  params: Record<string, string>,
) => {
  const { state, commit, dispatch } = context

  if (state.renewalTimeoutId !== null) {
    clearTimeout(state.renewalTimeoutId)
    commit('setRenewalTimeout', null)
  }

  const oldPending = state.pending
  const pending: IRef<Promise<void>> = {}
  pending.ref = (async () => {
    await Utils.waitTimeout() // Delay promise so that it gets saved to `pending` first.
    if (oldPending !== null) {
      try {
        await oldPending
      } catch (_) {
        // It's handled somewhere else.
      }
    }
    try {
      while (true) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const auth = await requestToken(params)
          if (state.pending !== pending.ref) {
            throw new CancelledError()
          }
          updateAuth(context, auth)
        } catch (e) {
          if (
            (state.pending === pending.ref &&
              e instanceof Utils.NetworkError) ||
            (e instanceof Utils.FetchError && e.response.status >= 500)
          ) {
            // Most likely there are no internet connection now, so wait and try again.
            // eslint-disable-next-line no-await-in-loop
            await Utils.waitTimeout(10000)
            continue
          }
          throw e
        }
        break
      }
    } catch (e) {
      if (state.pending === pending.ref) {
        let error: string | null
        if (e instanceof Utils.FetchError && typeof e.body === 'object') {
          // try setting a better error
          if (e.body?.error === 'invalid_grant') {
            // token got revoked, not an error condition.
            error = null
          } else if ('error_description' in e.body) {
            error = String(e.body.error_description)
          } else {
            error = String(e)
          }
        } else {
          error = String(e)
        }

        if (error) {
          void dispatch('setError', `Error when getting token: ${error}`)
        }

        await dispatch('removeAuth')
      }

      throw e
    } finally {
      if (state.pending === pending.ref) {
        commit('setPending', null)
      }
    }
  })()
  commit('setPending', pending.ref)
  return pending.ref
}

const updateAuth = (
  context: ActionContext<IAuthState, {}>,
  auth: CurrentAuth | INoAuth,
  opts?: { noPersist?: boolean },
) => {
  context.commit('setAuth', auth)
  // eslint-disable-next-line
  Utils.debugLog(
    'Setting new refresh token',
    auth.refreshToken,
    'no_persist',
    opts?.noPersist,
  )
  if (auth.refreshToken) {
    if (!opts?.noPersist) {
      persistCurrentAuth(auth)
    }
    startTimeouts(context)
  } else {
    stopTimeouts(context)
  }
}

const renewAuth = async (context: ActionContext<IAuthState, {}>) => {
  const { state } = context

  if (!state.current?.refreshToken) {
    throw new Error('Cannot renew without an existing token')
  }

  const params: Record<string, string> = {
    grant_type: 'refresh_token',
    refresh_token: state.current.refreshToken,
  }
  await tryGetToken(context, params)
}

const constantFactorStart = 0.8
const constantFactorEnd = 0.9

const startTimeouts = (context: ActionContext<IAuthState, {}>) => {
  const { state, commit } = context

  if (!state.current?.refreshToken) {
    throw new Error('Cannot start timeouts without a token')
  }

  const validFor =
    state.current.createdTime - Utils.sse() + state.current.validFor
  // Random timeouts to not overload the server with different tabs.
  const timeoutSecs =
    constantFactorStart * validFor +
    Math.random() * (constantFactorEnd - constantFactorStart) * validFor

  if (state.renewalTimeoutId !== null) {
    clearTimeout(state.renewalTimeoutId)
  }
  if (document.hidden) {
    commit('setRenewalTimeout', null)
  } else if (timeoutSecs < 0) {
    void renewAuth(context)
  } else {
    const timeoutRef: IRef<NodeJS.Timeout> = {}
    timeoutRef.ref = setTimeout(() => {
      if (state.pending === null) {
        void renewAuth(context)
      } else if (state.renewalTimeoutId === timeoutRef.ref) {
        commit('setRenewalTimeout', null)
      }
    }, timeoutSecs * 1000)
    commit('setRenewalTimeout', timeoutRef.ref)
  }
}

const goAway = ({ commit }: ActionContext<IAuthState, {}>, url: string) => {
  window.open(url, '_self')
  commit('errors/setSilent', true, { root: true })
  commit('setPending', Utils.never)
  return Utils.never
}

const requestLogin = (
  context: ActionContext<IAuthState, {}>,
  opts: { tryExisting?: boolean; path?: string },
) => {
  const nonce = uuidv4()
  sessionStorage.setItem(authNonceKey, nonce)
  let realPath: string
  if (opts.path) {
    realPath = opts.path
  } else if (router.currentRoute.name === 'auth_response') {
    realPath = router.resolve({ name: 'main' }).href
  } else {
    realPath = router.currentRoute.fullPath
  }
  const savedState: IOIDCState = {
    nonce,
    path: realPath,
  }
  const params = {
    client_id: authClientId,
    redirect_uri: redirectUri(),
    state: btoa(JSON.stringify(savedState)),
    scope: 'openid',
    response_mode: 'query',
    response_type: 'code',
    prompt: opts.tryExisting ? 'none' : 'login',
  }
  const paramsString = new URLSearchParams(params).toString()

  return goAway(context, `${authUrl}/auth?${paramsString}`)
}

const runApiCall = async <Ret>(
  context: ActionContext<IAuthState, {}>,
  func: (api: FunDBAPI) => Promise<Ret>,
) => {
  const { state, commit, dispatch } = context
  commit('increaseProtectedCalls')

  try {
    while (true) {
      try {
        // eslint-disable-next-line no-await-in-loop
        return await func(context.state.api)
      } catch (e) {
        if (e instanceof FunDBError) {
          if (e.body.error === 'unauthorized') {
            if (!state.current?.refreshToken) {
              // eslint-disable-next-line no-await-in-loop
              await requestLogin(context, { tryExisting: true })
            } else {
              commit('resetToken')
              // eslint-disable-next-line no-await-in-loop
              await dispatch(
                'setError',
                `Authentication error during request: ${e.message}`,
              )
              // eslint-disable-next-line no-await-in-loop
              await renewAuth(context)
              continue
            }
          }
        }
        throw e
      }
    }
  } finally {
    commit('decreaseProtectedCalls')
  }
}

const stopTimeouts = ({ state, commit }: ActionContext<IAuthState, {}>) => {
  if (state.renewalTimeoutId !== null) {
    clearTimeout(state.renewalTimeoutId)
    commit('setRenewalTimeout', null)
  }
}

const authQueryKey = '__auth'

export const getAuthedLink = (auth: CurrentAuth): string => {
  const query = { ...router.currentRoute.query }
  query[authQueryKey] = auth.refreshToken
  const href = router.resolve({ path: router.currentRoute.path, query }).href
  return window.location.origin + href
}

const errorKey = 'auth'

export interface ICallApi {
  <Ret>({ func }: { func: (api: FunDBAPI) => Promise<Ret> }): Promise<Ret>
}

export const authModule: Module<IAuthState, {}> = {
  namespaced: true,
  state: {
    current: null,
    pending: null,
    renewalTimeoutId: null,
    protectedCalls: 0,
    api: new FunDBAPI({ apiUrl }),
  },
  mutations: {
    setAuth: (state, auth: CurrentAuth | INoAuth) => {
      state.current = auth
      state.api.token = auth.refreshToken ? auth.token : null
    },
    setRenewalTimeout: (state, renewalTimeoutId: NodeJS.Timeout | null) => {
      state.renewalTimeoutId = renewalTimeoutId
    },
    resetToken: (state) => {
      if (state.current?.refreshToken) {
        state.current.resetToken()
        state.api.token = null
      }
    },
    setPending: (state, pending: Promise<void> | null) => {
      state.pending = pending
    },
    increaseProtectedCalls: (state) => {
      state.protectedCalls += 1
    },
    decreaseProtectedCalls: (state) => {
      state.protectedCalls -= 1
    },
  },
  actions: {
    removeAuth: {
      handler: async (context) => {
        stopTimeouts(context)
        return requestLogin(context, { tryExisting: true })
      },
    },
    stopTimeouts: {
      handler: (context) => {
        stopTimeouts(context)
      },
    },
    setAuth: {
      root: true,
      handler: ({ commit }) => {
        commit('errors/resetErrors', errorKey, { root: true })
      },
    },
    setError: ({ commit }, error: string) => {
      commit('errors/setError', { key: errorKey, error }, { root: true })
    },
    startAuth: (context) => {
      const { state, commit, dispatch } = context

      console.assert(state.pending === null)
      const pending: IRef<Promise<void>> = {}
      pending.ref = (async () => {
        await Utils.waitTimeout() // Delay promise so that it gets saved to `pending` first.

        try {
          if (disableAuth) {
            return
          }

          await new Promise<void>((resolve) => {
            router.onReady(resolve)
          }) // Await till router is ready.

          if (router.currentRoute.name === 'auth_response') {
            const stateString = getQueryValue('state')
            if (stateString !== null) {
              const savedState: IOIDCState = JSON.parse(atob(stateString))
              const nonce = sessionStorage.getItem(authNonceKey)
              sessionStorage.removeItem(authNonceKey)
              if (nonce === null || savedState.nonce !== nonce) {
                // Invalid nonce; silently redirect.
                console.error('Invalid client nonce')
                await router.replace({ name: 'main' })
              } else {
                const code = getQueryValue('code')
                if (code !== null) {
                  const params: Record<string, string> = {
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: redirectUri(),
                  }
                  const auth = await requestToken(params)
                  updateAuth(context, auth)
                } else {
                  const error = getQueryValue('error')
                  if (
                    error !== 'login_required' &&
                    error !== 'interaction_required'
                  ) {
                    const errorDescription = getQueryValue('errorDescription')
                    void dispatch(
                      'setError',
                      `Invalid auth response query parameters, error ${error} ${errorDescription}`,
                    )
                  } else {
                    await requestLogin(context, { path: savedState.path })
                  }
                }
                await router.replace(savedState.path)
              }
            } else {
              // We got here after logout, redirect.
              await router.replace({ name: 'main' })
            }
          } else if (
            developmentMode &&
            authQueryKey in router.currentRoute.query
          ) {
            const refreshToken = String(router.currentRoute.query[authQueryKey])
            const newQuery = { ...router.currentRoute.query }
            delete newQuery[authQueryKey]
            await router.replace({ query: newQuery })
            const params: Record<string, string> = {
              grant_type: 'refresh_token',
              refresh_token: refreshToken,
            }
            try {
              const currAuth = await requestToken(params)
              updateAuth(context, currAuth)
            } catch (e) {
              console.error('Failed to use refresh token from URL', e)
            }
          } else {
            const oldAuth = loadCurrentAuth()
            if (oldAuth !== null) {
              updateAuth(context, oldAuth, { noPersist: true })
            }
          }

          const authStorageHandler = (e: StorageEvent) => {
            if (e.key !== authKey) {
              return
            }

            if (e.newValue === null) {
              void dispatch('removeAuth')
            } else {
              const newAuth = loadCurrentAuth()
              Utils.debugLog(
                'Got new current auth',
                newAuth?.refreshToken,
                'current',
                state.current,
                'current token',
                state.current?.refreshToken,
              )
              if (
                newAuth?.refreshToken &&
                (state.current === null ||
                  newAuth.refreshToken !== state.current.refreshToken)
              ) {
                // Stop running any refresh. We will run it if the token is expired later.
                commit('setPending', null)
                updateAuth(context, newAuth, { noPersist: true })
              }
            }
          }
          window.addEventListener('storage', authStorageHandler)

          const visibilityHandler = () => {
            if (document.hidden) {
              stopTimeouts(context)
            } else if (state.current?.refreshToken) {
              startTimeouts(context)
            }
          }
          window.addEventListener('visibilitychange', visibilityHandler)
        } finally {
          if (state.pending === pending.ref) {
            commit('setPending', null)
          }
        }
        void dispatch('setAuth', undefined, { root: true })
      })()
      commit('setPending', pending.ref)
      return pending.ref
    },
    callApi: {
      root: true,
      handler: async <Ret>(
        context: ActionContext<IAuthState, {}>,
        { func }: { func: (api: FunDBAPI) => Promise<Ret> },
      ): Promise<Ret> => {
        const { state, commit } = context
        while (state.pending !== null) {
          try {
            // eslint-disable-next-line no-await-in-loop
            await state.pending
          } catch (_) {
            // It's handled somewhere else.
          }
          // eslint-disable-next-line no-await-in-loop
          await Utils.waitTimeout()
        }

        if (state.current !== null) {
          return runApiCall(context, func)
        } else {
          // Try to perform operation anyway, see if it fails and set the token to empty if not.
          const pending: IRef<Promise<any>> = {}
          pending.ref = (async () => {
            await Utils.waitTimeout() // Delay promise so that it gets saved to `pending` first.
            const ret = await runApiCall(context, func)
            // Apparently we can proceed with no auth at all!
            if (state.pending === pending.ref) {
              updateAuth(context, { refreshToken: null })
              commit('setPending', null)
            }
            return ret
          })()
          commit('setPending', state.pending)
          return pending.ref
        }
      },
    },
    logout: async (context) => {
      const { state, dispatch } = context

      if (!(state.current instanceof CurrentAuth)) {
        throw new Error('Cannot logout without an existing token')
      }

      if (disableAuth) {
        return
      }

      if (!(await dispatch('staging/askAndReset', undefined, { root: true }))) {
        return
      }

      const params: Record<string, string> = {
        post_logout_redirect_uri: redirectUri(),
        client_id: authClientId,
        id_token_hint: state.current.idToken,
      }
      const paramsString = new URLSearchParams(params).toString()

      dropCurrentAuth()
      await goAway(context, `${authUrl}/logout?${paramsString}`)
    },
    login: async (context) => {
      if (!context.state.current?.refreshToken) {
        await requestLogin(context, { tryExisting: true })
      }
    },
  },
}

export default authModule

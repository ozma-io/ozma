import { Store } from 'vuex'
import FunDBAPI, { IActionRef, IActionResult } from '@ozma-io/ozmadb-js/client'

import { findErrorUserData } from '@/api'
import { app, eventBus } from '@/main'
import { i18n } from '@/modules'
import { ISubmitResult } from '@/state/staging_changes'

import { CurrentSettings } from './settings'
import { CurrentAuth, INoAuth } from './auth'

const dirtyHackGetErrorMessage = (error: unknown): string => {
  const errorString = String(error)
  return (
    /^Error: Uncaught Error: (.*)\n/.exec(errorString)?.[1] ??
    errorString.replace(/^Error: /, '')
  )
}

export const saveAndRunAction = async (
  { dispatch, state }: Store<any>,
  ref: IActionRef,
  args: Record<string, unknown>,
): Promise<IActionResult> => {
  const settings = state.settings.current as CurrentSettings
  const auth = state.auth.current as CurrentAuth | INoAuth | null

  let ret: IActionResult | undefined
  let needsReload = false
  try {
    const submitRet: ISubmitResult = await dispatch(
      'staging/submit',
      {
        preReload: async () => {
          try {
            ret = await dispatch(
              'callApi',
              {
                func: (api: FunDBAPI) => api.runAction(ref, args),
              },
              { root: true },
            )
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const finishInfo = (ret as any)?.finishInfo as
              | { status: string; message?: string }
              | undefined
            if (finishInfo) {
              const { status, message } = finishInfo
              const toastBody = message ?? i18n.tc(`action_finish_${status}`)
              /* Only errors are worth pinning: a warning that never hides
                 outlives the screen it was raised on and later reads as a
                 problem of whatever screen the user has moved to. */
              app.$bvToast.toast(toastBody, {
                title: i18n.tc(`action_finish_${status}`),
                toastClass: `finish-toast finish-toast--${status}`,
                solid: true,
                noAutoHide: status === 'error',
                autoHideDelay: status === 'warning' ? 15000 : undefined,
              })
            }
          } catch (e) {
            if (!(e instanceof Error)) {
              throw e
            }

            const userData = findErrorUserData(e)
            if (userData) {
              ret = { result: userData }
            } else if (
              settings.getEntry('is_read_only_demo_instance', Boolean, false) &&
              !auth?.refreshToken
            ) {
              eventBus.emit('show-readonly-demo-modal')
            } else {
              app.$bvToast.toast(dirtyHackGetErrorMessage(e), {
                title: i18n.tc('exception_in_action'),
                variant: 'danger',
                solid: true,
                noAutoHide: true,
              })
            }

            throw e
          }
        },
      },
      { root: true },
    )
    // `submit` runs the reload for us if there were any unsubmitted changes.
    needsReload = submitRet.results.length === 0
  } catch (e) {
    if (ret === undefined) {
      throw e
    }
  }

  if (needsReload) {
    void dispatch('reload', undefined, { root: true })
  }
  return ret as IActionResult
}

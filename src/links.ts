import { IActionRef } from '@ozma-io/ozmadb-js/client'
import { z } from 'zod'

import { app } from '@/main'
import {
  queryLocation,
  IQueryState,
  IQuery,
  attrToRef,
  IAttrToQueryOpts,
  attrToRecord,
  attrObjectToQuery,
  selfIdArgs,
  refIdArgs,
} from '@/state/query'
import { randomId, waitTimeout } from '@/utils'
import { saveAndRunAction } from '@/state/actions'
import { router, i18n } from '@/modules'
import { IValueInfo } from '@/user_views/combined'
import { documentGeneratorUrl, IDocumentRef, instanceName } from '@/api'
import { UserString, rawToUserString } from './state/translations'

export const hrefTargetTypes = ['blank', 'self'] as const
export type HrefTargetType = (typeof hrefTargetTypes)[number]

const isHrefTargetType = (rawType: unknown): rawType is HrefTargetType => {
  return hrefTargetTypes.includes(rawType as any)
}

export interface IHrefLink {
  href: string
  type: 'href'
  target: HrefTargetType
}

export const targetTypes = [
  'top',
  'root',
  'modal',
  'blank',
  'modal-auto',
] as const
export type TargetType = (typeof targetTypes)[number]

const isTargetType = (rawType: unknown): rawType is TargetType => {
  return targetTypes.includes(rawType as any)
}

export interface IQueryLink {
  query: IQuery
  target: TargetType
  type: 'query'
}

export interface IActionLink {
  action: IActionRef
  args: Record<string, unknown>
  type: 'action'
}

export interface IQRCodeLink {
  links: Record<string, Record<string, Link>>
  type: 'qrcode'
}

export interface IDocumentLink {
  type: 'document'
  template: IDocumentRef
  filename: string
  args: Record<string, unknown>
}

export interface IToastLink {
  type: 'toast'
  variant: string
  title: UserString
  message: UserString
  noAutoHide: boolean
  next: Link | null
}

export type Link =
  | IHrefLink
  | IQueryLink
  | IActionLink
  | IQRCodeLink
  | IDocumentLink
  | IToastLink

export interface IAttrToLinkOpts extends IAttrToQueryOpts {
  defaultTarget?: TargetType
  defaultActionArgs?: Record<string, any>
  defaultToastTitle?: string
}

export const addLinkDefaultArgs = (link: Link, args: object) => {
  if ('args' in link) {
    link.args = { ...args, ...link.args }
  } else if ('query' in link && link.query.args.args) {
    link.query.args.args = { ...args, ...link.query.args.args }
  }
}

export const EntityRef = z.object({
  schema: z.string(),
  name: z.string(),
})

export const attrToQueryLink = (
  linkedAttr: object,
  opts?: IAttrToLinkOpts,
): IQueryLink | null => {
  const query = attrObjectToQuery(linkedAttr, opts)
  if (query === null) {
    return null
  }

  const attrDict = linkedAttr as Record<string, unknown>
  const targetAttr = attrDict['target']
  let target: TargetType
  if (isTargetType(targetAttr)) {
    target = targetAttr
  } else if (opts?.defaultTarget) {
    target = opts.defaultTarget
  } else {
    target = 'modal-auto'
  }

  return { query, target, type: 'query' }
}

export const attrToActionLink = (
  linkedAttr: object,
  opts?: IAttrToLinkOpts,
): IActionLink | null => {
  const attrDict = linkedAttr as Record<string, unknown>
  const action = attrToRef(attrDict['action'])
  if (action === null) {
    return null
  }

  let args = attrToRecord(attrDict['args'])
  if (args === null) {
    return null
  }

  const display = attrDict['display']
  if (display === 'selection_panel' || display === 'selectionPanel') {
    args = { ...opts?.defaultActionArgs, ...args }
  }

  return { action, args, type: 'action' }
}

export const attrToQRCodeLink = (
  linkedAttr: object,
  opts?: IAttrToLinkOpts,
): IQRCodeLink | null => {
  const attrDict = linkedAttr as Record<string, unknown>
  const qrСodeLink: IQRCodeLink = {
    links: {},
    type: 'qrcode',
  }

  const linksObj = attrDict['qrcode']
  if (typeof linksObj !== 'object' || linksObj === null) {
    return null
  }

  Object.entries(linksObj).forEach(([schema, entities]) => {
    if (typeof entities !== 'object' || entities === null) {
      return
    }

    const entitiesObj = entities as Record<string, unknown>
    Object.entries(entitiesObj).forEach(([entity, rawLink]) => {
      if (typeof rawLink !== 'object' || rawLink === null) {
        return
      }
      const link = attrToLink(rawLink, opts)
      if (link !== null) {
        if (!qrСodeLink.links[schema]) {
          qrСodeLink.links[schema] = {}
        }
        qrСodeLink.links[schema][entity] = link
      }
    })
  })

  return qrСodeLink
}

const extensions = ['pdf', 'odt', 'html', 'txt']
const extensionRegex = new RegExp(`.*.${extensions.join('|')}$`)
const filenameHasExtension = (filename: string): boolean =>
  extensionRegex.exec(filename) !== null

export const attrToDocumentLink = (
  linkedAttr: Record<string, unknown>,
  opts?: IAttrToLinkOpts,
): IDocumentLink | null => {
  const templateRaw = linkedAttr['document_template']
  if (typeof templateRaw !== 'object' || templateRaw === null) return null
  const templateObj = templateRaw as Record<string, unknown>
  const ref = EntityRef.safeParse(templateObj)
  const filenameRaw = linkedAttr['filename']
  const args = attrToRecord(linkedAttr['args'])
  if (
    !ref.success ||
    (filenameRaw !== undefined && typeof filenameRaw !== 'string') ||
    args === null
  ) {
    return null
  }
  const filename =
    filenameRaw === undefined
      ? `${ref.data.name}.pdf`
      : filenameRaw + (filenameHasExtension(filenameRaw) ? '' : '.pdf')

  return { type: 'document', template: ref.data, filename, args }
}

export const attrToToastLink = (
  linkedAttr: Record<string, unknown>,
  opts?: IAttrToLinkOpts,
): IToastLink | null => {
  const rawMessage = linkedAttr['toast']
  const message = rawToUserString(rawMessage)
  if (message === null) return null
  const title =
    rawToUserString(linkedAttr['title']) ??
    opts?.defaultToastTitle ??
    i18n.tc('error')
  const variant = String(linkedAttr['variant'] ?? 'danger')
  const next = attrToLink(linkedAttr['next'], opts)
  const noAutoHide = Boolean(linkedAttr['noAutoHide'])
  return { type: 'toast', message, title, variant, noAutoHide, next }
}

export const attrToLink = (
  linkedAttr: unknown,
  opts?: IAttrToLinkOpts,
): Link | null => {
  if (typeof linkedAttr === 'string') {
    return {
      type: 'href',
      href: linkedAttr,
      target: 'self',
    }
  }

  if (typeof linkedAttr !== 'object' || linkedAttr === null) {
    return null
  }
  const linkedAttrObj = linkedAttr as Record<string, unknown>

  const query = attrToQueryLink(linkedAttrObj, opts)
  if (query !== null) {
    return query
  }

  const href = linkedAttrObj['href']
  if (typeof href === 'string') {
    const target = isHrefTargetType(linkedAttrObj['target'])
      ? linkedAttrObj['target']
      : 'self'
    return {
      type: 'href',
      href,
      target,
    }
  }

  const action = attrToActionLink(linkedAttrObj, opts)
  if (action !== null) {
    return action
  }

  const qrCode = attrToQRCodeLink(linkedAttrObj, opts)
  if (qrCode !== null) {
    return qrCode
  }

  const documentLink = attrToDocumentLink(linkedAttrObj, opts)
  if (documentLink !== null) {
    return documentLink
  }

  const toastLink = attrToToastLink(linkedAttrObj, opts)
  if (toastLink !== null) {
    return toastLink
  }

  return null
}

// Set 'id' argument to the value id.
export const attrToLinkSelf = (
  linkedAttr: unknown,
  update?: IValueInfo,
  opts?: IAttrToLinkOpts,
): Link | null => {
  if (typeof linkedAttr !== 'object') {
    return null
  }

  const ret = attrToLink(linkedAttr, opts)
  if (ret !== null) {
    addLinkDefaultArgs(ret, selfIdArgs(update))
  }
  return ret
}

// Set 'id' argument to the id of the referenced value.
export const attrToLinkRef = (
  linkedAttr: unknown,
  value: unknown,
  opts?: IAttrToLinkOpts,
): Link | null => {
  const ret = attrToLink(linkedAttr, opts)
  if (ret !== null) {
    addLinkDefaultArgs(ret, refIdArgs(value))
  }
  return ret
}

export const iconValue = (target: string) => {
  if (target === 'modal-auto' || target === 'modal') {
    return 'flip_to_front'
  } else {
    return 'open_in_new'
  }
}

export interface ILinkHandler {
  handler: () => Promise<void>
  href?: string
  target?: string
  rel?: string
}

export interface ILinkHandlerParams {
  goto?: (_: { query: IQuery; replace?: boolean }) => unknown
  replaceOnGoto?: boolean
  resetChangesOnGoto?: boolean
}

export const linkHandler = (
  link: Link,
  params?: ILinkHandlerParams,
): ILinkHandler => {
  let handler: () => Promise<void>
  let href: string | undefined
  // HTML <a> target, with underscores.
  let target: string | undefined
  let rel: string | undefined

  const beforeGoto = async () => {
    if (params?.resetChangesOnGoto) {
      await app.$store.dispatch('staging/reset')
    }
  }

  if (link.type === 'query') {
    const query = link.query
    // We always point href to just the location itself, for simplicity.
    href = router.resolve(queryLocation(query)).href
    rel = 'noopener'

    if (link.target === 'modal') {
      handler = async () => {
        await beforeGoto()
        await app.$store.dispatch('query/addWindow', query)
      }
    } else if (link.target === 'root') {
      /* eslint-disable @typescript-eslint/require-await */
      const goto = params?.goto
      if (goto) {
        handler = async () => {
          await beforeGoto()
          await goto({ query, replace: params?.replaceOnGoto })
        }
      } else {
        handler = async () => {
          await beforeGoto()
          await app.$store.dispatch('query/push', {
            query,
            replace: params?.replaceOnGoto,
          })
        }
      }
      /* eslint-enable @typescript-eslint/require-await */
    } else if (link.target === 'top') {
      handler = async () => {
        await beforeGoto()
        await app.$store.dispatch('query/push', { key: null, query })
      }
    } else if (link.target === 'blank') {
      target = '_blank'
      // eslint-disable-next-line @typescript-eslint/require-await
      handler = async () => {
        await beforeGoto()
        window.open(href!, target, rel)
      }
    } else if (link.target === 'modal-auto') {
      handler = async () => {
        await beforeGoto()
        const queryState = app.$store.state.query as IQueryState
        if (queryState.current?.windows.length === 0) {
          await app.$store.dispatch('query/addWindow', query)
        } else {
          await app.$store.dispatch('query/push', {
            query,
            replace: params?.replaceOnGoto,
          })
        }
      }
    } else {
      throw new Error('Impossible')
    }
  } else if (link.type === 'href') {
    href = link.href
    rel = 'noreferrer'

    if (link.target === 'self') {
      target = '_self'
    } else if (link.target === 'blank') {
      target = '_blank'
    } else {
      throw new Error('Impossible')
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    handler = async () => {
      await beforeGoto()
      window.open(href!, target, rel)
    }
  } else if (link.type === 'action') {
    const { action, args } = link

    handler = async () => {
      await beforeGoto()
      const ret = await saveAndRunAction(app.$store, action, args)
      const retLink = attrToLink(ret.result, {
        defaultTarget: 'root',
        defaultToastTitle: i18n.tc('exception_in_action'),
      })
      if (retLink !== null) {
        await linkHandler(retLink, params).handler()
      }
    }
  } else if (link.type === 'qrcode') {
    // eslint-disable-next-line @typescript-eslint/require-await
    handler = async () => {
      app.$emit('open-qrcode-scanner', link)
    }
  } else if (link.type === 'document') {
    const { template, filename, args } = link
    handler = async () => {
      if (documentGeneratorUrl === undefined) {
        app.$bvToast.toast(i18n.tc('no_generator'), {
          title: i18n.tc('generation_start_title'),
          solid: true,
        })
      }
      await beforeGoto()
      await app.$store.dispatch('staging/submit', { errorOnIncomplete: true })
      const token = app.$store.state.auth.current.token
      const escapedFilename = encodeURIComponent(filename)
      const url = new URL(
        `${documentGeneratorUrl}/api/${instanceName}/${template.schema}/${template.name}/generate/${escapedFilename}`,
      )
      url.search = new URLSearchParams(
        args as Record<string, string>,
      ).toString()

      const id = randomId()
      app.$bvToast.toast(i18n.tc('generation_start_description'), {
        title: i18n.tc('generation_start_title'),
        noAutoHide: true,
        solid: true,
        id,
      })

      try {
        const res = await fetch(url.toString(), {
          method: 'GET',
          redirect: 'manual',
          headers: new Headers({
            Authorization: `Bearer ${token}`,
          }),
        })

        if (res.ok) {
          const blob = await res.blob()
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.setAttribute('download', filename)
          a.click()
        } else {
          const body = await res.json()
          app.$bvToast.toast(String(body.message), {
            title: i18n.tc('generation_fail'),
            variant: 'danger',
            solid: true,
            noAutoHide: true,
          })
        }
      } catch (e) {
        app.$bvToast.toast(String(e), {
          title: i18n.tc('generation_fail'),
          variant: 'danger',
          solid: true,
          noAutoHide: true,
        })
      } finally {
        // Don't know why it's needed there, but without it toast won't close.
        await waitTimeout(100)
        app.$bvToast.hide(id)
      }
    }
  } else if (link.type === 'toast') {
    const { message, title, variant, noAutoHide } = link
    const nextHandler = link.next ? linkHandler(link.next, params) : null
    handler = async () => {
      app.$bvToast.toast(app.$ustOrEmpty(message), {
        title: app.$ustOrEmpty(title),
        variant,
        solid: true,
        noAutoHide,
      })
      await nextHandler?.handler()
    }
  } else {
    throw new Error('Impossible')
  }
  return { handler, href, target, rel }
}

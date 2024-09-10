import {
  AnyServerMessage,
  CommonError,
  IChangeHeightRequestData,
  ICurrentValue,
  IReadyRequestData,
  IRequest,
  IUpdateValueRequestData,
  Response,
  apiVersion,
  Link,
  IGotoRequestData,
  IHrefLinkOpts,
  HrefTarget,
  RawLink,
  IIDTokenResponse,
  IIDTokenRequestData,
} from './types'
import { redirectClick } from './utils'

/*
 * Embedded API client.
 */

export class OzmaEmbeddedError extends Error {
  error: CommonError

  constructor(error: CommonError, message: string) {
    super(message)
    this.error = error
  }
}

export type ValueHandler = (newValue: ICurrentValue) => void

export class OzmaEmbeddedClient {
  private parent: Window
  private lastId = 0
  private initialized: Promise<void>
  private valueHandlers: ValueHandler[] = []
  private _currentValue: ICurrentValue | undefined
  private requests: Record<
    number,
    (response: Response<any, CommonError>) => void
  > = {}
  private needUpdateHeight = true
  private messageHandler = (msg: MessageEvent<AnyServerMessage>) =>
    this.handleMessage(msg)

  constructor() {
    if (window.parent === null) {
      throw new Error('Client is expected to be run in <iframe>')
    }

    this.parent = window.parent
    window.addEventListener('message', this.messageHandler)
    this.initialized = (async () => {
      const readyMessage: IReadyRequestData = {
        type: 'ready',
        version: apiVersion,
      }
      await this.sendRequest(readyMessage)
    })()
    void this.initialized.then(() => {
      if (this.needUpdateHeight) {
        return this.setHeight()
      }
      return undefined
    })
  }

  private async sendRequest<R extends { type: string }>(
    request: R,
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = this.lastId++
      const msg: IRequest<R> = {
        type: 'request',
        id,
        request,
      }
      this.requests[id] = (response: Response<unknown, CommonError>) => {
        if (response.status === 'ok') {
          resolve(response.result)
        } else {
          reject(new OzmaEmbeddedError(response.error, response.message))
        }
      }
      this.parent.postMessage(msg, '*')
    })
  }

  private handleMessage(event: MessageEvent<AnyServerMessage>) {
    if (event.source !== this.parent) return
    const msg = event.data

    if (msg.type === 'response') {
      const request = this.requests[msg.id as number]
      if (request === undefined) {
        throw new Error(
          `Response received for an unknown request, id ${msg.id}`,
        )
      }
      delete this.requests[msg.id as number]
      request(msg)
    } else if (msg.type === 'updateValue') {
      this._currentValue = msg.update
      for (const handler of this.valueHandlers) {
        try {
          handler(msg.update)
        } catch (e) {
          console.error(`Value handler failed with error: ${e}`)
        }
      }
    } else {
      throw new Error(`Unknown incoming message type: ${(msg as any).type}`)
    }
  }

  get currentValue() {
    return this._currentValue
  }

  addValueHandler(handler: ValueHandler) {
    this.valueHandlers.push(handler)
  }

  removeValueHandler(handler: ValueHandler) {
    const idx = this.valueHandlers.lastIndexOf(handler)
    if (idx >= 0) {
      this.valueHandlers.splice(idx, 1)
    }
  }

  async setHeight(height?: number) {
    this.needUpdateHeight = false
    await this.initialized
    const newHeight = height ?? document.body.clientHeight

    const heightMessage: IChangeHeightRequestData = {
      type: 'changeHeight',
      height: newHeight,
    }
    await this.sendRequest(heightMessage)
  }

  async updateValue(rawValue: unknown) {
    await this.initialized
    const updateMessage: IUpdateValueRequestData = {
      type: 'updateValue',
      rawValue,
    }
    await this.sendRequest(updateMessage)
  }

  async goto(link: Link) {
    await this.initialized
    const gotoMessage: IGotoRequestData = {
      type: 'goto',
      link,
    }
    await this.sendRequest(gotoMessage)
  }

  async getIdToken(): Promise<IIDTokenResponse> {
    const idTokenMessage: IIDTokenRequestData = {
      type: 'idToken',
    }
    const ret = await this.sendRequest(idTokenMessage)
    return ret as IIDTokenResponse
  }

  linkClick(event: MouseEvent, opts?: IHrefLinkOpts | RawLink): void {
    if (!redirectClick(event, true)) {
      return
    }

    // If a link is already given, follow it.
    let link: Link | undefined
    if (typeof opts === 'string') {
      link = {
        href: opts,
      }
    } else if (
      typeof opts === 'object' &&
      opts &&
      ('href' in opts || 'ref' in opts)
    ) {
      link = opts
    } else if (typeof opts === 'object' && opts && 'name' in opts) {
      link = {
        ref: {
          schema: opts.schema,
          name: opts.name,
        },
        args: opts.args,
        defaultValues: opts.defaultValues,
        new: opts.new,
        target: opts.target,
      }
    } else {
      // Try to autodetect the link.
      const aEl = (event.target as Element).closest('a[href]')
      if (aEl) {
        const href = aEl.getAttribute('href')!
        let target: HrefTarget | undefined
        const rawTarget = aEl.getAttribute('target')
        if (rawTarget === '_top') {
          target = 'top'
        } else if (rawTarget === '_blank') {
          target = 'blank'
        }
        link = {
          href,
          target,
        }
      }
    }
    if (!link) {
      console.error("Couldn't autodetect link to follow")
      return
    }

    event.stopPropagation()
    event.preventDefault()
    if (event.ctrlKey) {
      link = { ...link, target: 'blank' }
    }
    void this.goto(link)
  }
}

export default OzmaEmbeddedClient

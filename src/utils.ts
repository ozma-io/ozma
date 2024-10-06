// eslint-disable-next-line
import * as R from 'ramda'
import Vue, { RenderContext } from 'vue'
import sanitizeHtml from 'sanitize-html'
import { Link } from './links'

export type Result<A> = A | Error

export type RecordSet<K extends string | number | symbol> = Record<K, null>

export interface IRef<A> {
  ref?: A
}

export const resultMap = <A, B>(
  func: (_: A) => B,
  res: Result<A>,
): Result<B> => {
  if (res instanceof Error) {
    return res
  } else {
    return func(res)
  }
}

export const waitTimeout = (timeout?: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, timeout)
  })

export const waitForLoad = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const ref: IRef<() => void> = {}
    ref.ref = () => {
      removeEventListener('load', ref.ref!)
      resolve()
    }
    addEventListener('load', ref.ref)
  })

export const never: Promise<any> = new Promise((resolve) => {})

export const nextRender = (): Promise<void> =>
  new Promise((resolve) => {
    Vue.nextTick(() =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    )
  })

export const debounceTillAnimationFrame = (f: () => void): (() => void) => {
  let scheduled = false
  return () => {
    if (!scheduled) {
      scheduled = true
      requestAnimationFrame(() => {
        scheduled = false
        f()
      })
    }
  }
}

/* eslint-disable import/no-mutable-exports */
export declare let process: {
  env: Record<string, string>
}

/* eslint-enable import/no-mutable-exports */
export class FetchError extends Error {
  body: any
  response: Response

  constructor(rawBody: string, response: Response) {
    let body: any = rawBody
    const contentType = response.headers.get('Content-Type')
    if (contentType && contentType.startsWith('application/json')) {
      try {
        body = JSON.parse(rawBody)
      } catch (e) {
        // Leave it raw.
      }
    }
    const message =
      typeof body === 'object' && 'message' in body
        ? body.message
        : rawBody !== ''
          ? rawBody
          : response.statusText
    super(String(message))
    this.body = body
    this.response = response
  }
}

export class NetworkError extends Error {}

export const fetchSuccess = async (
  input: RequestInfo,
  init?: RequestInit,
): Promise<Response> => {
  let response
  try {
    response = await fetch(input, init)
  } catch (e) {
    throw new NetworkError(String(e))
  }
  if (!response.ok) {
    const rawBody = await response.text()
    throw new FetchError(rawBody, response)
  }
  return response
}

export const fetchJson = async (
  input: RequestInfo,
  init?: RequestInit,
): Promise<any> => {
  const response = await fetchSuccess(input, init)
  return response.json()
}

export const randomId = () => {
  return Math.random().toString(36).substring(2, 15)
}

export function isFirefox(): boolean {
  return navigator.userAgent.toLowerCase().includes('firefox')
}

export const sse = () => {
  return Math.floor(new Date().getTime() / 1000)
}

export const roundUp = (a: number, b: number) => {
  return Math.ceil(a / b) * b
}

export const deepFreeze = <T extends object>(o: T) => {
  Object.freeze(o)

  Object.getOwnPropertyNames(o).forEach((prop) => {
    const par = (o as any)[prop]
    if (
      par !== null &&
      (typeof par === 'object' || typeof par === 'function')
    ) {
      deepFreeze(par)
    }
  })

  return o
}

export const waitForElement = <T extends GlobalEventHandlers>(
  e: T,
): Promise<T> => {
  return new Promise((resolve, reject) => {
    e.onload = () => resolve(e)
    e.onerror = reject
  })
}

export const convertString = <T>(
  value: string,
  constructor: (_: string) => T,
  defValue: T,
): T => {
  if (value === '') {
    return defValue
  }

  if (constructor === (Number as any)) {
    const conv = Number(value)
    if (Number.isNaN(conv)) {
      return defValue
    } else {
      return conv as any
    }
  } else if (constructor === (String as any)) {
    return value as any
  } else if (constructor === (Boolean as any)) {
    const lowercasedValue = value.toLowerCase()
    return lowercasedValue === 'true'
      ? true
      : lowercasedValue === 'false'
        ? false
        : (defValue as any)
  } else {
    const conv = constructor(value)
    if (conv instanceof constructor) {
      return conv
    } else {
      return defValue
    }
  }
}

export const syncObject = (to: object, from: object) => {
  updateObject(to, from)
  Object.entries(to).forEach(([name, oldValue]) => {
    if (!(name in from)) {
      Vue.delete(to, name)
    }
  })
}

export const updateObject = (to: object, from: object) => {
  Object.entries(from).forEach(([name, newValue]) => {
    if (!(name in to) || (to as any)[name] !== newValue) {
      Vue.set(to, name, newValue)
    }
  })
}

export const deepSyncObject = (to: object | null, from: object | null) => {
  if (to === null || from === null) {
    throw new Error('deepSyncObject: expected two objects')
  }

  Object.entries(from).forEach(([name, newValue]: [string, unknown]) => {
    if (!(name in to)) {
      Vue.set(to, name, newValue)
    } else {
      const oldValue = (to as Record<string, unknown>)[name]
      // FIXME: if `newValue` is array with objects, then it wont work right, doesn't it?
      if (oldValue !== newValue) {
        if (
          typeof oldValue === 'object' &&
          oldValue !== null &&
          !Array.isArray(oldValue) &&
          typeof newValue === 'object' &&
          newValue !== null &&
          !Array.isArray(newValue)
        ) {
          deepSyncObject(oldValue, newValue)
        } else {
          Vue.set(to, name, newValue)
        }
      }
    }
  })
  Object.keys(to).forEach((name) => {
    if (!(name in from)) {
      Vue.delete(to, name)
    }
  })
}

export const tryDicts = <K extends string | number | symbol, V>(
  key: K,
  ...dicts: (Record<K, V> | undefined)[]
): V | undefined => {
  for (const dict of dicts) {
    if (dict && key in dict) {
      return dict[key]
    }
  }
  return undefined
}

export const hasUserPrototype = (a: object) => {
  return Object.getPrototypeOf(a) !== Object.prototype
}

// Works only on simple data
export const deepClone = <T>(a: T): T => {
  if (typeof a !== 'object' || a === null) {
    return a
  } else if (a instanceof Array) {
    return a.map(deepClone) as any
  } else if (!hasUserPrototype(a as unknown as object)) {
    const res: Record<string, any> = { ...a }
    /* eslint-disable guard-for-in */
    for (const k in res) {
      res[k] = deepClone(res[k])
    }
    /* eslint-enable guard-for-in */
    return res as any
  } else {
    throw new Error('Cannot deep clone an object')
  }
}

export const deepEquals = <T>(a: T, b: T): boolean => {
  if (typeof a !== typeof b) {
    return false
  } else if (typeof a !== 'object' || a === null || b === null) {
    return a === b
  } else if (a instanceof Array) {
    const bArr = b as any as any[]
    if (a.length !== bArr.length) {
      return false
    } else {
      return a.every((aVal, idx) => deepEquals(aVal, bArr[idx]))
    }
  } else if (
    !(
      hasUserPrototype(a as unknown as object) ||
      hasUserPrototype(b as unknown as object)
    )
  ) {
    const bObj = b as any as Record<string, any>
    return (
      Object.keys(bObj).every((k) => k in a) &&
      Object.entries(a).every(([k, v]) => k in bObj && deepEquals(v, bObj[k]))
    )
  } else {
    throw new Error('Cannot compare objects')
  }
}

export const mapMaybe = <A, B>(
  func: (arg: A, index: number, array: A[]) => B | undefined,
  arr: A[],
): B[] => {
  return arr.map(func).filter((val) => val !== undefined) as B[]
}

export const objectMap = <A, B>(
  fn: (value: A, key: string, index: number) => B,
  obj: Record<string, A>,
): Record<string, B> =>
  Object.fromEntries(Object.entries(obj).map(([k, v], i) => [k, fn(v, k, i)]))

// Like JSON.stringify but maintains order of keys in dictionaries.
export const valueSignature = <T>(a: T): string => {
  if (a === undefined) {
    return 'undefined'
  } else if (typeof a !== 'object' || a === null) {
    return JSON.stringify(a)
  } else if (a instanceof Array) {
    return '[' + a.map(valueSignature).join(',') + ']'
  } else if (!hasUserPrototype(a as unknown as object)) {
    return (
      '{' +
      Object.keys(a)
        .sort()
        .map((k) => JSON.stringify(k) + ':' + valueSignature((a as any)[k]))
        .join(',') +
      '}'
    )
  } else {
    throw new Error('Cannot make signatures for objects')
  }
}

// Object keys should be exactly typed, as per Flow exact object types. Otherwise signatures will be different.
export class ObjectMap<K, V> {
  private entriesMap: Partial<Record<string, [K, V]>> = {}

  insert(k: K, v: V) {
    const key = valueSignature(k)
    Vue.set(this.entriesMap, key, [k, v])
  }

  exists(k: K) {
    const key = valueSignature(k)
    return key in this.entriesMap
  }

  get(k: K) {
    const key = valueSignature(k)
    const value = this.entriesMap[key]
    return value !== undefined ? value[1] : undefined
  }

  apply(f: (_: V) => void, k: K) {
    const key = valueSignature(k)
    const value = this.entriesMap[key]
    if (value === undefined) {
      throw new Error('Key is not in map')
    }
    f(value[1])
  }

  update(f: (_: V) => V, k: K) {
    const key = valueSignature(k)
    const value = this.entriesMap[key]
    if (value === undefined) {
      throw new Error('Key is not in map')
    }
    value[1] = f(value[1])
  }

  entries() {
    return Object.values(this.entriesMap) as [K, V][]
  }

  keys() {
    return this.entries().map(([k, v]) => k)
  }

  values() {
    return this.entries().map(([k, v]) => v)
  }

  get length() {
    return Object.keys(this.entriesMap).length
  }

  delete(k: K) {
    const key = valueSignature(k)
    Vue.delete(this.entriesMap, key)
  }
}

export class ObjectSet<K> {
  private entriesMap: Record<string, K> = {}

  insert(k: K) {
    const key = valueSignature(k)
    Vue.set(this.entriesMap, key, k)
  }

  exists(k: K) {
    const key = valueSignature(k)
    return key in this.entriesMap
  }

  keys() {
    return Object.values(this.entriesMap)
  }

  get length() {
    return Object.keys(this.entriesMap).length
  }

  delete(k: K) {
    const key = valueSignature(k)
    Vue.delete(this.entriesMap, key)
  }
}

const convertDebugArgs = <H, T extends any[]>(
  message?: H,
  ...optionalParams: T
) => {
  return [message, ...optionalParams].map((arg) => {
    if (arg === undefined) {
      return arg
    }

    try {
      return JSON.parse(JSON.stringify(arg))
    } catch (e) {
      console.error('Error during convertDebugArgs', e)
      return arg
    }
  })
}

// Useful for outputting Vue.js values - this trims all properties.
export const debugLog = <H, T extends any[]>(
  message?: H,
  ...optionalParams: T
) => {
  const args = convertDebugArgs(message, ...optionalParams)
  // eslint-disable-next-line no-console, @typescript-eslint/no-unsafe-argument
  console.log(...args)
}

export const debugLogTrace = <H, T extends any[]>(
  message?: H,
  ...optionalParams: T
) => {
  const args = convertDebugArgs(message, ...optionalParams)
  // eslint-disable-next-line no-console, @typescript-eslint/no-unsafe-argument
  console.trace(...args)
}

export const vueEmit = <T extends unknown[]>(
  context: RenderContext,
  name: string,
  ...args: T
) => {
  const listener = context.listeners[name]
  if (listener instanceof Array) {
    listener.forEach((handler) => handler(...args))
  } else if (listener instanceof Function) {
    listener(...args)
  }
}

export type ReferenceName = string

export interface IResource<M, T> {
  value: T
  refs: Record<ReferenceName, M>
}

// Implements a map with named references which supports removing unreferenced entries.
export class ResourceMap<V, M = undefined> {
  private resourcesMap: Partial<Record<string, IResource<M, V>>> = {}

  createResource(key: string, reference: ReferenceName, value: V, meta: M) {
    if (key in this.resourcesMap) {
      throw new Error('Resource is already allocated')
    }
    const resource: IResource<M, V> = {
      value,
      refs: { [reference]: meta },
    }
    Vue.set(this.resourcesMap, key, resource)
  }

  refreshResource(key: string, value: V) {
    const resource = this.resourcesMap[key]
    if (resource === undefined) {
      throw new Error("Resource doesn't exist")
    }
    resource.value = value
  }

  addReference(key: string, name: ReferenceName, meta: M) {
    const resource = this.resourcesMap[key]
    if (resource === undefined) {
      throw new Error("Resource doesn't exist")
    }
    Vue.set(resource.refs, name, meta)
  }

  removeReference(key: string, name: ReferenceName) {
    const resource = this.resourcesMap[key]
    if (resource !== undefined) {
      Vue.delete(resource.refs, name)

      if (Object.keys(resource.refs).length === 0) {
        Vue.delete(this.resourcesMap, key)
      }

      return true
    } else {
      return false
    }
  }

  getResource(key: string): IResource<M, V> | undefined {
    return this.resourcesMap[key]
  }

  exists(key: string) {
    return key in this.resourcesMap
  }

  get(key: string) {
    return this.resourcesMap[key]?.value
  }

  apply(f: (_: V) => void, key: string) {
    const resource = this.resourcesMap[key]
    if (resource === undefined) {
      throw new Error("Resource doesn't exist")
    }
    f(resource.value)
  }

  update(f: (_: V) => V, key: string) {
    const resource = this.resourcesMap[key]
    if (resource === undefined) {
      throw new Error("Resource doesn't exist")
    }
    resource.value = f(resource.value)
  }

  forceDelete(key: string) {
    Vue.delete(this.resourcesMap, key)
  }

  keys() {
    return Object.keys(this.resourcesMap)
  }

  resources() {
    return Object.values(this.resourcesMap)
  }

  values() {
    return Object.values(this.resourcesMap).map((res) => res!.value)
  }

  entries() {
    return Object.entries(this.resourcesMap).map(([name, res]) => [
      name,
      res!.value,
    ])
  }
}

// Concerns described for ObjectMap apply.
export class ObjectResourceMap<K, V, M = undefined> {
  private internal = new ResourceMap<[K, V], M>()

  createResource(key: K, reference: ReferenceName, value: V, meta: M) {
    this.internal.createResource(
      valueSignature(key),
      reference,
      [key, value],
      meta,
    )
  }

  updateResource(key: K, value: V) {
    this.internal.refreshResource(valueSignature(key), [key, value])
  }

  addReference(key: K, name: ReferenceName, meta: M) {
    this.internal.addReference(valueSignature(key), name, meta)
  }

  removeReference(key: K, name: ReferenceName) {
    return this.internal.removeReference(valueSignature(key), name)
  }

  getResource(key: K): IResource<M, V> | undefined {
    const ret = this.internal.getResource(valueSignature(key))
    return ret !== undefined
      ? { value: ret.value[1], refs: ret.refs }
      : undefined
  }

  exists(key: K): boolean {
    return this.existsBySignature(valueSignature(key))
  }

  get(key: K): V | undefined {
    return this.getBySignature(valueSignature(key))
  }

  update(f: (_: V) => V, key: K) {
    this.updateBySignature(f, valueSignature(key))
  }

  apply(f: (_: V) => void, key: K) {
    this.applyBySignature(f, valueSignature(key))
  }

  forceDelete(key: K) {
    this.forceDeleteBySignature(valueSignature(key))
  }

  existsBySignature(signature: string): boolean {
    return this.internal.exists(signature)
  }

  getBySignature(signature: string): V | undefined {
    const ret = this.internal.get(signature)
    return ret !== undefined ? ret[1] : undefined
  }

  updateBySignature(f: (_: V) => V, signature: string) {
    this.internal.apply((ret) => {
      ret[1] = f(ret[1])
    }, signature)
  }

  applyBySignature(f: (_: V) => void, signature: string) {
    this.internal.apply((ret) => {
      f(ret[1])
    }, signature)
  }

  forceDeleteBySignature(signature: string) {
    this.internal.forceDelete(signature)
  }

  resources() {
    return this.internal.resources()
  }

  keys(): K[] {
    return this.internal.values().map((x) => x[0])
  }

  values(): V[] {
    return this.internal.values().map((x) => x[1])
  }

  entries(): [K, V][] {
    return this.internal.values()
  }
}

export const isIOS =
  navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform)
export const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  )

export const capitalize = (value: string): string => {
  return value.substring(0, 1).toUpperCase() + value.substring(1)
}

let maybeCanvas: HTMLCanvasElement | undefined

export const getTextWidth = (text: string, font: string): number => {
  // re-use canvas object for better performance
  if (!maybeCanvas) {
    maybeCanvas = document.createElement('canvas')
  }
  const context = maybeCanvas.getContext('2d')
  if (!context) {
    throw new Error('Failed to create canvas context')
  }
  context.font = font
  const metrics = context.measureText(text)
  return metrics.width
}

export const pascalToSnake = (str: string) => {
  return str
    .split(/(?=[A-Z])/)
    .join('_')
    .toLowerCase()
}

export const snakeToPascal = (str: string) => {
  return str
    .split('_')
    .map((x) => {
      const c = x.charAt(0)
      return c.toUpperCase() + x.slice(c.length)
    })
    .join('')
}

type Endianness = 'le' | 'be'

let maybeEndianness: Endianness | undefined

export const getEndianness = (): Endianness => {
  if (maybeEndianness) {
    return maybeEndianness
  } else {
    const arrayBuffer = new ArrayBuffer(2)
    const uint8Array = new Uint8Array(arrayBuffer)
    const uint16array = new Uint16Array(arrayBuffer)
    uint8Array[0] = 0x01
    uint8Array[1] = 0x02
    if (uint16array[0] === 0x0201) {
      maybeEndianness = 'le'
    } else if (uint16array[0] === 0x0102) {
      maybeEndianness = 'be'
    } else {
      throw new Error('Something crazy just happened')
    }
    return maybeEndianness
  }
}

export const getBOM = (endianness: Endianness): ArrayBuffer => {
  const buf = new ArrayBuffer(2)
  const view = new Uint8Array(buf)
  if (endianness === 'le') {
    view[0] = 0xff
    view[1] = 0xfe
  } else {
    view[0] = 0xfe
    view[1] = 0xff
  }
  return buf
}

export const getUTF8BOM = (): ArrayBuffer => {
  const buf = new ArrayBuffer(3)
  const view = new Uint8Array(buf)
  view[0] = 0xef
  view[1] = 0xbb
  view[2] = 0xbf
  return buf
}

// Encodes in platform-native endianness.
export const encodeUTF16 = (str: string): Uint16Array => {
  const buf = new ArrayBuffer(2 * str.length)
  const view = new Uint16Array(buf)
  for (let i = 0; i < str.length; i++) {
    view[i] = str.charCodeAt(i)
  }
  return view
}

export const encodeUTF16LE = (str: string): Uint16Array => {
  const ret = encodeUTF16(str)
  if (getEndianness() === 'be') {
    swapUint16Endianness(ret)
  }
  return ret
}

export const encodeUTF16BE = (str: string): Uint16Array => {
  const ret = encodeUTF16(str)
  if (getEndianness() === 'le') {
    swapUint16Endianness(ret)
  }
  return ret
}

export const swapUint16Endianness = (view: Uint16Array) => {
  for (let i = 0; i < view.length; i++) {
    const word = view[i]
    view[i] = (word >> 8) | (word << 8)
  }
}

export const saveToFile = (
  name: string,
  data: BlobPart[],
  options?: BlobPropertyBag,
) => {
  const element = document.createElement('a')
  const blob = new Blob(data, options)
  const url = URL.createObjectURL(blob)
  element.setAttribute('href', url)
  element.setAttribute('download', name)
  element.style.display = 'none'

  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
}

const makeWordsRegex = () => {
  // Match words that doesn't start with quotes
  const wordRegex = `([^"'«„”\\s][^\\s]*)`
  const quotes = [
    [`"`, `"`],
    [`'`, `'`],
    [`«`, `»`],
    [`„`, `“`],
    [`”`, `”`],
  ]
  // Match fully-quoted words: e.g. `"foo bar"` will match but `"foo"b` or `"foo ` will not.
  const quoteRegexes = quotes.map(
    ([start, end]) => `${start}([^${end}]+)${end}(?:\\s|$)`,
  )
  // Match any word
  const fallbackRegex = `([^\\s]+)`
  const regexes = [wordRegex].concat(quoteRegexes).concat([fallbackRegex])
  const regexesStr = regexes.map((reg) => `(?:${reg})`).join('|')
  const fullRegex = `^\\s*(?:${regexesStr})`
  return fullRegex
}
const wordsRegexString = makeWordsRegex()

export const convertToWords = (str: string) => {
  const regex = new RegExp(wordsRegexString, 'g')
  const words: string[] = []
  while (true) {
    const ret = regex.exec(str)
    if (ret === null) {
      break
    } else {
      const word = ret.slice(1).find((x) => x !== undefined) as string
      words.push(word.toLowerCase())
    }
  }
  return words
}

// In all regexes capturing groups replaced to non-capturing (`(` -> `(?:`).
// Source: https://emailregex.com/
const emailRegex =
  /(?:(?:[^<>(?:)[\]\\.,;:\s@"]+(?:\.[^<>(?:)[\]\\.,;:\s@"]+)*)|(?:".+"))@(?:(?:\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(?:(?:[a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/
// const emailRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
// const emailRegex = /[^\s@,.]+@[^\s@,.]+\.[^\s@,.]+/;
// Source: https://qna.habr.com/answer?answer_id=852265
const telRegex = /\+(?:[- _(?:):=+]?\d[- _(?:):=+]?){10,14}/
const telRemoveFormating = (tel: string) => '+' + tel.replace(/\D/g, '')
// Source: https://stackoverflow.com/a/3809435
const urlRegex =
  /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9(?:)]{1,6}\b(?:[-a-zA-Z0-9(?:)@:%_+.~#?&//=]*)/
const linksRegex = new RegExp(
  `\
(?:(${emailRegex.source})|(${telRegex.source})|(${urlRegex.source}))\
`,
  'gm',
)
// Regexp above was wrapped in this two parts, but I dont remember why and it works better without, but I would like to keep these lines here for now.
// (?:^|\\s|,)\
// (?:$|\\s|,|\\.|;)
const replaceLink = (
  match: string,
  email: string,
  tel: string,
  url: string,
) => {
  const prefix = email ? 'mailto:' : tel ? 'tel:' : ''
  const formattedMatch = tel ? telRemoveFormating(match) : match
  return `${match} <b><a \
target="_blank" rel="noopener noreferrer" \
href="${prefix}${formattedMatch}">^</a></b>`
}
export const replaceHtmlLinksWithInfo = (
  text: string,
): { result: string; hasLinks: boolean } => {
  const sanitized = sanitizeHtml(text, {
    allowedTags: [],
    disallowedTagsMode: 'escape',
  })
  const result = sanitized.replace(linksRegex, replaceLink)
  const hasLinks = sanitized.match(linksRegex) !== null
  return { result, hasLinks }
}
export const replaceHtmlLinks = (text: string): string => {
  return replaceHtmlLinksWithInfo(text).result
}

export type TextLinkType = 'url' | 'tel' | 'email'
export type TextLink = { type: TextLinkType; href: string }
export const findLink = (text: string): TextLink | null => {
  const urlMatch = urlRegex.exec(text)
  if (urlMatch) {
    return {
      type: 'url',
      href: urlMatch[0],
    }
  }

  const telMatch = telRegex.exec(text)
  if (telMatch) {
    return {
      type: 'tel',
      href: 'tel:' + telMatch[0],
    }
  }

  const emailMatch = emailRegex.exec(text)
  if (emailMatch) {
    return {
      type: 'email',
      href: 'mailto:' + emailMatch[0],
    }
  }

  return null
}

const asciiRegex = /[\p{ASCII}]+/u
export const isAscii = (str: string): boolean => asciiRegex.test(str)

export type IconType = 'material' | 'emoji' | null
export const getIconType = (str: string | null | undefined): IconType => {
  if (!str) return null
  return isAscii(str) ? 'material' : 'emoji'
}

export const bootstrapVariants = [
  'primary',
  'secondary',
  'success',
  'danger',
  'warning',
  'info',
  'light',
  'dark',
] as const
export type BootstrapVariant = (typeof bootstrapVariants)[number]

export type ClipboardParseValue =
  | {
      type: 'reference'
      value: number | null
      pun: string
    }
  | {
      type: 'value'
      value: string
    }

export type ClipboardParseResult =
  | {
      type: 'values'
      values: ClipboardParseValue[][]
    }
  | {
      type: 'error'
    }

const htmlElementToParseValue = (el: HTMLElement): ClipboardParseValue => {
  const referenceValue = el.attributes.getNamedItem(
    'data-ozma-reference-value',
  )?.value
  if (referenceValue !== undefined) {
    const value = JSON.parse(referenceValue) as number | null
    const pun = el.innerText
    return { type: 'reference', value, pun }
  } else {
    const value = el.innerText
    return { type: 'value', value }
  }
}

export const parseFromClipboard = (
  event: ClipboardEvent,
): ClipboardParseResult => {
  const serialized = event.clipboardData?.getData('text/html')
  if (serialized === undefined) return { type: 'error' }

  const parsed = new DOMParser().parseFromString(serialized, 'text/html')
  if (parsed.documentElement.nodeName !== 'parsererror') {
    const table = parsed.documentElement.querySelector('table')
    if (!table) return { type: 'error' }

    const values = Array.from(table.rows).map((row) =>
      Array.from(row.cells).map(htmlElementToParseValue),
    )
    return { type: 'values', values }
  }

  const sourcePlain = event.clipboardData?.getData('text/plain')
  if (sourcePlain === undefined) {
    return { type: 'error' }
  }

  return { type: 'values', values: [[{ type: 'value', value: sourcePlain }]] }
}

const validNumberFormats = {
  auto: null,
  ru: null,
  en: null,
}

export type ValidNumberFormat = keyof typeof validNumberFormats

export const isValidNumberFormat = (
  name: string,
): name is ValidNumberFormat => {
  return name in validNumberFormats
}

const makeMemoKey = (lang: ValidNumberFormat, fractionDigits?: number) =>
  lang + String(fractionDigits)
export const getNumberFormatter = R.memoizeWith(
  makeMemoKey,
  (lang: ValidNumberFormat, fractionDigits?: number) => {
    const locale = lang === 'auto' ? undefined : lang
    const options =
      fractionDigits === undefined
        ? undefined
        : {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits,
          }
    return Intl.NumberFormat(locale, options)
  },
)

export const csvCell = (str: string): string => {
  return `"${str.replace(/"/g, `""`)}"`
}

export const csvSeparator = '\t'

export const csvStringify = (table: string[][]): string => {
  let output = ''

  table.forEach((row) => {
    row.forEach((cell, colI) => {
      output += csvCell(cell)
      if (colI < row.length - 1) {
        output += csvSeparator
      }
    })
    output += '\n'
  })

  return output
}

export const homeLink: Link = {
  type: 'query',
  target: 'top',
  query: {
    args: {
      source: {
        type: 'named',
        ref: {
          schema: 'user',
          name: 'main',
        },
      },
      args: {},
    },
    defaultValues: {},
    search: '',
    page: null,
  },
}

export class NeverError extends Error {
  constructor(value: never) {
    super(`Unreachable statement: ${value}`)
  }
}

export const safeJsonParse = (str: unknown): unknown | undefined => {
  if (typeof str !== 'string') {
    return undefined
  }

  try {
    return JSON.parse(str)
  } catch (e) {
    return undefined
  }
}

// https://stackoverflow.com/a/33456469
export const elementIsVisible = (e: HTMLElement) => {
  return Boolean(e.offsetWidth || e.offsetHeight || e.getClientRects().length)
}

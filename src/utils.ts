// eslint-disable-next-line
import * as R from "ramda";
import moment from "moment";
import Vue, { RenderContext } from "vue";
import sanitizeHtml from "sanitize-html";
import { Link } from "./links";

export type Result<A> = A | Error;

export type RecordSet<K extends string | number | symbol> = Record<K, null>;

export interface IRef<A> {
  ref?: A;
}

export const resultMap = <A, B>(func: ((_: A) => B), res: Result<A>): Result<B> => {
  if (res instanceof Error) {
    return res;
  } else {
    return func(res);
  }
};

export const waitTimeout = (timeout?: number): Promise<void> => new Promise(resolve => setTimeout(resolve, timeout));

export const waitForLoad = (): Promise<void> => new Promise((resolve, reject) => {
  const ref: IRef<() => void> = {};
  ref.ref = () => {
    removeEventListener("load", ref.ref!);
    resolve();
  };
  addEventListener("load", ref.ref);
});

export const nextRender = (): Promise<void> => new Promise(resolve =>
  Vue.nextTick(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

/* eslint-disable import/no-mutable-exports */
export declare let process: {
  env: Record<string, string>;
};

/* eslint-enable import/no-mutable-exports */
export class FetchError extends Error {
  body: any;
  response: Response;

  constructor(rawBody: string, response: Response) {
    let body: any = rawBody;
    const contentType = response.headers.get("Content-Type");
    if (contentType && contentType.startsWith("application/json")) {
      try {
        body = JSON.parse(rawBody);
      } catch (e) {
        // Leave it raw.
      }
    }
    const message = typeof body === "object" && "message" in body ? body.message : (rawBody !== "" ? rawBody : response.statusText);
    super(String(message));
    this.body = body;
    this.response = response;
  }
}

export const fetchSuccess = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
  const response = await fetch(input, init);
  if (!response.ok) {
    const rawBody = await response.text();
    throw new FetchError(rawBody, response);
  }
  return response;
};

export const fetchJson = async (input: RequestInfo, init?: RequestInit): Promise<any> => {
  const response = await fetchSuccess(input, init);
  return response.json();
};

export const randomId = () => {
  return Math.random().toString(36).substring(2, 15);
};

export const language = navigator.languages[0];
export const shortLanguage = language.split("-")[0];

export function isFirefox(): boolean {
  return navigator.userAgent.toLowerCase().includes("firefox");
}

export const momentLocale = (async () => {
  if (shortLanguage !== "en") {
    await import(`moment/locale/${shortLanguage}.js`);
  }
  moment.locale(shortLanguage);
})();

export const sse = () => {
  return Math.floor((new Date()).getTime() / 1000);
};

export const roundUp = (a: number, b: number) => {
  return Math.ceil(a / b) * b;
};

export const deepFreeze = <T extends object>(o: T) => {
  Object.freeze(o);

  Object.getOwnPropertyNames(o).forEach(prop => {
    const par = (o as any)[prop];
    if (par !== null
        && (typeof par === "object" || typeof par === "function")) {
      deepFreeze(par);
    }
  });

  return o;
};

export const waitForElement = <T extends GlobalEventHandlers>(e: T): Promise<T> => {
  return new Promise((resolve, reject) => {
    e.onload = () => resolve(e);
    e.onerror = reject;
  });
};

export const convertString = <T>(value: string, constructor: (_: string) => T, defValue: T): T => {
  if (value === "") {
    return defValue;
  }

  if (constructor === Number as any) {
    const conv = Number(value);
    if (Number.isNaN(conv)) {
      return defValue;
    } else {
      return conv as any;
    }
  } else if (constructor === String as any) {
    return value as any;
  } else if (constructor === Boolean as any) {
    const lowercasedValue = value.toLowerCase();
    return lowercasedValue === "true" ? true
      : lowercasedValue === "false" ? false
        : defValue as any;
  } else {
    const conv = constructor(value);
    if (conv instanceof constructor) {
      return conv;
    } else {
      return defValue;
    }
  }
};

export const syncObject = (to: object, from: object) => {
  updateObject(to, from);
  Object.entries(to).forEach(([name, oldValue]) => {
    if (!(name in from)) {
      Vue.delete(to, name);
    }
  });
};

export const updateObject = (to: object, from: object) => {
  Object.entries(from).forEach(([name, newValue]) => {
    if (!(name in to) || (to as any)[name] !== newValue) {
      Vue.set(to, name, newValue);
    }
  });
};

export const deepSyncObject = (to: object | null, from: object | null) => {
  if (to === null || from === null) {
    throw new Error("deepSyncObject: expected two objects");
  }

  Object.entries(from).forEach(([name, newValue]) => {
    if (!(name in to)) {
      Vue.set(to, name, newValue);
    } else {
      const oldValue = (to as any)[name];
      if (oldValue !== newValue) {
        if (typeof oldValue === "object" && oldValue !== null && typeof newValue === "object" && newValue !== null) {
          deepSyncObject(oldValue, newValue);
        } else {
          Vue.set(to, name, newValue);
        }
      }
    }
  });
  Object.keys(to).forEach(name => {
    if (!(name in from)) {
      Vue.delete(to, name);
    }
  });
};

export const tryDicts = <K extends string | number | symbol, V>(key: K, ...dicts: (Record<K, V> | undefined)[]): V | undefined => {
  for (const dict of dicts) {
    if (dict && key in dict) {
      return dict[key];
    }
  }
  return undefined;
};

export const hasUserPrototype = (a: object) => {
  return Object.getPrototypeOf(a) !== Object.prototype;
};

// Works only on simple data
export const deepClone = <T>(a: T): T => {
  if (typeof a !== "object" || a === null) {
    return a;
  } else if (a instanceof Array) {
    return a.map(deepClone) as any;
  } else if (!hasUserPrototype(a as any)) {
    const res: Record<string, any> = { ...a };
    /* eslint-disable guard-for-in */
    for (const k in res) {
      res[k] = deepClone(res[k]);
    }
    /* eslint-enable guard-for-in */
    return res as any;
  } else {
    throw new Error("Cannot deep clone an object");
  }
};

export const deepEquals = <T>(a: T, b: T): boolean => {
  if (typeof a !== typeof b) {
    return false;
  } else if (typeof a !== "object" || a === null || b === null) {
    return a === b;
  } else if (a instanceof Array) {
    const bArr = b as any as any[];
    if (a.length !== bArr.length) {
      return false;
    } else {
      return a.every((aVal, idx) => deepEquals(aVal, bArr[idx]));
    }
  } else if (!(hasUserPrototype(a as any) || hasUserPrototype(b as any))) {
    const bObj = b as any as Record<string, any>;
    return Object.keys(b).every(k => k in a)
        && Object.entries(a).every(([k, v]) => k in b && deepEquals(v, bObj[k]));
  } else {
    throw new Error("Cannot compare objects");
  }
};

export const mapMaybe = <A, B>(func: (arg: A, index: number, array: A[]) => B | undefined, arr: A[]): B[] => {
  return arr.map(func).filter(val => val !== undefined) as B[];
};

export const objectMap = <A, B>(fn: (value: A, key: string, index: number) => B, obj: Record<string, A>): Record<string, B> =>
  Object.fromEntries(
    Object.entries(obj).map(
      ([k, v], i) => [k, fn(v, k, i)],
    ),
  );

// Like JSON.stringify but maintains order of keys in dictionaries.
export const valueSignature = <T>(a: T): string => {
  if (a === undefined) {
    return "undefined";
  } else if (typeof a !== "object" || a === null) {
    return JSON.stringify(a);
  } else if (a instanceof Array) {
    return "[" + a.map(valueSignature).join(",") + "]";
  } else if (!hasUserPrototype(a as any)) {
    return "{" + Object.keys(a).sort().map(k => JSON.stringify(k) + ":" + valueSignature((a as any)[k])).join(",") + "}";
  } else {
    throw new Error("Cannot make signatures for objects");
  }
};

// Object keys should be exactly typed, as per Flow exact object types. Otherwise signatures will be different.
export class ObjectMap<K, V> {
  private entriesMap: Partial<Record<string, [K, V]>> = {};

  insert(k: K, v: V) {
    const key = valueSignature(k);
    Vue.set(this.entriesMap, key, [k, v]);
  }

  exists(k: K) {
    const key = valueSignature(k);
    return key in this.entriesMap;
  }

  get(k: K) {
    const key = valueSignature(k);
    const value = this.entriesMap[key];
    return value !== undefined ? value[1] : undefined;
  }

  apply(f: (_: V) => void, k: K) {
    const key = valueSignature(k);
    const value = this.entriesMap[key];
    if (value === undefined) {
      throw new Error("Key is not in map");
    }
    f(value[1]);
  }

  update(f: (_: V) => V, k: K) {
    const key = valueSignature(k);
    const value = this.entriesMap[key];
    if (value === undefined) {
      throw new Error("Key is not in map");
    }
    value[1] = f(value[1]);
  }

  entries() {
    return Object.values(this.entriesMap) as [K, V][];
  }

  keys() {
    return this.entries().map(([k, v]) => k);
  }

  values() {
    return this.entries().map(([k, v]) => v);
  }

  get length() {
    return Object.keys(this.entriesMap).length;
  }

  delete(k: K) {
    const key = valueSignature(k);
    Vue.delete(this.entriesMap, key);
  }
}

export class ObjectSet<K> {
  private entriesMap: Record<string, K> = {};

  insert(k: K) {
    const key = valueSignature(k);
    Vue.set(this.entriesMap, key, k);
  }

  exists(k: K) {
    const key = valueSignature(k);
    return key in this.entriesMap;
  }

  keys() {
    return Object.values(this.entriesMap);
  }

  get length() {
    return Object.keys(this.entriesMap).length;
  }

  delete(k: K) {
    const key = valueSignature(k);
    Vue.delete(this.entriesMap, key);
  }
}

const convertDebugArgs = (message?: any, ...optionalParams: any[]) => {
  return [message, ...optionalParams].map(arg => {
    if (arg === undefined) {
      return arg;
    }

    try {
      return JSON.parse(JSON.stringify(arg));
    } catch (e) {
      console.error("Error during convertDebugArgs", e);
      return arg;
    }
  });
};

// Useful for outputting Vue.js values - this trims all properties.
export const debugLog = (message?: any, ...optionalParams: any[]) => {
  const args = convertDebugArgs(message, ...optionalParams);
  console.log(...args); // eslint-disable-line
};

export const debugLogTrace = (message?: any, ...optionalParams: any[]) => {
  const args = convertDebugArgs(message, ...optionalParams);
  console.trace(...args);
};

/* tslint:disable:ban-types */
export const vueEmit = (context: RenderContext, name: string, ...args: any[]) => {
  const listener = context.listeners[name];
  if (listener instanceof Array) {
    listener.forEach(handler => handler(...args));
  } else if (listener instanceof Function) {
    listener(...args);
  }
};

export type ReferenceName = string;

export interface IResource<M, T> {
  value: T;
  refs: Record<ReferenceName, M>;
}

// Implements a map with named references which supports removing unreferenced entries.
export class ResourceMap<V, M=undefined> {
  private resourcesMap: Partial<Record<string, IResource<M, V>>> = {};

  createResource(key: string, reference: ReferenceName, value: V, meta: M) {
    if (key in this.resourcesMap) {
      throw new Error("Resource is already allocated");
    }
    const resource: IResource<M, V> = {
      value,
      refs: { [reference]: meta },
    };
    Vue.set(this.resourcesMap, key, resource);
  }

  refreshResource(key: string, value: V) {
    const resource = this.resourcesMap[key];
    if (resource === undefined) {
      throw new Error("Resource doesn't exist");
    }
    resource.value = value;
  }

  addReference(key: string, name: ReferenceName, meta: M) {
    const resource = this.resourcesMap[key];
    if (resource === undefined) {
      throw new Error("Resource doesn't exist");
    }
    Vue.set(resource.refs, name, meta);
  }

  removeReference(key: string, name: ReferenceName) {
    const resource = this.resourcesMap[key];
    if (resource !== undefined) {
      Vue.delete(resource.refs, name);

      if (Object.keys(resource.refs).length === 0) {
        Vue.delete(this.resourcesMap, key);
      }

      return true;
    } else {
      return false;
    }
  }

  getResource(key: string): IResource<M, V> | undefined {
    return this.resourcesMap[key];
  }

  exists(key: string) {
    return key in this.resourcesMap;
  }

  get(key: string) {
    return this.resourcesMap[key]?.value;
  }

  apply(f: (_: V) => void, key: string) {
    const resource = this.resourcesMap[key];
    if (resource === undefined) {
      throw new Error("Resource doesn't exist");
    }
    f(resource.value);
  }

  update(f: (_: V) => V, key: string) {
    const resource = this.resourcesMap[key];
    if (resource === undefined) {
      throw new Error("Resource doesn't exist");
    }
    resource.value = f(resource.value);
  }

  forceDelete(key: string) {
    Vue.delete(this.resourcesMap, key);
  }

  keys() {
    return Object.keys(this.resourcesMap);
  }

  resources() {
    return Object.values(this.resourcesMap);
  }

  values() {
    return Object.values(this.resourcesMap).map(res => res!.value);
  }

  entries() {
    return Object.entries(this.resourcesMap).map(([name, res]) => [name, res!.value]);
  }
}

// Concerns described for ObjectMap apply.
export class ObjectResourceMap<K, V, M=undefined> {
  private internal = new ResourceMap<[K, V], M>();

  createResource(key: K, reference: ReferenceName, value: V, meta: M) {
    this.internal.createResource(valueSignature(key), reference, [key, value], meta);
  }

  updateResource(key: K, value: V) {
    this.internal.refreshResource(valueSignature(key), [key, value]);
  }

  addReference(key: K, name: ReferenceName, meta: M) {
    this.internal.addReference(valueSignature(key), name, meta);
  }

  removeReference(key: K, name: ReferenceName) {
    return this.internal.removeReference(valueSignature(key), name);
  }

  getResource(key: K): IResource<M, V> | undefined {
    const ret = this.internal.getResource(valueSignature(key));
    return ret !== undefined ? { value: ret.value[1], refs: ret.refs } : undefined;
  }

  exists(key: K): boolean {
    return this.existsBySignature(valueSignature(key));
  }

  get(key: K): V | undefined {
    return this.getBySignature(valueSignature(key));
  }

  update(f: (_: V) => V, key: K) {
    this.updateBySignature(f, valueSignature(key));
  }

  apply(f: (_: V) => void, key: K) {
    this.applyBySignature(f, valueSignature(key));
  }

  forceDelete(key: K) {
    this.forceDeleteBySignature(valueSignature(key));
  }

  existsBySignature(signature: string): boolean {
    return this.internal.exists(signature);
  }

  getBySignature(signature: string): V | undefined {
    const ret = this.internal.get(signature);
    return ret !== undefined ? ret[1] : undefined;
  }

  updateBySignature(f: (_: V) => V, signature: string) {
    this.internal.apply(ret => {
      ret[1] = f(ret[1]);
    }, signature);
  }

  applyBySignature(f: (_: V) => void, signature: string) {
    this.internal.apply(ret => {
      f(ret[1]);
    }, signature);
  }

  forceDeleteBySignature(signature: string) {
    this.internal.forceDelete(signature);
  }

  resources() {
    return this.internal.resources();
  }

  keys(): K[] {
    return this.internal.values().map(x => x[0]);
  }

  values(): V[] {
    return this.internal.values().map(x => x[1]);
  }

  entries(): [K, V][] {
    return this.internal.values();
  }
}

export const isIOS = navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);
export const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

export const capitalize = (value: string): string => {
  return value.substring(0, 1).toUpperCase() + value.substring(1);
};

export const getTextWidth = (text: string, font: string): number => {
  // re-use canvas object for better performance
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (context) {
    context.font = font;
    const metrics = context.measureText(text);
    return metrics.width;
  }
  return 0;
};

export const pascalToSnake = (str: string) => {
  return str.split(/(?=[A-Z])/).join("_").toLowerCase();
};

export const snakeToPascal = (str: string) => {
  return str.split("_").map(x => {
    const c = x.charAt(0);
    return c.toUpperCase() + x.slice(c.length);
  }).join("");
};

export const saveToFile = (name: string, mime: string, data: string) => {
  const element = document.createElement("a");
  element.setAttribute("href", `data:${mime};charset=utf-8,` + encodeURIComponent("\uFEFF" + data));
  element.setAttribute("download", name);
  element.style.display = "none";

  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

export const gotoHref = (href: string): Promise<void> => {
  window.location.href = href;
  return waitForLoad();
};

const makeWordsRegex = () => {
  // Match words that doesn't start with quotes
  const wordRegex = `([^"'«„”\\s][^\\s]*)`;
  const quotes = [
    [`"`, `"`],
    [`'`, `'`],
    [`«`, `»`],
    [`„`, `“`],
    [`”`, `”`],
  ];
  // Match fully-quoted words: e.g. `"foo bar"` will match but `"foo"b` or `"foo ` will not.
  const quoteRegexes = quotes.map(([start, end]) => `${start}([^${end}]+)${end}(?:\\s|$)`);
  // Match any word
  const fallbackRegex = `([^\\s]+)`;
  const regexes = [wordRegex].concat(quoteRegexes).concat([fallbackRegex]);
  const regexesStr = regexes.map(reg => `(?:${reg})`).join("|");
  const fullRegex = `^\\s*(?:${regexesStr})`;
  return fullRegex;
};
const wordsRegexString = makeWordsRegex();

export const convertToWords = (str: string) => {
  const regex = new RegExp(wordsRegexString, "g");
  const words: string[] = [];
  while (true) {
    const ret = regex.exec(str);
    if (ret === null) {
      break;
    } else {
      const word = ret.slice(1).find(x => x !== undefined) as string;
      words.push(word.toLowerCase());
    }
  }
  return words;
};

// In all regexes capturing groups replaced to non-capturing (`(` -> `(?:`).
// Source: https://emailregex.com/
const emailRegex = /(?:(?:[^<>(?:)[\]\\.,;:\s@"]+(?:\.[^<>(?:)[\]\\.,;:\s@"]+)*)|(?:".+"))@(?:(?:\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(?:(?:[a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;
// const emailRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
// const emailRegex = /[^\s@,.]+@[^\s@,.]+\.[^\s@,.]+/;
// Source: https://qna.habr.com/answer?answer_id=852265
const telRegex = /\+(?:[- _(?:):=+]?\d[- _(?:):=+]?){10,14}/;
const telRemoveFormating = (tel: string) => "+" + tel.replace(/\D/g, "");
// Source: https://stackoverflow.com/a/3809435
const urlRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9(?:)]{1,6}\b(?:[-a-zA-Z0-9(?:)@:%_+.~#?&//=]*)/;
const linksRegex =
  new RegExp(`\
(?:(${emailRegex.source})|(${telRegex.source})|(${urlRegex.source}))\
`, "gm");
// Regexp above was wrapped in this two parts, but I dont remember why and it works better without, but I would like to keep these lines here for now.
// (?:^|\\s|,)\
// (?:$|\\s|,|\\.|;)
const replaceLink = (match: string, email: string, tel: string, url: string) => {
  const prefix =
    email ? "mailto:" :
      tel ? "tel:" :
        "";
  const formattedMatch = tel ? telRemoveFormating(match) : match;
  return `<a \
target="_blank" rel="noopener noreferrer" \
href="${prefix}${formattedMatch}">${match}</a>`;
};
export const replaceHtmlLinks = (text: string): string => {
  const sanitized = sanitizeHtml(text, { allowedTags: [], disallowedTagsMode: "escape" });
  return sanitized.replace(linksRegex, replaceLink);
};

export type TextLinkType = "url" | "tel" | "email";
export type TextLink = { type: TextLinkType; href: string };
export const findLink = (text: string): TextLink | null => {
  const urlMatch = urlRegex.exec(text);
  if (urlMatch) {
    return {
      type: "url",
      href: urlMatch[0],
    };
  }

  const telMatch = telRegex.exec(text);
  if (telMatch) {
    return {
      type: "tel",
      href: "tel:" + telMatch[0],
    };
  }

  const emailMatch = emailRegex.exec(text);
  if (emailMatch) {
    return {
      type: "email",
      href: "mailto:" + emailMatch[0],
    };
  }

  return null;
};

const asciiRegex = /[\p{ASCII}]+/u;
export const isAscii = (str: string): boolean => asciiRegex.test(str);

export type IconType = "material" | "emoji" | null;
export const getIconType = (str: string | null | undefined): IconType => {
  if (!str) return null;
  return isAscii(str)
    ? "material"
    : "emoji";
};

export const bootstrapVariants = ["primary", "secondary", "success", "danger", "warning", "info", "light", "dark"] as const;
export type BootstrapVariant = typeof bootstrapVariants[number];

/* Modified from https://github.com/warpech/sheetclip/blob/master/sheetclip.js */
const countQuotes = (str: string) => str.split(`"`).length - 1;
export const parseSpreadsheet = (str: string): string[][] => {
  let r;
  let rlen;
  const rows: any = str.split("\n");
  const arr: any = [];
  let a = 0;
  let c;
  let clen;
  let multiline;
  let last;
  if (rows.length > 1 && rows[rows.length - 1] === "") {
    rows.pop();
  }
  for (r = 0, rlen = rows.length; r < rlen; r += 1) {
    rows[r] = rows[r].split("\t");
    for (c = 0, clen = rows[r].length; c < clen; c += 1) {
      if (!arr[a]) {
        arr[a] = [];
      }
      if (multiline && c === 0) {
        last = arr[a].length - 1;
        arr[a][last] = arr[a][last] + "\n" + rows[r][0];
        if (multiline && (countQuotes(rows[r][0]) & 1)) { // `& 1` is a bitwise way of performing mod 2.
          multiline = false;
          arr[a][last] = arr[a][last].substring(0, arr[a][last].length - 1).replace(/""/g, `"`);
        }
      } else if (c === clen - 1 && rows[r][c].indexOf(`"`) === 0 && (countQuotes(rows[r][c]) & 1)) {
        arr[a].push(rows[r][c].substring(1).replace(/""/g, `"`));
        multiline = true;
      } else {
        arr[a].push(rows[r][c].replace(/""/g, `"`));
        multiline = false;
      }
    }
    if (!multiline) {
      a += 1;
    }
  }
  return arr;
};

export const validNumberFormats = ["auto", "ru", "en"] as const;
export type ValidNumberFormat = typeof validNumberFormats[number];
const makeMemoKey = (lang: ValidNumberFormat, fractionDigits?: number) => lang + String(fractionDigits);
export const getNumberFormatter = R.memoizeWith(makeMemoKey, (lang: ValidNumberFormat, fractionDigits?: number) => {
  const locale = lang === "auto" ? undefined : lang;
  const options = fractionDigits === undefined ? undefined
    : { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits };
  return Intl.NumberFormat(locale, options);
});

export const homeLink: Link = {
  type: "query",
  target: "top",
  query: {
    args: {
      source: {
        type: "named",
        ref: {
          schema: "user",
          name: "main",
        },
      },
      args: {},
    },
    defaultValues: {},
    search: "",
    page: null,
  },
};

export class NeverError extends Error {
  constructor(value: never) {
    super(`Unreachable statement: ${value}`);
  }
}

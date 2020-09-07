import moment from "moment";
import Vue, { RenderContext } from "vue";

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

export const nextRender = (): Promise<any> => new Promise((resolve) =>
  Vue.nextTick(() => window.requestAnimationFrame(() => requestAnimationFrame(resolve))));

export declare let process: {
  env: Record<string, string>;
};

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
  return await response.json();
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

export const deepFreeze = (o: any) => {
  Object.freeze(o);

  Object.getOwnPropertyNames(o).forEach(prop => {
    if (o.hasOwnProperty(prop)
                && o[prop] !== null
                && (typeof o[prop] === "object" || typeof o[prop] === "function")
                && !Object.isFrozen(o[prop])) {
      deepFreeze(o[prop]);
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
  } else {
    const conv = constructor(value);
    if (conv instanceof constructor) {
      return conv;
    } else {
      return defValue;
    }
  }
};

export const updateObject = (to: object, from: object) => {
  Object.entries(to).forEach(([name, oldValue]) => {
    if (!(name in from)) {
      Vue.delete(to, name);
    }
  });
  Object.entries(from).forEach(([name, newValue]) => {
    if (!(name in to) || (to as any)[name] !== newValue) {
      Vue.set(to, name, newValue);
    }
  });
};

export const deepUpdateObject = (to: object, from: object) => {
  if (to === null || from === null) {
    throw new Error("deepUpdateObject: expected two objects");
  }

  Object.keys(to).forEach(name => {
    if (!(name in from)) {
      Vue.delete(to, name);
    }
  });
  Object.entries(from).forEach(([name, newValue]) => {
    if (!(name in to)) {
      Vue.set(to, name, newValue);
    } else {
      const oldValue = (to as any)[name];
      if (typeof oldValue === "object" && oldValue !== null && typeof newValue === "object" && newValue !== null) {
        deepUpdateObject(oldValue, newValue);
      } else if (oldValue !== newValue) {
        Vue.set(to, name, newValue);
      }
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
    const res: any = { ...a };
    /* tslint:disable:forin */
    for (const k in res) {
      res[k] = deepClone(res[k]);
    }
    return res;
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
    const bObj = b as any;
    return Object.keys(b).every(k => k in a) &&
            Object.entries(a).every(([k, v]) => k in b && deepEquals(v, bObj[k]));
  } else {
    throw new Error("Cannot compare objects");
  }
};

export const mapMaybe = <A, R>(func: (arg: A, index: number, array: A[]) => R | undefined, arr: A[]): R[] => {
  return arr.map(func).filter(val => val !== undefined) as R[];
};

export const map2 = <A, B, R>(func: (arg1: A, arg2: B, index: number, array1: A[], array2: B[]) => R, arr1: A[], arr2: B[]): R[] => {
  return arr1.map((a, i) => func(a, arr2[i], i, arr1, arr2));
};

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

export class ObjectMap<K, V> {
  private entriesMap: Record<string, [K, V]> = {};

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

  entries() {
    return Object.values(this.entriesMap);
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

// Useful for outputting Vue.js values - this trims all properties.
export const debugLog = (message?: any, ...optionalParams: any[]) => {
  const args = [message, ...optionalParams].map(arg => {
    try {
      return JSON.parse(JSON.stringify(arg));
    } catch (e) {
      return arg;
    }
  });
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

export interface IResource<T> {
  value: T;
  refs: RecordSet<ReferenceName>;
}

// Implements a map with named references which supports removing unreferenced entries.
export class ResourceMap<V> {
  private resourcesMap: Record<string, IResource<V>> = {};

  createResource(key: string, reference: ReferenceName, value: V) {
    if (key in this.resourcesMap) {
      throw new Error("Resource is already allocated");
    }
    const resource: IResource<V> = {
      value,
      refs: { [reference]: null },
    };
    Vue.set(this.resourcesMap, key, resource);
  }

  updateResource(key: string, value: V) {
    const resource = this.resourcesMap[key];
    if (resource === undefined) {
      throw new Error("Resource doesn't exist");
    }
    resource.value = value;
  }

  addReference(key: string, name: ReferenceName) {
    const resource = this.resourcesMap[key];
    if (resource === undefined) {
      throw new Error("Resource doesn't exist");
    }
    Vue.set(resource.refs, name, null);
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

  getResource(key: string): IResource<V> | undefined {
    return this.resourcesMap[key];
  }

  get(key: string) {
    const resource = this.resourcesMap[key];
    return resource === undefined ? undefined : resource.value;
  }

  keys() {
    return Object.keys(this.resourcesMap);
  }

  resources() {
    return Object.values(this.resourcesMap);
  }

  values() {
    return Object.values(this.resourcesMap).map(res => res.value);
  }

  entries() {
    return Object.entries(this.resourcesMap).map(([name, res]) => [name, res.value]);
  }
}

export class ObjectResourceMap<K, V> {
  private map = new ResourceMap<[K, V]>();

  createResource(key: K, reference: ReferenceName, value: V) {
    this.map.createResource(valueSignature(key), reference, [key, value]);
  }

  updateResource(key: K, value: V) {
    this.map.updateResource(valueSignature(key), [key, value]);
  }

  addReference(key: K, name: ReferenceName) {
    this.map.addReference(valueSignature(key), name);
  }

  removeReference(key: K, name: ReferenceName) {
    return this.map.removeReference(valueSignature(key), name);
  }

  getResource(key: K): IResource<V> | undefined {
    const ret = this.map.getResource(valueSignature(key));
    return ret !== undefined ? { value: ret.value[1], refs: ret.refs } : undefined;
  }

  get(key: K): V | undefined {
    return this.getBySignature(valueSignature(key));
  }

  getBySignature(signature: string): V | undefined {
    const ret = this.map.get(signature);
    return ret !== undefined ? ret[1] : undefined;
  }

  resources() {
    return this.map.resources();
  }

  keys(): K[] {
    return this.map.values().map(x => x[0]);
  }

  values(): V[] {
    return this.map.values().map(x => x[1]);
  }

  entries(): [K, V][] {
    return this.map.values();
  }
}

export const isIOS = () => !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);
export const isMobile = () => !!(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

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
    // Match fully-quoted words: e.g. `"foo bar"` will match but `"foo"b` or `"foo ` will not
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
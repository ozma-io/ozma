import moment from "moment"
import Vue from "vue"

export type Result<A> = A | Error

export type RecordSet<K extends string | number | symbol> = Record<K, null>

export interface IRef<A> {
    ref?: A
}

export const resultMap = <A, B>(func: ((_: A) => B), res: Result<A>): Result<B> => {
    if (res instanceof Error) {
        return res
    } else {
        return func(res)
    }
}

export declare var process: {
    env: Record<string, string>,
}

export class FetchError extends Error {
    message: string
    response: Response

    constructor(message: string, response: Response) {
        super(message)
        this.message = message
        this.response = response
    }
}

export const fetchSuccess = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const response = await fetch(input, init)
    if (!response.ok) {
        const text = await response.text()
        const message = text === "" ? response.statusText : text
        throw new FetchError(message, response)
    }
    return response
}

export const fetchJson = async (input: RequestInfo, init?: RequestInit): Promise<any> => {
    const response = await fetchSuccess(input, init)
    return await response.json()
}

export const randomId = () => {
    return Math.random().toString(36).substring(2, 15)
}

export const language = navigator.languages[0]
export const shortLanguage = language.split("-")[0]

export const momentLocale = (async () => {
    if (shortLanguage !== "en") {
        await import(`moment/locale/${shortLanguage}.js`)
    }
    moment.locale(shortLanguage)
})()

export const sse = () => {
    return Math.floor((new Date()).getTime() / 1000)
}

export const deepFreeze = (o: any) => {
    Object.freeze(o)

    Object.getOwnPropertyNames(o).forEach(prop => {
        if (o.hasOwnProperty(prop)
                && o[prop] !== null
                && (typeof o[prop] === "object" || typeof o[prop] === "function")
                && !Object.isFrozen(o[prop])) {
            deepFreeze(o[prop])
        }
    })

    return o
}

export const waitForElement = (e: GlobalEventHandlers) => {
    return new Promise((resolve, reject) => {
        e.onload = resolve
        e.onerror = reject
    })
}

export const convertString = <T>(value: string, constructor: (_: string) => T, defValue: T): T => {
    if (value === "") {
        return defValue
    }

    if (constructor === Number as any) {
        const conv = Number(value)
        if (Number.isNaN(conv)) {
            return defValue
        } else {
            return conv as any
        }
    } else if (constructor === String as any) {
        return value as any
    } else {
        const conv = constructor(value)
        if (conv instanceof constructor) {
            return conv
        } else {
            return defValue
        }
    }
}

export const updateObject = (to: object, from: object) => {
    Object.entries(to).forEach(([name, oldValue]) => {
        if (!(name in from)) {
            Vue.delete(to, name)
        }
    })
    Object.entries(from).forEach(([name, newValue]) => {
        if (!(name in to) || (to as any)[name] !== newValue) {
            Vue.set(to, name, newValue)
        }
    })
}

export const deepUpdateObject = (to: object, from: object) => {
    if (to === null || from === null) {
        throw new Error("deepUpdateObject: expected two objects")
    }

    Object.entries(to).forEach(([name, oldValue]) => {
        if (!(name in from)) {
            Vue.delete(to, name)
        }
    })
    Object.entries(from).forEach(([name, newValue]) => {
        if (!(name in to)) {
            Vue.set(to, name, newValue)
        } else {
            const oldValue = (to as any)[name]
            if (typeof oldValue === "object" && oldValue !== null && typeof newValue === "object" && newValue !== null) {
                deepUpdateObject(oldValue, newValue)
            } else if (oldValue !== newValue) {
                Vue.set(to, name, newValue)
            }
        }
    })
}

export const tryDicts = <K extends string | number | symbol, V>(key: K, ...dicts: Array<Record<K, V> | undefined>): V | undefined => {
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
    if (typeof a !== "object" || a === null) {
        return a
    } else if (a instanceof Array) {
        return a.map(deepClone) as any
    } else if (!hasUserPrototype(a as any)) {
        return Object.fromEntries(Object.entries(a).map(([k, v]) => [k, deepClone(v)]))
    } else {
        throw Error("Cannot deep clone an object")
    }
}

export const mapMaybe = <A, B>(func: (arg: A, index: number, array: A[]) => B | undefined, arr: A[]): B[] => {
    return arr.map(func).filter(val => val !== undefined) as B[]
}

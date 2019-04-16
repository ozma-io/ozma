import moment from "moment"
import Vue from "vue"

import seq from "@/sequences"

export type Result<A> = A | Error

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
    seq(to).forEach(([name, oldValue]) => {
        if (!(name in from)) {
            Vue.delete(to, name)
        }
    })
    seq(from).forEach(([name, newValue]) => {
        if (!(name in to) || to[name] !== newValue) {
            Vue.set(to, name, newValue)
        }
    })
}

export const deepUpdateObject = (to: object, from: object) => {
    if (to === null || from === null) {
        throw new Error("deepUpdateObject: expected two objects")
    }

    seq(to).forEach(([name, oldValue]) => {
        if (!(name in from)) {
            Vue.delete(to, name)
        }
    })
    seq(from).forEach(([name, newValue]) => {
        if (!(name in to)) {
            Vue.set(to, name, newValue)
        } else {
            const oldValue = to[name]
            if (typeof oldValue === "object" && oldValue !== null && typeof newValue === "object" && newValue !== null) {
                deepUpdateObject(oldValue, newValue)
            } else if (oldValue !== newValue) {
                Vue.set(to, name, newValue)
            }
        }
    })
}

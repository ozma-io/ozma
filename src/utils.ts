import moment from "moment"

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

export type Result<A> = A | Error

export const resultMap = <A, B>(func: ((_: A) => B), res: Result<A>): Result<B> => {
    if (res instanceof Error) {
        return res
    } else {
        return func(res)
    }
}

export declare var process: {
    env: Record<string, string>
}

export const isProduction: boolean = (process.env["NODE_ENV"] === "production")

export class FetchError extends Error {
    message: string
    response: Response

    constructor(response: Response) {
        super(response.statusText)
        console.log(response)
        this.message = response.statusText
        this.response = response
    }
}

export const fetchSuccess = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const response = await fetch(input, init)
    if (!response.ok) {
        throw new FetchError(response)
    }
    return response
}

export const fetchJson = async (input: RequestInfo, init?: RequestInit): Promise<any> => {
    const response = await fetchSuccess(input, init)
    return await response.json()
}
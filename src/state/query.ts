import { Module } from "vuex"
import { RawLocation, Route } from "vue-router"

import { convertString, deepUpdateObject } from "@/utils"
import seq from "@/sequences"
import { routerQueryValue, router } from "@/modules"
import { IUserViewArguments, userViewHash } from "@/state/user_view"

export class CurrentQuery {
    search: Record<string, Record<string, string>> = {}
    rootViewArgs: IUserViewArguments | null = null

    getSearch<T>(args: IUserViewArguments | null, name: string, constructor: (_: string) => T, defValue: T): T {
        let ret: Record<string, string>
        if (args === null) {
            ret = this.search["root"]
        } else {
            ret = this.search[userViewHash(args)]
        }
        if (ret === undefined) {
            return defValue
        } else {
            const nameRet = ret[name]
            if (nameRet === undefined) {
                return defValue
            } else {
                return convertString(nameRet, constructor, defValue)
            }
        }
    }
}

export interface IQueryState {
    current: CurrentQuery
}

export interface IQuery {
    search: Record<string, Record<string, string>>
    rootViewArgs: IUserViewArguments
}

export const queryLocation = (query: IQuery): RawLocation => {
    if (query.rootViewArgs.type !== "named") {
        throw new Error("Unnamed user views aren't supported now")
    }

    const searchArgs = seq(query.search).mapConcat(([hash, values]) => seq(values).map<[string, string]>(([name, value]) => {
        if (hash === "root") {
            return [`__${name}`, value]
        } else {
            return [`__${hash}__${name}`, value]
        }
    }))
    const uvArgs = query.rootViewArgs.args === null ? [] : seq(query.rootViewArgs.args).map<[string, string]>(([name, value]) => [name, JSON.stringify(value)])
    const args = searchArgs.append(uvArgs).toObject()
    return {
        name: query.rootViewArgs.args !== null ? "view" : "view_create",
        params: { name: query.rootViewArgs.source },
        query: args,
    }
}

export const replaceSearch = (args: IUserViewArguments | null, name: string, value: string) => {
    const query = Object.assign({}, router.currentRoute.query)
    let key
    if (args === null) {
        key = `__${name}`
    } else {
        key = `__${userViewHash(args)}__${name}`
    }
    if (value === "") {
        delete query[key]
    } else {
        query[key] = value
    }
    router.replace({ query })
}

// While in user_view views we use this module to reduce complete page reloads.
// Route updates are parsed and existing query is granularly updated.
const queryModule: Module<IQueryState, {}> = {
    namespaced: true,
    state: {
        current: new CurrentQuery(),
    },
    mutations: {
        setRoute: (state, route: Route) => {
            if (route.name !== "view" && route.name !== "view_create") {
                state.current = new CurrentQuery()
            }

            // Gracefully update so that we don't reload without need.
            const search: Record<string, Record<string, string>> = {}
            const rootSearch: Record<string, string> = {}
            const rootNameRegexp = /^__([a-zA-Z0-9][a-zA-Z0-9_]*)$/
            const nameRegexp = /^__(.*)__([a-zA-Z0-9][a-zA-Z0-9_]*)$/
            seq(route.query).forEach(([name, value]) => {
                const strName = String(name)
                const strValue = routerQueryValue(value)
                if (strValue !== null) {
                    const rootMatch = strName.match(rootNameRegexp)
                    if (rootMatch !== null) {
                        const uvName = rootMatch[1]
                        rootSearch[uvName] = strValue
                    } else {
                        const match = strName.match(nameRegexp)
                        if (match !== null) {
                            const hash = match[1]
                            const uvName = match[2]
                            let subSearch = search[hash]
                            if (subSearch === undefined) {
                                subSearch = {}
                                search[hash] = subSearch
                            }
                            subSearch[uvName] = strValue
                        }
                    }
                }
            })
            search["root"] = rootSearch
            deepUpdateObject(state.current.search, search)

            let reqArgs: Record<string, any> | null
            if (route.name === "view") {
                reqArgs = seq(route.query).mapMaybe<[string, string]>(([name, value]) => {
                    const strName = String(name)
                    const strValue = routerQueryValue(value)
                    if (!strName.startsWith("__") && strValue !== null) {
                        return [strName, JSON.parse(strValue)]
                    } else {
                        return undefined
                    }
                }).toObject()
            } else if (route.name === "view_create") {
                reqArgs = null
            } else {
                throw new Error(`Impossible route name: ${route.name}`)
            }

            const userViewArgs: IUserViewArguments = {
                type: "named",
                source: String(route.params.name),
                args: reqArgs,
            }
            if (state.current.rootViewArgs === null) {
                state.current.rootViewArgs = userViewArgs
            } else {
                deepUpdateObject(state.current.rootViewArgs, userViewArgs)
            }
        },
    },
}

export default queryModule

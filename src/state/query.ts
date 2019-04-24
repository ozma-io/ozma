import { Module } from "vuex"
import { RawLocation, Route } from "vue-router"

import { IUserViewRef, SchemaName } from "@/api"
import { convertString, deepUpdateObject } from "@/utils"
import seq from "@/sequences"
import { routerQueryValue, router } from "@/modules"
import { IUserViewArguments, IUpdatableField, userViewHash } from "@/state/user_view"

export class CurrentQuery {
    search: Record<string, string> = {}
    rootViewArgs: IUserViewArguments | null = null

    getSearch<T>(name: string, constructor: (_: string) => T, defValue: T): T {
        const ret = this.search[name]
        if (ret === undefined) {
            return defValue
        } else {
            return convertString(ret, constructor, defValue)
        }
    }
}

export interface IQueryState {
    current: CurrentQuery
}

export interface IQuery {
    search: Record<string, string>
    rootViewArgs: IUserViewArguments
}

export const queryLocation = (query: IQuery): RawLocation => {
    if (query.rootViewArgs.source.type !== "named") {
        throw new Error("Unnamed user views aren't supported now")
    }

    const searchArgs = seq(query.search).map<[string, string]>(([name, value]) => [`__${name}`, value])
    const uvArgs = query.rootViewArgs.args === null ? [] : seq(query.rootViewArgs.args).map<[string, string]>(([name, value]) => [name, JSON.stringify(value)])
    const args = searchArgs.append(uvArgs).toObject()
    return {
        name: query.rootViewArgs.args !== null ? "view" : "view_create",
        params: query.rootViewArgs.source.ref as any,
        query: args,
    }
}

export const replaceSearch = (name: string, value: string) => {
    const query = Object.assign({}, router.currentRoute.query)
    const key = `__${name}`
    if (value === "") {
        delete query[key]
    } else {
        query[key] = value
    }
    router.replace({ query })
}

export const defaultValuePrefix = "def__"

export const attrToInfoQuery = (linkedAttr: any): IQuery | null => {
    if (typeof linkedAttr === "object" && linkedAttr !== null) {
        let ref: IUserViewRef
        if (typeof linkedAttr.ref === "object" && linkedAttr.ref !== null) {
            ref = linkedAttr.ref
        } else {
            ref = linkedAttr
        }
        if (typeof ref.schema !== "string" || typeof ref.name !== "string") {
            return null
        }

        const search: Record<string, string> = {}
        if (typeof linkedAttr.defaultValues === "object" && linkedAttr.defaultValues !== null) {
            Object.entries(linkedAttr.defaultValues).forEach(([name, val]) => {
                search[`${defaultValuePrefix}${name}`] = JSON.stringify(val)
            })
        }

        return {
            search,
            rootViewArgs: {
                source: {
                    type: "named",
                    ref: {
                        schema: ref.schema,
                        name: ref.name,
                    },
                },
                args: null,
            },
        }
    } else {
        return null
    }
}

export const attrToQuery = (update: IUpdatableField | undefined, homeSchema: SchemaName | null, linkedAttr: any): IQuery | null => {
    if (typeof linkedAttr === "object" && linkedAttr !== null) {
        let ref: IUserViewRef
        if (typeof linkedAttr.ref === "object" && linkedAttr.ref !== null) {
            ref = linkedAttr.ref
        } else {
            ref = linkedAttr
        }
        if (typeof ref.name !== "string") {
            return null
        }
        let schema: SchemaName
        if (typeof ref.schema !== "string") {
            if (homeSchema === null) {
                return null
            } else {
                schema = homeSchema
            }
        } else {
            schema = ref.schema
        }

        let args: Record<string, any> = {}
        if (typeof linkedAttr.args === "object" && linkedAttr.args !== null) {
            args = linkedAttr.args
        }
        if (!("id" in args) && update !== undefined) {
            args.id = update.id
        }

        const search: Record<string, string> = {}
        if (typeof linkedAttr.defaultValues === "object" && linkedAttr.defaultValues !== null) {
            Object.entries(linkedAttr.defaultValues).forEach(([name, val]) => {
                search[`${defaultValuePrefix}${name}`] = JSON.stringify(val)
            })
        }

        return {
            search,
            rootViewArgs: {
                source: {
                    type: "named",
                    ref: {
                        schema: ref.schema,
                        name: ref.name,
                    },
                },
                args,
            },
        }
    } else {
        return null
    }
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
            const searchPrefix = "__"
            const search = seq(route.query).mapMaybe<[string, string]>(([name, value]) => {
                const strName = String(name)
                const strValue = routerQueryValue(value)
                if (strName.startsWith(searchPrefix) && strValue !== null) {
                    const searchName = strName.slice(searchPrefix.length)
                    return [searchName, strValue]
                } else {
                    return undefined
                }
            }).toObject()
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
                source: {
                    type: "named",
                    ref: {
                        schema: String(route.params.schema),
                        name: String(route.params.name),
                    },
                },
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

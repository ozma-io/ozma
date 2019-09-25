import { Module } from "vuex";
import { RawLocation, Route } from "vue-router";

import { IUserViewRef, SchemaName } from "@/api";
import { convertString, deepUpdateObject, mapMaybe } from "@/utils";
import { routerQueryValue, router } from "@/modules";
import { IUserViewArguments, IValueInfo } from "@/state/user_view";

export class CurrentQuery {
    search: Record<string, string> = {};
    rootViewArgs: IUserViewArguments | null = null;

    getSearch<T>(name: string, constructor: (_: string) => T, defValue: T): T {
        const ret = this.search[name];
        if (ret === undefined) {
            return defValue;
        } else {
            return convertString(ret, constructor, defValue);
        }
    }
}

export interface IQueryState {
    current: CurrentQuery;
}

export interface IQuery {
    defaultValues: Record<string, any>;
    args: IUserViewArguments;
}

export const queryLocation = (query: IQuery): RawLocation => {
    if (query.args.source.type !== "named") {
        throw new Error("Unnamed user views aren't supported now");
    }

    const search: Record<string, any> = {};
    Object.entries(query.defaultValues).forEach(([name, value]) => {
        search[`__${defaultValuePrefix}${name}`] = JSON.stringify(value);
    });
    if (query.args.args !== null) {
        Object.entries(query.args.args).forEach(([name, value]) => {
            search[name] = JSON.stringify(value);
        });
    }
    return {
        name: query.args.args !== null ? "view" : "view_create",
        params: query.args.source.ref as any,
        query: search,
    };
};

export const replaceSearch = (name: string, value: string) => {
    const query = { ...router.currentRoute.query };
    const key = `__${name}`;
    if (value === "") {
        delete query[key];
    } else {
        query[key] = value;
    }
    router.replace({ query });
};

export const defaultValuePrefix = "def__";

export interface IAttrToQueryOpts {
    homeSchema?: SchemaName;
    infoByDefault?: boolean;
    makeDefaultValues?: () => Record<string, any>;
}

export const attrToQuery = (linkedAttr: any, opts?: IAttrToQueryOpts): IQuery | null => {
    if (typeof linkedAttr === "object" && linkedAttr !== null) {
        let ref: IUserViewRef;
        if (typeof linkedAttr.ref === "object" && linkedAttr.ref !== null) {
            ref = linkedAttr.ref;
        } else {
            ref = linkedAttr;
        }
        if (typeof ref.name !== "string") {
            return null;
        }
        if (typeof ref.schema !== "string") {
            if (opts && opts.homeSchema !== undefined) {
                ref.schema = opts.homeSchema;
            } else {
                return null;
            }
        }

        let args: Record<string, any> | null;
        if (linkedAttr.new || (opts && opts.infoByDefault)) {
            args = null;
        } else if (typeof linkedAttr.args === "object" && linkedAttr.args !== null) {
            args = linkedAttr.args;
        } else {
            args = {};
        }

        let defaultValues: Record<string, any>;
        if (typeof linkedAttr.defaultValues === "object" && linkedAttr.defaultValues !== null) {
            defaultValues = linkedAttr.defaultValues;
        } else if (opts && opts.makeDefaultValues !== undefined) {
            defaultValues = opts.makeDefaultValues();
        } else {
            defaultValues = {};
        }

        return {
            defaultValues,
            args: {
                source: {
                    type: "named",
                    ref: {
                        schema: ref.schema,
                        name: ref.name,
                    },
                },
                args,
            },
        };
    } else {
        return null;
    }
};

// Set 'id' argument to the value id.
export const attrToQuerySelf = (linkedAttr: any, update?: IValueInfo, opts?: IAttrToQueryOpts): IQuery | null => {
    const ret = attrToQuery(linkedAttr, opts);
    if (ret !== null) {
        const args = ret.args.args;
        if (args !== null) {
            if (!("id" in args) && update) {
                args.id = update.id;
            }
        }
    }
    return ret;
};

// Set 'id' argument to the id of the referenced value.
export const attrToQueryRef = (linkedAttr: any, value: any, update?: IValueInfo, opts?: IAttrToQueryOpts): IQuery | null => {
    const ret = attrToQuery(linkedAttr, opts);
    if (ret !== null) {
        const args = ret.args.args;
        if (args !== null) {
            if (!("id" in args) && value !== null && value !== undefined && update && update.field !== null && update.field.fieldType.type === "reference") {
                const id = Number(value);
                if (!Number.isNaN(id)) {
                    args.id = id;
                }
            }
        }
    }
    return ret;
};

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
                state.current = new CurrentQuery();
            }

            // Gracefully update so that we don't reload without need.
            const searchPrefix = "__";
            const search = Object.fromEntries(mapMaybe(([name, value]) => {
                const strName = String(name);
                const strValue = routerQueryValue(value);
                if (strName.startsWith(searchPrefix) && strValue !== null) {
                    const searchName = strName.slice(searchPrefix.length);
                    return [searchName, strValue];
                } else {
                    return undefined;
                }
            }, Object.entries(route.query)));
            deepUpdateObject(state.current.search, search);

            let reqArgs: Record<string, any> | null;
            if (route.name === "view") {
                reqArgs = Object.fromEntries(mapMaybe(([name, value]) => {
                    const strName = String(name);
                    const strValue = routerQueryValue(value);
                    if (!strName.startsWith("__") && strValue !== null) {
                        return [strName, JSON.parse(strValue)];
                    } else {
                        return undefined;
                    }
                }, Object.entries(route.query)));
            } else if (route.name === "view_create") {
                reqArgs = null;
            } else {
                throw new Error(`Impossible route name: ${route.name}`);
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
            };
            if (state.current.rootViewArgs === null) {
                state.current.rootViewArgs = userViewArgs;
            } else {
                deepUpdateObject(state.current.rootViewArgs, userViewArgs);
            }
        },
    },
};

export default queryModule;

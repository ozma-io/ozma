import Vue from "vue"
import Component from "vue-class-component"
import { VueConstructor } from "vue"
import { Store } from "vuex"

import { CombinedUserView } from "@/state/user_view"
import { IHandlerProvider } from "@/local_user_view"

export interface IUserViewOptions<ConstrT extends IHandlerProvider> {
    localConstructor?: new (store: Store<any>, uv: CombinedUserView, defaultRawValues: Record<string, any>, oldLocal: ConstrT | null) => ConstrT,
}

export interface IUserViewConstructor<V extends Vue = Vue> extends VueConstructor<V> {
    localConstructor?: (store: Store<any>, uv: CombinedUserView, defaultRawValues: Record<string, any>, oldLocal: IHandlerProvider | null) => IHandlerProvider
}

export const UserView = <ConstrT extends IHandlerProvider>(opts?: IUserViewOptions<ConstrT>) => {
    return <VC>(constructor: VC) => {
        const constructorMut = constructor as any as IUserViewConstructor<Vue>
        if (opts !== undefined) {
            const localConstructor = opts.localConstructor
            if (localConstructor !== undefined) {
                constructorMut.localConstructor = (store: Store<any>, uv: CombinedUserView, defaultRawValues: Record<string, any>, oldLocal: IHandlerProvider | null) => {
                    return new localConstructor(store, uv, defaultRawValues, oldLocal instanceof localConstructor ? oldLocal : null)
                }
            }
        }
        return constructor
    }
}

Component.registerHooks([
    "beforeRouteEnter",
    "beforeRouteLeave",
    "beforeRouteUpdate",
])

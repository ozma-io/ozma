import Vue from "vue"
import Component from "vue-class-component"
import { VueConstructor } from "vue"
import { Store } from "vuex"

import { CombinedUserView } from "@/state/user_view"
import { IHandlerProvider } from "@/local_user_view"

export interface IUserViewOptions {
    localConstructor?: new (store: Store<any>, uv: CombinedUserView, defaultRawValues: Record<string, any>) => IHandlerProvider,
}

export interface IUserViewConstructor<V extends Vue = Vue> extends VueConstructor<V> {
    localConstructor?: new (store: Store<any>, uv: CombinedUserView, defaultRawValues: Record<string, any>) => IHandlerProvider
}

export const UserView = (opts?: IUserViewOptions) => {
    return <VC>(constructor: VC) => {
        const constructorMut = constructor as any as IUserViewConstructor<Vue>
        if (opts !== undefined) {
            if (opts.localConstructor !== undefined) {
                constructorMut.localConstructor = opts.localConstructor
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

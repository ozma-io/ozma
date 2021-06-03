import Component from "vue-class-component";
import { VueConstructor, default as Vue } from "vue";

import { isIOS, isMobile } from "@/utils";
import { IUserViewHandler } from "@/user_views/combined";

/* This defines an attribute, `UserView`, which is used on all user view components.
 * We use it to pass an optional constructor for LocalUserView descendant to an enclosing component `UserView.vue`.
 * LocalUserView contains all the state of this user view which must be passed between reloads, e.g. what rows are
 * currently selected. Enclosing component manages its lifetime and passes previous instances of local state
 * (`oldLocal` argument), from which current state can be re-initialized.
 *
 * To accomplish this we add an extra value, `localConstructor`, to the user view constructor object.
 */
export interface IUserViewOptions<ValueT, RowT, ViewT, T extends IUserViewHandler<ValueT, RowT, ViewT>> {
  handler?: T;
  useLazyLoad?: boolean;
}

export interface IUserViewConstructor<V extends Vue = Vue> extends VueConstructor<V> {
  handler?: IUserViewHandler<any, any, any>;
  useLazyLoad?: boolean;
}

export const UserView = <ValueT, RowT, ViewT, T extends IUserViewHandler<ValueT, RowT, ViewT>>(opts?: IUserViewOptions<ValueT, RowT, ViewT, T>) => {
  return <V extends Vue, VC extends VueConstructor<V>>(constructor: VC) => {
    const constructorMut = constructor as IUserViewConstructor<V>;
    if (opts !== undefined) {
      if (opts.handler !== undefined) {
        constructorMut.handler = opts.handler;
      }

      if (opts.useLazyLoad !== undefined) {
        constructorMut.useLazyLoad = opts.useLazyLoad;
      }
    }
    return constructor;
  };
};

Component.registerHooks([
  "beforeRouteEnter",
  "beforeRouteLeave",
  "beforeRouteUpdate",
]);

export const VueIsMobile = {
  // eslint-disable-next-line no-shadow
  install(Vue: VueConstructor, options: unknown) {
    Object.defineProperty(Vue.prototype, "$isMobile", {
      get() {
        return isMobile;
      },
    });

    Object.defineProperty(Vue.prototype, "$isIOS", {
      get() {
        return isIOS;
      },
    });
  },
};

declare module "vue/types/vue" {
  // eslint-disable-next-line no-shadow
  interface Vue {
    $isMobile: boolean;
    $isIOS: boolean;
  }
}

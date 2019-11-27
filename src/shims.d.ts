declare var __API_URL__: string;
declare var __API_AUTH_URL__: string;
declare var __API_AUTH_URL_BASE__: string;
declare var __AUTH_CLIENT_ID__: string;

declare module "v-click-outside" {
    const vClickOutside: any;
    export default vClickOutside;
}

declare module "*.vue" {
    import Vue from "vue";
    export default Vue;
}

declare module "@liqueflies/vue-flex-grid" {
  const VueGrid: any;
  export default VueGrid;
}

declare module "vue-fragment" {
  export const Plugin: any;
}

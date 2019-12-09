declare var __API_URL__: string;
declare var __API_AUTH_URL__: string | undefined;
declare var __API_AUTH_URL_BASE__: string | undefined;
declare var __AUTH_CLIENT_ID__: string | undefined;
declare var __DISABLE_AUTH__: boolean;

declare module "v-click-outside" {
    const vClickOutside: any;
    export default vClickOutside;
}

declare module "*.vue" {
    import Vue from "vue";
    export default Vue;
}

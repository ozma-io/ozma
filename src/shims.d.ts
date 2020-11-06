declare const __API_URL__: string;
declare const __API_AUTH_URL__: string | undefined;
declare const __API_AUTH_URL_BASE__: string | undefined;
declare const __AUTH_CLIENT_ID__: string | undefined;
declare const __DISABLE_AUTH__: boolean;
declare const __DEVELOPMENT_MODE__: boolean;

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

declare module "vue-monaco" {
  const MonacoEditor: any;
  export default MonacoEditor;
}

declare module "vue-input-autowidth" {
  const VueInputAutowidth: any;
  export default VueInputAutowidth;
}

declare module "vue-textarea-autosize";

declare module "vue-dragscroll";
declare module "vue-qrcode-reader";
declare module "@chenfengyuan/vue-qrcode";


declare const __API_URL__: string
declare const __INSTANCE_NAME__: string
declare const __API_AUTH_URL__: string | undefined
declare const __AUTH_CLIENT_ID__: string | undefined
declare const __DISABLE_AUTH__: boolean | undefined
declare const __DEVELOPMENT_MODE__: boolean | undefined
declare const __DOCUMENT_GENERATOR_URL__: string | undefined
declare const __INVITES_SERVICE_URL__: string | undefined

interface Window {
  INSTANCE_NAME?: string
  API_URL?: string
  DOCUMENT_GENERATOR_URL?: string
  INVITES_SERVICE_URL?: string
  DEVELOPMENT_MODE?: boolean
  API_AUTH_URL?: string
  AUTH_CLIENT_ID?: string
}

declare module 'v-click-outside' {
  const vClickOutside: any
  export default vClickOutside
}

declare module '*.vue' {
  // eslint-disable-next-line
  import Vue from 'vue'

  export default Vue
}

declare module 'vue-fragment' {
  export const Plugin: any
}

declare module 'vue-monaco' {
  const MonacoEditor: any
  export default MonacoEditor
}

declare module 'vue-input-autowidth' {
  const VueInputAutowidth: any
  export default VueInputAutowidth
}

declare module 'vue-textarea-autosize'

declare module 'vue-dragscroll'
declare module 'vue-barcode-reader'
declare module '@chenfengyuan/vue-qrcode'
declare module 'vue-barcode'

declare module 'vue-popperjs'

declare module 'vue2-hammer'

declare module 'v-hotkey' {
  // eslint-disable-next-line
  import { PluginFunction } from 'vue'

  type Plugin = {
    install: PluginFunction<{ [alias in string]?: number }>
  }

  const plugin: Plugin

  export default plugin
}

declare module 'vue-wrapped-component'

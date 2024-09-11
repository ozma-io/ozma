import * as fs from 'fs'
import webpack from 'webpack'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin'

const defaultConfig = fs.readFileSync('./config/development.json')
const configName = process.env['CONFIG'] || process.env['NODE_ENV']
let buildConfig
try {
  buildConfig = fs.readFileSync(`./config/${configName}.json`)
} catch (e) {
  buildConfig = defaultConfig
}
const defaults = {
  __DISABLE_AUTH__: false,
  __API_AUTH_URL__: undefined,
  __API_AUTH_URL_BASE__: undefined,
  __AUTH_CLIENT_ID__: undefined,
  __DEVELOPMENT_MODE__: false,
}

const analyzeBundle = process.env['ANALYZE']

export const assetsDir = 'static'
export const outputDir = process.env['OUTDIR'] || 'dist'
export const productionSourceMap = false
export const lintOnSave = process.env['NODE_ENV'] !== 'production'
export const pluginOptions = {
  lintStyleOnBuild: lintOnSave,
  stylelint: {
    fix: false,
  },

  i18n: {
    fallbackLocale: 'en',
    localeDir: 'locales',
    enableInSFC: true,
  }
}
export const configureWebpack = {
  plugins: [
    new MonacoWebpackPlugin({
      languages: ['sql', 'javascript', 'json', 'html'],
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/,
    }),
    ...(analyzeBundle ? [new BundleAnalyzerPlugin()] : []),
  ],
}
export const chainWebpack = (config) => {
  config.module
    .rule('vue')
    .use('vue-loader')
    .tap((options) => {
      options.compiler = require('vue-template-babel-compiler')
      return options
    })
  /* Manually set prefetched chunks */
  config.plugins.delete('prefetch')
  config
    .plugin('define')
    .tap(([definitions, ...rest]) => [
      { ...definitions, ...defaults, ...buildConfig },
      ...rest,
    ])
  config.module
    .rule('i18n')
    .resourceQuery(/blockType=i18n/)
    .type('javascript/auto')
    .use('i18n')
    .loader('@intlify/vue-i18n-loader')
    .end()
}
export const css = {
  loaderOptions: {
    sass: {
      additionalData: `@use "sass:math"; @import "~@/styles/mixins.scss";`,
      sassOptions: { quietDeps: true },
    },
  },
}

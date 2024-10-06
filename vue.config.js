import * as fs from 'fs'
import webpack from 'webpack'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import VueTemplateBabelCompiler from 'vue-template-babel-compiler'
import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin'
import CreateFileWebpack from 'create-file-webpack'

const configName =
  process.env['CONFIG'] || process.env['NODE_ENV'] || 'development'
const buildConfig = JSON.parse(fs.readFileSync(`./config/${configName}.json`))
const defaults = {
  __API_AUTH_URL__: undefined,
  __AUTH_CLIENT_ID__: undefined,
  __DISABLE_AUTH__: false,
  __DEVELOPMENT_MODE__: false,
  __DOCUMENT_GENERATOR_URL__: undefined,
  __INVITES_SERVICE_URL__: undefined,
}

const analyzeBundle = process.env['ANALYZE']
const enableLint = process.env['NODE_ENV'] !== 'production'
const embeddedJs = fs.readFileSync(
  import.meta
    .resolve('@ozma-io/ozma-embedded/embedded')
    .replace(/^file:\/\//, ''),
)

export default {
  assetsDir: 'static',
  outputDir: process.env['OUTDIR'] || 'dist',
  productionSourceMap: false,
  lintOnSave: enableLint,
  pluginOptions: {
    lintStyleOnBuild: enableLint,
    stylelint: {
      fix: false,
    },

    i18n: {
      fallbackLocale: 'en',
      localeDir: 'locales',
      enableInSFC: true,
    },
  },
  configureWebpack: {
    plugins: [
      new MonacoWebpackPlugin({
        // `typescript` is needed when `javascript` is enabled.
        // Otherwise we get runtime errors when trying to edit actions.
        languages: ['sql', 'javascript', 'typescript', 'json', 'html'],
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      }),
      new CreateFileWebpack({
        path: './dist',
        fileName: 'ozma-embedded.min.js',
        content: embeddedJs,
      }),
      ...(analyzeBundle ? [new BundleAnalyzerPlugin()] : []),
    ],
  },
  chainWebpack: (config) => {
    config.module
      .rule('vue')
      .use('vue-loader')
      .tap((options) => {
        options.compiler = VueTemplateBabelCompiler
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
  },
  css: {
    loaderOptions: {
      sass: {
        additionalData: `@use "sass:math"; @import "~@/styles/mixins.scss";`,
        sassOptions: { quietDeps: true },
      },
    },
  },
}

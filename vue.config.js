"use strict";

const { IgnorePlugin } = require("webpack");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");

const defaultConfig = require("./config/development.json");
const configName = process.env["CONFIG"] || process.env["NODE_ENV"];
let buildConfig;
try {
  buildConfig = require(`./config/${configName}.json`);
} catch (e) {
  buildConfig = defaultConfig;
}
const defaults = {
  "__DISABLE_AUTH__": false,
  "__API_AUTH_URL__": undefined,
  "__API_AUTH_URL_BASE__": undefined,
  "__AUTH_CLIENT_ID__": undefined,
  "__DEVELOPMENT_MODE__": false
};

const analyzeBundle = process.env["ANALYZE"];
const outputDir = process.env["OUTDIR"] || "dist";
const enableLint = process.env["NODE_ENV"] !== "production";

module.exports = {
  assetsDir: "static",
  outputDir,

  productionSourceMap: false,

  lintOnSave: enableLint,

  pluginOptions: {
    lintStyleOnBuild: enableLint,
    stylelint: {
      fix: false,
    },

    i18n: {
      fallbackLocale: "en",
      localeDir: "locales",
      enableInSFC: true,
    }
  },

  configureWebpack: {
    plugins: [
      new MonacoWebpackPlugin({
        languages: ["sql", "javascript", "json", "html"],
      }),
      new IgnorePlugin(/^\.\/locale$/, /moment$/),
      ...(analyzeBundle ? [new BundleAnalyzerPlugin()] : []),
    ],
  },

  chainWebpack: config => {
    config.module
      .rule("vue")
      .use("vue-loader")
      .tap(options => {
          options.compiler = require("vue-template-babel-compiler");
          return options;
      });
    /* Manually set prefetched chunks */
    config.plugins.delete("prefetch");
    config.plugin("define").tap(
      ([ definitions, ...rest ]) => [{ ...definitions, ...defaults, ...buildConfig }, ...rest]
    );
    config.module
      .rule("i18n")
      .resourceQuery(/blockType=i18n/)
      .type("javascript/auto")
      .use("i18n")
        .loader("@intlify/vue-i18n-loader")
        .end();
  },

  css: {
    loaderOptions: {
      sass: {
        additionalData: `@import "~@/styles/mixins.scss";`
      }
    }
  },
}

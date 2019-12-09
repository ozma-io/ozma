const { IgnorePlugin, DefinePlugin } = require("webpack");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");

const defaultConfig = require("./config/development.json");
const configName = process.env["CONFIG"] || process.env["NODE_ENV"];
let config;
try {
    config = require(`./config/${configName}.json`);
} catch (e) {
    config = defaultConfig;
}
const defaults = {
    "__DISABLE_AUTH__": false,
    "__API_AUTH_URL__": undefined,
    "__API_AUTH_URL_BASE__": undefined,
    "__AUTH_CLIENT_ID__": undefined,
};

const analyzeBundle = process.env["ANALYZE"];
const outputDir = process.env["OUTDIR"] || "dist";

module.exports = {
    assetsDir: "static",
    outputDir,

    productionSourceMap: false,

    pluginOptions: {
        i18n: {
            fallbackLocale: "en",
            localeDir: "locales",
            enableInSFC: true,
        }
    },

    configureWebpack: {
        plugins: [
            new MonacoWebpackPlugin(),
            new IgnorePlugin(/^\.\/locale$/, /moment$/),
            ...(analyzeBundle ? [new BundleAnalyzerPlugin()] : []),
        ]
    },

    chainWebpack: webpackConfig => {
        webpackConfig.plugin("define").tap(
            ([ definitions, ...rest ]) => [{ ...definitions, ...defaults, ...config }, ...rest]
        );
    },
}

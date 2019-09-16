const { IgnorePlugin, DefinePlugin } = require("webpack");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

const defaultConfig = require("./config/development.json");
const configName = process.env["CONFIG"] || process.env["NODE_ENV"];
let config;
try {
    config = require(`./config/${configName}.json`);
} catch (e) {
    config = defaultConfig;
}

module.exports = {
    assetsDir: "static",

    productionSourceMap: false,

    pluginOptions: {
        i18n: {
            fallbackLocale: "en",
            localeDir: "locales",
            enableInSFC: true
        }
    },

    configureWebpack: {
        plugins: [
            new IgnorePlugin(/^\.\/locale$/, /moment$/),
            //new BundleAnalyzerPlugin()
        ]
    },

    chainWebpack: webpackConfig => {
      webpackConfig.plugin("define").tap(
        ([ definitions, ...rest ]) => [{ ...definitions, ...config}, ...rest]
      );
    },
}

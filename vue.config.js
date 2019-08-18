const { IgnorePlugin } = require("webpack")
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

module.exports = {
    assetsDir: 'static',
    pluginOptions: {
        i18n: {
            fallbackLocale: 'en',
            localeDir: 'locales',
            enableInSFC: true
        }
    },
    configureWebpack: {
        plugins: [
            new IgnorePlugin(/^\.\/locale$/, /moment$/)
            //new BundleAnalyzerPlugin()
        ]
    }
}

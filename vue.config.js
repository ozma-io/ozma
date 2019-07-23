const webpack = require("webpack")

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
            new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/)
        ]
    }
}

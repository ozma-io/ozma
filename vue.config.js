const webpack = require("webpack")

module.exports = {
    pluginOptions: {
        i18n: {
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

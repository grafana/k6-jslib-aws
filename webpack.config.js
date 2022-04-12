var webpack = require('webpack')
var path = require('path')

const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

module.exports = {
    mode: 'production',
    entry: './src/index.js',
    output: {
        filename: 'aws.min.js',
        path: path.resolve(__dirname, 'build'),
        libraryTarget: 'commonjs',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
            },
        ],
    },
    stats: {
        colors: true,
    },
    target: 'web',
    externals: /^(k6|https?\:\/\/)(\/.*)?/,
    devtool: 'source-map',
    optimization: {
        minimizer: [
            new UglifyJsPlugin({
                uglifyOptions: {
                    output: {
                        comments: false,
                    },
                },
            }),
        ],
    },
}

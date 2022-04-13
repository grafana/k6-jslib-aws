const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const GlobEntries = require('webpack-glob-entries')
const TerserPlugin = require('terser-webpack-plugin')

module.exports = {
    mode: 'production',
    // entry: './src/index.js',
    entry: GlobEntries('./src/index.ts'),
    output: {
        path: path.resolve(__dirname, 'build'),
        libraryTarget: 'commonjs',
        filename: 'aws.min.js',
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'babel-loader',
                exclude: /node_modules/,
            },
        ],
    },
    target: 'web',
    externals: /^(k6|https?\:\/\/)(\/.*)?/,
    // Generate map files for compiled scripts
    devtool: 'source-map',
    stats: {
        colors: true,
    },
    plugins: [
        new CleanWebpackPlugin(),

        // Copy assets to the destination folder
        // see `src/post-file-test.ts` for an test example using an asset
        new CopyPlugin({
            patterns: [
                {
                    from: path.resolve(__dirname, 'assets'),
                    noErrorOnMissing: true,
                },
            ],
        }),
    ],
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin()],
    },
}

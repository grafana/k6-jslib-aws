const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')

module.exports = {
    mode: 'production',
    entry: {
        // Bundle builds: contain the whole set of library clients and features
        aws: path.resolve(__dirname, './src/index.ts'),
        // jslib.k6.io expects us to expose an `index.js` file
        index: path.resolve(__dirname, './src/index.ts'),

        // Service clients
        s3: path.resolve(__dirname, './src/s3.ts'),
        'secrets-manager': path.resolve(__dirname, './src/secrets-manager.ts'),
        sqs: path.resolve(__dirname, 'src/sqs.ts'),
        ssm: path.resolve(__dirname, 'src/ssm.ts'),
        kms: path.resolve(__dirname, 'src/kms.ts'),
        kinesis: path.resolve(__dirname, 'src/kinesis.ts'),

        // AWS signature v4
        signature: path.resolve(__dirname, 'src/signature.ts'),
    },
    output: {
        path: path.resolve(__dirname, 'build'),
        libraryTarget: 'commonjs',
        filename: '[name].js',
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

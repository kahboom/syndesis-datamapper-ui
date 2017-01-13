'use strict';

const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');

module.exports = function (env) {

  const outPath = './dist';

  let config = {
    resolve: {
      extensions: ['.ts', '.js'],
    },
    entry: './src/index.ts',
    output: {
      library: 'datamapper-ui',
      libraryTarget: 'umd',
      path: outPath,
      pathinfo: true,
      filename: 'index.js'
    },
    externals: nodeExternals(),
    devtool: 'source-map',
    module: {
      loaders: [
        {
          test: /\.ts$/,
          loaders: ['awesome-typescript-loader?tsconfig=config/tsconfig.json', 'angular2-template-loader', 'angular2-router-loader'],
          exclude: [/\.(spec|e2e)\.ts$/, /node_modules/]
        },
        { 
          test: /\.(html|css)$/, 
          loader: 'raw-loader'
        }
      ]
    },
    plugins: [
      /*
      new webpack.optimize.UglifyJsPlugin({
        minimize: false,
        beautify: true,
        sourceMap: false,
        mangle: false,
        compress: false
      }),*/
      new webpack.ContextReplacementPlugin(
        /angular(\\|\/)core(\\|\/)(esm(\\|\/)src|src)(\\|\/)linker/,
        __dirname
      )
    ]
  };

  return config;
};

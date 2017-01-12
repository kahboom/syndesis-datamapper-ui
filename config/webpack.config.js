'use strict';

const webpack = require('webpack');
const path = require('path');
const packageJson = require('../package.json');

module.exports = function (env) {

  const outPath = './dist';

  let config = {
    target: 'web',
    cache: true,
    resolve: {
      extensions: ['.ts', '.js'],
      modules: ['node_modules']
    },
    entry: './src/index.ts',
    output: {
      library: '',
      libraryTarget: 'commonjs',
      path: outPath,
      pathinfo: true,
      filename: 'index.js'
    },
    externals: {
      '@angular/common': {
        'umd': '@angular/common',
        'commonjs': '@angular/common'
      },
      '@angular/core': {
        'umd': '@angular/core',
        'commonjs': '@angular/core'
      },
      '@angular/forms': {
        'umd': '@angular/forms',
        'commonjs': '@angular/forms'
      },
      '@angular/http': {
        'umd': '@angular/http',
        'commonjs': '@angular/http'
      },
      '@angular/router': {
        'umd': '@angular/router',
        'commonjs': '@angular/router'
      },
      'zone': {
        'umd': 'zone',
        'commonjs': 'zone'
      }
    },
    plugins: [
      new webpack.ContextReplacementPlugin(
        /angular(\\|\/)core(\\|\/)(esm(\\|\/)src|src)(\\|\/)linker/,
        __dirname
      ),
      new webpack.DefinePlugin({
        PRODUCTION: false
      }),
      new webpack.NoErrorsPlugin()
    ],
    module: {
      loaders: [
        {
          test: /\.ts$/,
          loaders: ['awesome-typescript-loader?tsconfig=config/tsconfig.json', 'angular2-template-loader'],
          exclude: [/\.(spec|e2e)\.ts$/]
        },
        { 
          test: /\.(html|css)$/, 
          loader: 'raw-loader'
        }
      ]
    }

  };

  return config;
};

const {BundleAnalyzerPlugin} = require("webpack-bundle-analyzer");
const path = require('path')
const fs = require('fs')
const cracoBabelLoader = require('craco-babel-loader')

// Handle relative paths to sibling packages
const appDirectory = fs.realpathSync(process.cwd())
const resolvePackage = relativePath => path.resolve(appDirectory, relativePath)



const {env: {REACT_APP_INTERACTIVE_ANALYZE}} = process;

// const analyzerMode = REACT_APP_INTERACTIVE_ANALYZE
//   ? "server"
//   : "json"

const webpackPlugins = [
  new BundleAnalyzerPlugin({ analyzerMode:'server' })
];

const includes = [
  'fizbin',
  'th-utils'
].map(fn=>resolvePackage(`../../libs/${fn}`));

module.exports = {
  webpack: {
    plugins: webpackPlugins,
    alias: {
      "@lib": path.resolve(__dirname, "src/lib/")
    }
  },
  babel: {
    plugins: [
      {
        plugin: cracoBabelLoader,
        options: {
          includes,
        },
      },
      "babel-plugin-transform-typescript-metadata",
      ["@babel/plugin-proposal-decorators", {legacy: true}],
      ["@babel/plugin-proposal-class-properties", { "loose": true }],
    ]
  }
}
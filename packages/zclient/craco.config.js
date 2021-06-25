const {BundleAnalyzerPlugin} = require("webpack-bundle-analyzer");

const {env: {REACT_APP_INTERACTIVE_ANALYZE}} = process;

// const analyzerMode = REACT_APP_INTERACTIVE_ANALYZE
//   ? "server"
//   : "json"

const webpackPlugins = [
  new BundleAnalyzerPlugin({ analyzerMode:'server' })
];


module.exports = {
  webpack: {
    plugins: webpackPlugins
  },
  babel: {
    plugins: [
      "babel-plugin-transform-typescript-metadata",
      ["@babel/plugin-proposal-decorators", {legacy: true}],
      ["@babel/plugin-proposal-class-properties", { "loose": true }],
    ]
  }
}
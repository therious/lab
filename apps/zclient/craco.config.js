const {BundleAnalyzerPlugin} = require("webpack-bundle-analyzer");
const path = require('path')
const {getLoader, loaderByName} = require('@craco/craco');


const {env: {REACT_APP_INTERACTIVE_ANALYZE}} = process;

// const analyzerMode = REACT_APP_INTERACTIVE_ANALYZE
//   ? "server"
//   : "json"

const webpackPlugins = [
  // new BundleAnalyzerPlugin({ analyzerMode:'server' })
];


const packageDirs = ['libs', 'cmps'];

const packages = packageDirs.map(d=>path.join(__dirname, `../../${d}`));

const guaranteedArray = v => Array.isArray(v)?v:[v];

const configure = (webpackConfig /*,arg*/) => {
  const {isFound,match} = getLoader(webpackConfig, loaderByName('babel-loader'));
  if(isFound) {
    const include = guaranteedArray(match.loader.include);
    match.loader.include = include.concat(packages);
  }
  return webpackConfig;
};

// end new stuff

module.exports = {
  webpack: {
    configure,
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
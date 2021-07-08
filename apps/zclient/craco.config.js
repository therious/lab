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

// https://github.com/typescript-eslint/typescript-eslint/blob/master/.eslintrc.js
const eslintConfig = {
  rules: {
    //
    // our plugin :D
    //

    '@typescript-eslint/ban-ts-comment': [
      'error',
      {
        'ts-expect-error': 'allow-with-description',
        'ts-ignore': true,
        'ts-nocheck': true,
        'ts-check': false,
        minimumDescriptionLength: 5,
      },
    ],
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-empty-function': [
      'error',
      {allow: ['arrowFunctions']},
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    // '@typescript-eslint/prefer-nullish-coalescing': 'error',
    // '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/unbound-method': 'off',
    '@typescript-eslint/prefer-as-const': 'error',
    '@typescript-eslint/no-unused-vars': 'off',

    // TODO - enable these new recommended rules
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/restrict-template-expressions': 'off',
    // TODO - enable this
    '@typescript-eslint/naming-convention': 'off',

    //
    // Internal repo rules
    //

    // '@typescript-eslint/internal/no-poorly-typed-ts-props': 'error',
    // '@typescript-eslint/internal/no-typescript-default-import': 'error',
    // '@typescript-eslint/internal/prefer-ast-types-enum': 'error',

    //
    // eslint base
    //

    curly: 'off',
    'no-mixed-operators': 'error',
    'no-console': 'off',
    'no-process-exit': 'error',
    'no-fallthrough': 'off',

    //
    // eslint-plugin-eslint-comment
    //

    // require a eslint-enable comment for every eslint-disable comment
    // 'eslint-comments/disable-enable-pair': [
    //   'error',
    //   {
    //     allowWholeFile: true,
    //   },
    // ],
    // disallow a eslint-enable comment for multiple eslint-disable comments
    // 'eslint-comments/no-aggregating-enable': 'error',
    // disallow duplicate eslint-disable comments
    // 'eslint-comments/no-duplicate-disable': 'error',
    // disallow eslint-disable comments without rule names
    // 'eslint-comments/no-unlimited-disable': 'error',
    // disallow unused eslint-disable comments
    // 'eslint-comments/no-unused-disable': 'error',
    // disallow unused eslint-enable comments
    // 'eslint-comments/no-unused-enable': 'error',
    // disallow ESLint directive-comments
    // 'eslint-comments/no-use': [
    //   'error',
    //   {
    //     allow: [
    //       'eslint-disable',
    //       'eslint-disable-line',
    //       'eslint-disable-next-line',
    //       'eslint-enable',
    //     ],
    //   },
    // ],

    //
    // eslint-plugin-import
    //

    // disallow non-import statements appearing before import statements
    'import/first': 'error',
    // Require a newline after the last import/require in a group
    'import/newline-after-import': 'error',
    // Forbid import of modules using absolute paths
    'import/no-absolute-path': 'error',
    // disallow AMD require/define
    'import/no-amd': 'error',
    // forbid default exports
    'import/no-default-export': 'off',
    // Forbid the use of extraneous packages
    'import/no-extraneous-dependencies': [
      'warn',
      {
        devDependencies: true,
        peerDependencies: true,
        optionalDependencies: false,
      },
    ],
    // Forbid mutable exports
    'import/no-mutable-exports': 'error',
    // Prevent importing the default as if it were named
    'import/no-named-default': 'error',
    // Prohibit named exports
    'import/no-named-export': 'off', // we want everything to be a named export
    // Forbid a module from importing itself
    'import/no-self-import': 'error',
    // Require modules with a single export to use a default export
    'import/prefer-default-export': 'off', // we want everything to be named

}
};




// end new stuff
//https://github.com/gsoft-inc/craco/blob/master/packages/craco/README.md
//https://eslint.org/docs/user-guide/configuring
module.exports = {
  // uncommenting the eslint section can cause failures, but does not prevent warnings in react for same
  // eslint: {
  //   enable:true,
  //   mode: 'extends',
  //   configure: eslintConfig
  // },
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
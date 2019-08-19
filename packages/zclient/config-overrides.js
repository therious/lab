/* this config is part of react-app-rewired allowing us to tweak webpack output without ejecting */

const analyze = require('react-app-rewire-webpack-bundle-analyzer');

module.exports = function overrides(config, env) {


    const o = env !== 'production'? config: analyze(
        config,env,
        {analyzerMode:'static', reportFilename:'report.html'}
        );

    return {
        ...o,
        node: {fs:'empty'}, // for stuff like exceljs to work
        devtool: 'inline-source-map',
        stats: {...o.stats, builtAt:true, timings:true},
        optimization: {minimize:false}
    }

};


'use strict';

const config = require('./config');

const print = () /*: void */ => {
    console.error('modes:');

    for (const i in config.modes) {
        console.error('    ' + i + '\t' + config.modes[i][0]);
    }

    console.error('');
    console.error('args:');

    for (const i in config.args) {
        console.error('    ' + i + '\t' + config.args[i][1]);

        if (config.args[i][2]) {
            console.error('        (default: ' + config.args[i][2] + ')');
        }
    }
};

module.exports = {
    print: print,
};

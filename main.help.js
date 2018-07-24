'use strict';

const config = require('./config');

const print = () /*: void */ => {
    console.error('modes:');

    for (const i in config.modes) {
        for (
            let j /*: number */ = 0;
            j < config.modes[i].length;
            j += 1
        ) {
            if (config.modes[i][j][0] === '_description') {
                console.error('    ' + i + '\t' + config.modes[i][j][1]);

                break;
            }
        }
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

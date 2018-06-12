'use strict';

const config = require('./config');

const init = () /*: any */ => {
    const args = {};

    for (const i in config.args) {
        if (config.args[i][2]) {
            args[i] = config.args[i][2];
        }
    }

    return args;
};

const add = (
    args /*: any */,
    key /*: string */,
    value /*: string */
) /*: void */ => {
    switch (config.args[key][0]) {
        case 'number':
            args[key] = parseInt(value, 10);

            break;
        case 'string':
            args[key] = value;

            break;
        default:
            throw Error();
    }
};

module.exports = {
    init: init,
    add: add,
};

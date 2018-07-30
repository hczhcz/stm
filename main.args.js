'use strict';

const config = require('./config');

const init = () /*: Args */ => {
    const args /*: Args */ = {};

    for (const i in config.args) {
        if (config.args[i][2]) {
            args[i] = config.args[i][2];
        }
    }

    return args;
};

const wait = (
    key /*: string */
) /*: string | null */ => {
    for (const i in config.args) {
        if (i === key) {
            return i;
        }
    }

    return null;
};

const add = (
    args /*: Args */,
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
    wait: wait,
    add: add,
};

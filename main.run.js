'use strict';

const config = require('./config');

const runMode = (
    mode /*: string */,
    args /*: Args */
) /*: void */ => {
    console.log('mode ' + mode);

    const configList = config.modes[mode];
    const passList = [];

    for (let i /*: number */ = 1; i < configList.length; i += 1) {
        const nextIndex = i;
        const argList = [(
            info /*: Info */,
            callback /*: Pass */
        ) /*: void */ => {
            return passList[nextIndex](info, callback);
        }];

        for (let j /*: number */ = 1; j < configList[i].length; j += 1) {
            if (
                typeof configList[i][j] === 'string'
                && configList[i][j][0] === '-'
            ) {
                if (args[configList[i][j]]) {
                    console.log(
                        'arg ' + configList[i][j]
                            + ' ' + args[configList[i][j]]
                    );

                    argList.push(args[configList[i][j]]);
                } else {
                    console.error(
                        'missing arg ' + configList[i][j]
                    );

                    return;
                }
            } else {
                argList.push(configList[i][j]);
            }
        }

        passList.push(require('./pass.' + configList[i][0])(...argList));
    }

    passList.push(passList[0]);
};

module.exports = {
    runMode: runMode,
};

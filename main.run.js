'use strict';

const config = require('./config');

const runMode = (
    mode /*: string */,
    args /*: Args */
) /*: void */ => {
    console.log('mode ' + mode);

    const passList /*: Array<Pass> */ = [];

    // TODO: remove extra '(' ')' in type notation
    const makeNextPass = (
        index /*: number */
    ) /*: ((Info, Pass) => BufferGenerator) */ => {
        return (
            info /*: Info */
        ) /*: BufferGenerator */ => {
            return passList[index](info);
        };
    };

    const loadMode = (
        modeInfo /*: Array<PassParams> */
    ) /*: boolean */ => {
        for (
            let i /*: number */ = 0;
            i < modeInfo.length;
            i += 1
        ) {
            const passArgs /*: PassArgs */ = [
                makeNextPass(passList.length + 1),
            ];

            for (
                let j /*: number */ = 1;
                j < modeInfo[i].length;
                j += 1
            ) {
                if (
                    typeof modeInfo[i][j] === 'string'
                    && modeInfo[i][j][0] === '-'
                ) {
                    if (args[modeInfo[i][j]]) {
                        console.log(
                            'arg ' + modeInfo[i][j]
                                + ' ' + args[modeInfo[i][j]]
                        );

                        passArgs.push(args[modeInfo[i][j]]);
                    } else {
                        console.error(
                            'missing arg ' + modeInfo[i][j]
                        );

                        return false;
                    }
                } else {
                    passArgs.push(modeInfo[i][j]);
                }
            }

            if (modeInfo[i][0] === '_include') {
                loadMode(config.modes[passArgs[1]]);
            } else if (modeInfo[i][0] === '_description') {
                // ignore
            } else {
                passList.push(require('./pass.' + modeInfo[i][0])(...passArgs));
            }
        }

        return true;
    };

    if (loadMode(config.modes[mode])) {
        // without this step, it will generates error

        passList.push(passList[0]);
    }
};

const run = (
    mode /*: string */,
    args /*: Args */
) /*: void */ => {
    for (const i in config.modes) {
        if (i === mode) {
            runMode(i, args);
        }
    }
};

module.exports = {
    run: run,
};

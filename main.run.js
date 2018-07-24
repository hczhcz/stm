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

    const addPass = (
        modeInfo /*: Array<ModeInfo> */
    ) /*: boolean */ => {
        const argList /*: ModeInfo */ = [
            makeNextPass(passList.length + 1),
        ];

        for (let i /*: number */ = 1; i < modeInfo.length; i += 1) {
            if (
                typeof modeInfo[i] === 'string'
                && modeInfo[i][0] === '-'
            ) {
                if (args[modeInfo[i]]) {
                    console.log(
                        'arg ' + modeInfo[i]
                            + ' ' + args[modeInfo[i]]
                    );

                    argList.push(args[modeInfo[i]]);
                } else {
                    console.error(
                        'missing arg ' + modeInfo[i]
                    );

                    return false;
                }
            } else {
                argList.push(modeInfo[i]);
            }
        }

        passList.push(require('./pass.' + modeInfo[0])(...argList));

        return true;
    };

    for (let i /*: number */ = 1; i < config.modes[mode].length; i += 1) {
        if (!addPass(config.modes[mode][i])) {
            return;
        }
    }

    passList.push(passList[0]);
};

module.exports = {
    runMode: runMode,
};

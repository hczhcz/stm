'use strict';

const config = require('./config');
const mainArgs = require('./main.args');
const mainRun = require('./main.run');
const mainHelp = require('./main.help');

process.on('uncaughtException', (
    err /*: error */
) /*: void */ => {
    if (config.log.globalError) {
        console.error('global error');
    }

    if (config.log.globalErrorDetail) {
        console.error(err);
    }
});

const args /*: Args */ = mainArgs.init();
let key /*: string | null */ = null;

for (
    let i /*: number */ = 2;
    i < process.argv.length;
    i += 1
) {
    if (process.argv[i][0] === '-') {
        if (process.argv[i] === '-h' || process.argv[i] === '--help') {
            mainHelp.print();
        } else {
            key = mainArgs.wait(process.argv[i]);
        }
    } else if (key === null) {
        mainRun.run(process.argv[i], args);
    } else {
        mainArgs.add(args, key, process.argv[i]);

        key = null;
    }
}

'use strict';

const config = require('./config');
const mainArgs = require('./main.args');
const mainRun = require('./main.run');
const mainHelp = require('./main.help');

process.on('uncaughtException', (err) => {
    console.error('global error');
    console.error(err);
});

const args = mainArgs.init();
let key = null;

for (let i = 2; i < process.argv.length; i += 1) {
    if (process.argv[i][0] === '-') {
        if (process.argv[i] === '-h' || process.argv[i] === '--help') {
            mainHelp.print();

            break;
        }

        for (const j in config.args) {
            if (j === process.argv[i]) {
                key = j;
            }
        }
    } else if (key === null) {
        for (const j in config.modes) {
            if (j === process.argv[i]) {
                mainRun.runMode(j, args);
            }
        }
    } else {
        mainArgs.add(args, key, process.argv[i]);

        key = null;
    }
}

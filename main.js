'use strict';

const config = require('./config');

process.on('uncaughtException', (err) => {
    console.error('global error');
    console.error(err);
});

for (let i = 2; i < process.argv.length; i += 1) {
    const configList = config[process.argv[i]];
    const passList = [];

    for (let j = 0; j < configList.length; j += 1) {
        passList.push(require('./pass.' + configList[j][0])(...configList[j].slice(1)));
    }

    passList.push(passList[0]);

    for (let j = 1; j < passList.length; j += 1) {
        passList[j - 1].next = passList[j].open;
    }
}

'use strict';

const config = require('./config');

process.on('uncaughtException', (err) => {
    console.error('global error');
    console.error(err);
});

const configList = config[process.argv[2]];
const passList = [];

for (let i = 0; i < configList.length; i += 1) {
    passList.push(require('./pass.' + configList[i][0]).apply(null, configList[i].slice(1)));
}

passList.push(passList[0]);

for (let i = 1; i < passList.length; i += 1) {
    passList[i - 1].next = passList[i].open;
}

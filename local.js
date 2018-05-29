'use strict';

const passLocal = require('./pass.local')(2333, 2333);
const passProxy = require('./pass.proxy')();

process.on('uncaughtException', (err) => {
    console.error('global error');
    console.error(err);
});

passLocal.pipe(passProxy).pipe(passLocal);

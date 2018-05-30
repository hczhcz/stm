'use strict';

const passSocks5 = require('./pass.socks5')(2333, 2333);
const passProxy = require('./pass.proxy')();

process.on('uncaughtException', (err) => {
    console.error('global error');
    console.error(err);
});

passSocks5.pipe(passProxy);
passProxy.pipe(passSocks5);

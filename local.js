'use strict';

const passSocks5 = require('./pass.socks5')(2333, 2333);
const passCryptoEncrypt = require('./pass.crypto.encrypt')('fuckGFW');
const passCryptoDecrypt = require('./pass.crypto.decrypt')('fuckGFW');
const passCryptoEncrypt2 = require('./pass.crypto.encrypt')('fuckGFW');
const passCryptoDecrypt2 = require('./pass.crypto.decrypt')('fuckGFW');
const passProxy = require('./pass.proxy')();

process.on('uncaughtException', (err) => {
    console.error('global error');
    console.error(err);
});

passSocks5.pipe(passCryptoEncrypt).pipe(passCryptoDecrypt).pipe(passProxy);
passProxy.pipe(passCryptoEncrypt2).pipe(passCryptoDecrypt2).pipe(passSocks5);

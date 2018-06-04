'use strict';

const passSocks5 = require('./pass.socks5')(2333, 2333);
const passCryptoEncrypt = require('./pass.crypto.encrypt')('aes-256-cfb', 'fuckGFW');
const passCryptoDecrypt = require('./pass.crypto.decrypt')('aes-256-cfb', 'fuckGFW');
const passSegmentation = require('./pass.segmentation')();
const passCryptoEncrypt2 = require('./pass.crypto.encrypt')('aes-256-cfb', 'fuckGFW2');
const passCryptoDecrypt2 = require('./pass.crypto.decrypt')('aes-256-cfb', 'fuckGFW2');
const passSegmentation2 = require('./pass.segmentation')();
const passProxy = require('./pass.proxy')();

process.on('uncaughtException', (err) => {
    console.error('global error');
    console.error(err);
});

passSocks5.pipe(passCryptoEncrypt).pipe(passCryptoDecrypt).pipe(passSegmentation).pipe(passProxy);
passProxy.pipe(passCryptoEncrypt2).pipe(passCryptoDecrypt2).pipe(passSegmentation2).pipe(passSocks5);

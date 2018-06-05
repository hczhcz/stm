'use strict';

const passSocks5 = require('./pass.socks5')(2333);
const passZlibCompress = require('./pass.zlib.compress')(2);
const passCryptoEncrypt = require('./pass.crypto.encrypt')('aes-256-cfb', 'fuckGFW');
const passTcpClient = require('./pass.tcp.client')('127.0.0.1', 2334);
const passCryptoDecrypt = require('./pass.crypto.decrypt')('aes-256-cfb', 'fuckGFW2');
const passZlibDecompress = require('./pass.zlib.decompress')(2);
const passSegmentation = require('./pass.segmentation')();

process.on('uncaughtException', (err) => {
    console.error('global error');
    console.error(err);
});

passSocks5.pipe(passZlibCompress).pipe(passCryptoEncrypt).pipe(passTcpClient);
passTcpClient.pipe(passCryptoDecrypt).pipe(passZlibDecompress).pipe(passSegmentation).pipe(passSocks5);

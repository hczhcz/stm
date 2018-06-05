'use strict';

const passTcpServer = require('./pass.tcp.server')(2334);
const passCryptoDecrypt = require('./pass.crypto.decrypt')('aes-256-cfb', 'fuckGFW');
const passZlibDecompress = require('./pass.zlib.decompress')(2);
const passSegmentation = require('./pass.segmentation')();
const passProxy = require('./pass.proxy')();
const passZlibCompress = require('./pass.zlib.compress')(2);
const passCryptoEncrypt = require('./pass.crypto.encrypt')('aes-256-cfb', 'fuckGFW2');

process.on('uncaughtException', (err) => {
    console.error('global error');
    console.error(err);
});

passTcpServer.pipe(passCryptoDecrypt).pipe(passZlibDecompress).pipe(passSegmentation).pipe(passProxy);
passProxy.pipe(passZlibCompress).pipe(passCryptoEncrypt).pipe(passTcpServer);

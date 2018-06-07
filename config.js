'use strict';

module.exports = {
    local: [
        ['socks5', 2333],
        ['zlib.compress', 2],
        ['crypto.encrypt', 'aes-256-cfb', 32, 16, 'fuckGFW'],
        ['tcp.client', '127.0.0.1', 2334],
        ['crypto.decrypt', 'aes-256-cfb', 32, 16, 'fuckGFW2'],
        ['zlib.decompress'],
        ['segmentation'],
    ],

    server: [
        ['tcp.server', 2334],
        ['crypto.decrypt', 'aes-256-cfb', 32, 16, 'fuckGFW'],
        ['zlib.decompress'],
        ['segmentation'],
        ['proxy'],
        ['zlib.compress', 2],
        ['crypto.encrypt', 'aes-256-cfb', 32, 16, 'fuckGFW2'],
    ],
};

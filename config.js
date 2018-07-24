'use strict';

module.exports = {
    modes: {
        _encode: [
            ['zlib.compress', 2],
            ['crypto.encrypt', '-m', 32, '-k'],
        ],

        _decode: [
            ['crypto.decrypt', '-m', 32, '-k', true],
            ['zlib.decompress'],
            ['segmentation'],
        ],

        server: [
            ['_description', 'Start remote server'],
            ['tcp.server', '-p'],
            ['_include', '_decode'],
            ['proxy', false],
            ['_include', '_encode'],
        ],

        socks5: [
            ['_description', 'Start local Socks5 proxy server'],
            ['socks5', '-ls', false],
            ['_include', '_encode'],
            ['tcp.client', '-s', '-p'],
            ['_include', '_decode'],
        ],

        http: [
            ['_description', 'Start local HTTP proxy server'],
            ['http', '-lh', false],
            ['_include', '_encode'],
            ['tcp.client', '-s', '-p'],
            ['_include', '_decode'],
        ],

        natdemo: [
            ['_description', 'Start local NAT demo'],
            ['nat', [[8080, '::1', '-ls']], [[8080, '::1', '-ls']]],
            ['_include', '_encode'],
            ['tcp.client', '-s', '-p'],
            ['_include', '_decode'],
        ],
    },

    args: {
        '-s': ['string', 'Address of remote server', '127.0.0.1'],
        '-p': ['number', 'Port of remote server'],
        '-ls': ['number', 'Port of local Socks5 proxy server'],
        '-lh': ['number', 'Port of local HTTP proxy server'],
        '-m': ['string', 'Encrypt method', 'aes-256-cfb'],
        '-k': ['string', 'Encrypt password'],
    },

    log: {
        globalError: true,
        globalErrorDetail: false,
        networkClose: false,
        networkError: true,
        networkErrorDetail: false,
        proxyTransfer: false,
        proxyStep: false,
        proxyError: true,
    },
};

'use strict';

module.exports = {
    modes: {
        _encode: [
            ['buffer', 20],
            ['zlib.compress', 2],
            ['crypto.encrypt', '-m', 32, '-k'],
        ],

        _decode: [
            ['crypto.decrypt', '-m', 32, '-k', true],
            ['zlib.decompress'],
            ['segmentation'],
        ],

        _local: [
            ['_include', '_encode'],
            ['tcp.client', '-s', '-p'],
            ['_include', '_decode'],
        ],

        server: [
            ['_description', 'Start remote server'],
            ['tcp.server', '-p'],
            ['_include', '_decode'],
            ['proxy', false, 60000],
            ['_include', '_encode'],
        ],

        socks5: [
            ['_description', 'Start local Socks5 proxy server'],
            ['socks5', '-ls', false, 60000],
            ['_include', '_local'],
        ],

        http: [
            ['_description', 'Start local HTTP proxy server'],
            ['http', '-lh', false, 60000],
            ['_include', '_local'],
        ],

        tcpnat: [
            ['_description', 'Start local TCP NAT'],
            ['nat.tcp', [['-nl', '-ns', '-np']], 60000],
            ['_include', '_local'],
        ],

        udpnat: [
            ['_description', 'Start local UDP NAT'],
            ['nat.udp', [['-nl', '-ns', '-np']], 3000],
            ['_include', '_local'],
        ],
    },

    args: {
        '-s': ['string', 'Address of remote server', '127.0.0.1'],
        '-p': ['number', 'Port of remote server'],
        '-ls': ['number', 'Port of local Socks5 proxy server'],
        '-lh': ['number', 'Port of local HTTP proxy server'],
        '-ns': ['string', 'Address of NAT target'],
        '-np': ['number', 'Port of NAT target'],
        '-nl': ['number', 'Port of NAT source'],
        '-m': ['string', 'Encryption method', 'aes-256-cfb'],
        '-k': ['string', 'Password'],
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

'use strict';

module.exports = {
    modes: {
        socks5: [
            'Start local Socks5 proxy server',
            ['socks5', '-ls', false],
            ['zlib.compress', 2],
            ['crypto.encrypt', '-m', 32, '-k'],
            ['tcp.client', '-s', '-p'],
            ['crypto.decrypt', '-m', 32, '-k', true],
            ['zlib.decompress'],
            ['segmentation'],
        ],

        http: [
            'Start local HTTP proxy server',
            ['http', '-lh'],
            ['zlib.compress', 2],
            ['crypto.encrypt', '-m', 32, '-k'],
            ['tcp.client', '-s', '-p'],
            ['crypto.decrypt', '-m', 32, '-k', true],
            ['zlib.decompress'],
            ['segmentation'],
        ],

        server: [
            'Start remote server',
            ['tcp.server', '-p'],
            ['crypto.decrypt', '-m', 32, '-k', true],
            ['zlib.decompress'],
            ['segmentation'],
            ['proxy', false],
            ['zlib.compress', 2],
            ['crypto.encrypt', '-m', 32, '-k'],
        ],

        natdemo: [
            'Start local NAT demo',
            ['nat', [[8080, '::1', '-ls']], [[8080, '::1', '-ls']]],
            ['zlib.compress', 2],
            ['crypto.encrypt', '-m', 32, '-k'],
            ['tcp.client', '-s', '-p'],
            ['crypto.decrypt', '-m', 32, '-k', true],
            ['zlib.decompress'],
            ['segmentation'],
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
        step: false,
        transfer: false,
        network: false,
    },
};

'use strict';

const net = require('net');

const config = require('./config');

module.exports = (
    address /*: string */,
    port /*: number */
) /*: Pass */ => {
    const self = {
        next: null,

        open: (info, callback) => {
            if (!self.next) {
                // non-null assertion

                throw Error();
            }

            self.next(info, (send, close) => {
                const socket = net.createConnection({
                    host: address,
                    port: port,
                    allowHalfOpen: true,
                }).once('connect', () => {
                    callback((data) => {
                        // send

                        socket.write(data);
                    }, () => {
                        // close

                        socket.destroy();
                    });
                }).on('data', (chunk) => {
                    send(chunk);
                }).once('close', () => {
                    close();
                }).on('error', (err) => {
                    console.error(info.id + ' tcp error');

                    if (config.log.network) {
                        console.error(err);
                    }
                });
            });
        },
    };

    return self;
};

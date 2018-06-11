'use strict';

const net = require('net');

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
                const socket = net.createConnection(port, address);

                socket.once('connect', () => {
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
                });
            });
        },
    };

    return self;
};

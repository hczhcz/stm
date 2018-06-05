'use strict';

const net = require('net');

module.exports = (address, port) => {
    let next = null;

    return {
        pipe: (piped) => {
            next = piped.open;

            return piped;
        },

        open: (info, callback) => {
            next(info, (send, close) => {
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
};

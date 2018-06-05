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
                const socket = net.createConnection(address, port);

                socket.on('data', (chunk) => {
                    send(chunk);
                }).once('close', () => {
                    close();
                });

                callback((data) => {
                    // send

                    socket.write(data);
                }, () => {
                    // close

                    socket.destroy();
                });
            });
        },
    };
};

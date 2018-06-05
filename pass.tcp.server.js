'use strict';

const net = require('net');

module.exports = (port) => {
    return {
        pipe: (piped) => {
            net.createServer({
                allowHalfOpen: true,
            }).on('connection', (socket) => {
                socket.pause();

                const info = {
                    socket: socket,
                };

                piped.open(info, (send, close) => {
                    socket.on('data', (chunk) => {
                        send(chunk);
                    }).on('close', () => {
                        close();
                    }).resume();
                });
            }).listen(port);

            return piped;
        },

        open: (info, callback) => {
            callback((data) => {
                // send

                info.socket.write(data);
            }, () => {
                // close

                info.socket.destroy();
            });
        },
    };
};

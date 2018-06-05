'use strict';

const net = require('net');

module.exports = (port) => {
    return {
        pipe: (piped) => {
            net.createServer({
                allowHalfOpen: true,
            }).on('connection', (socket) => {
                socket.pause();

                piped.open((send, close) => {
                    socket.on('data', (chunk) => {
                        send(chunk);
                    }).on('end', () => {
                        close();
                    }).resume();
                });
            }).listen(port);
        },

        open: (callback) => {
            callback((data) => {
                // send

                socket.write(data);
            }, () => {
                // close

                socket.end();
            });
        },
    };
};

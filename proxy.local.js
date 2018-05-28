'use strict';

const net = require('net');

const create = (callback) => {
    callback((reply, callback2) => {
        let socket = null;

        callback2((data) => {
            switch (data[0]) {
                case 'connect':
                    socket = net.createConnection(data[2], data[1]).on('connect', () => {
                        reply(['open', socket.localAddress, socket.localPort]);
                    }).on('data', (chunk) => {
                        reply(['data', chunk]);
                    }).on('end', () => {
                        reply(['end']);
                    }).on('close', () => {
                        reply(['close']);

                        // TODO: timeout?
                        if (!socket.destroyed) {
                            socket.destroy();
                        }
                    });

                    break;
                case 'bind':
                    //

                    break;
                case 'udpassociate':
                    //

                    break;
                case 'data':
                    socket.write(data[1]);

                    break;
                case 'end':
                    socket.end();

                    break;
                case 'close':
                    // socket.end()?
                    socket.destroy();

                    break;
                default:
                    // ignore
            }
        });
    });
};

module.exports = {
    create: create,
};

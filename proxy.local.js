'use strict';

const net = require('net');

const create = (callback) => {
    callback((reply, callback2) => {
        let socket = null;
        let connected = false;

        callback2((data) => {
            switch (data[0]) {
                case 'connect':
                    socket = net.createConnection(data[2], data[1]).once('connect', () => {
                        connected = true;

                        reply(['open', socket.localAddress, socket.localPort, null]);
                    }).on('data', (chunk) => {
                        reply(['data', chunk]);
                    }).once('end', () => {
                        reply(['end']);
                    }).once('close', () => {
                        reply(['close']);

                        // TODO: timeout?
                        if (!socket.destroyed) {
                            socket.destroy();
                        }
                    }).on('error', (err) => {
                        if (!connected && err.code) {
                            reply(['open', socket.localAddress, socket.localPort, err.code]);
                        }
                    });

                    break;
                case 'bind':
                    //

                    break;
                case 'udpassociate':
                    //

                    break;
                case 'message':
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

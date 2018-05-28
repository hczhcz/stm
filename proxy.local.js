'use strict';

const crypto = require('crypto');
const net = require('net');

const create = (callback) => {
    const sessions = {};

    callback({
        open: (receive) => {
            const session = crypto.randomBytes(16).toString('hex');

            sessions[session] = {
                time: Date.now(),
                receive: receive,
            };

            return session;
        },

        send: (session, data) => {
            sessions[session].time = Date.now();

            switch (data[0]) {
                case 'connect':
                    sessions[session].socket = net.createConnection(data[2], data[1]).on('connect', () => {
                        sessions[session].receive(['open', sessions[session].socket.localAddress, sessions[session].socket.localPort]);
                    }).on('data', (chunk) => {
                        sessions[session].receive(['data', chunk]);
                    }).on('end', () => {
                        sessions[session].receive(['end']);
                    }).on('close', () => {
                        sessions[session].receive(['close']);

                        if (!sessions[session].socket.destroyed) {
                            sessions[session].socket.destroy();
                        }

                        delete sessions[session];
                    });

                    break;
                case 'bind':
                    //

                    break;
                case 'udpassociate':
                    //

                    break;
                case 'data':
                    sessions[session].socket.write(data[1]);

                    break;
                case 'end':
                    sessions[session].socket.end();

                    break;
                case 'close':
                    // sessions[session].socket.end()?
                    sessions[session].socket.destroy();

                    break;
                default:
                    // ignore
            }
        },
    });
};

module.exports = {
    create: create,
};

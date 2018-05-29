'use strict';

const net = require('net');
const dgram = require('dgram');

module.exports = () => {
    let backward = null;

    return {
        pipe: (next) => {
            backward = next.open;

            return next;
        },

        open: (id, callback) => {
            backward(id, (send, close) => {
                let socket = null;
                let tcpServer = null;
                let udpServer = null;
                let connected = false;

                callback((data) => {
                    // send

                    switch (data[0]) {
                        case 'connect':
                            socket = net.createConnection(data[2], data[1]).once('connect', () => {
                                connected = true;

                                send(['open', socket.localAddress, socket.localPort, null]);
                            }).on('data', (chunk) => {
                                send(['data', chunk]);
                            }).once('end', () => {
                                send(['end']);
                            }).once('close', () => {
                                close();
                            }).on('error', (err) => {
                                if (!connected && err.code) {
                                    send(['open', socket.localAddress, socket.localPort, err.code]);
                                }
                            });

                            break;
                        case 'bind':
                            tcpServer = net.createServer({
                                allowHalfOpen: true,
                            }).once('listening', () => {
                                connected = true;

                                const address = tcpServer.address();

                                send(['open', address.address, address.port, null]);
                            }).once('connection', (remoteSocket) => {
                                socket = remoteSocket;

                                const address = remoteSocket.address();

                                send(['connection', address.address, address.port, null]);
                            }).on('error', (err) => {
                                if (!connected && err.code) {
                                    const address = tcpServer.address();

                                    send(['open', address.address, address.port, err.code]);
                                }
                            }).listen();

                            break;
                        case 'udpassociate':
                            udpServer = dgram.createSocket({
                                type: 'udp4',
                            }).once('listening', () => {
                                connected = true;

                                send(['udpassociate', null]);
                            }).on('message', (msg, info) => {
                                send(['message', info.address, info.port, msg]);
                            }).on('error', (err) => {
                                if (!connected && err.code) {
                                    send(['udpassociate', err.code]);
                                }
                            }).bind();

                            break;
                        case 'message':
                            udpServer.send(data[3], data[2], data[1]);

                            break;
                        case 'data':
                            socket.write(data[1]);

                            break;
                        case 'end':
                            socket.end();

                            break;
                        default:
                            // ignore
                    }
                }, () => {
                    // close

                    if (socket && !socket.destroyed) {
                        socket.destroy();
                    }

                    if (tcpServer) {
                        tcpServer.close();
                    }

                    if (udpServer) {
                        udpServer.close();
                    }
                });
            });
        },
    };
};

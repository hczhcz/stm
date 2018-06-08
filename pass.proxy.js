'use strict';

const net = require('net');
const dgram = require('dgram');

const serialize = require('./serialize');

module.exports = () => {
    const self = {
        next: null,

        open: (info, callback) => {
            self.next(info, (send, close) => {
                const sendJson = (json, chunk) => {
                    send(serialize.create(json, chunk));
                };

                let socket = null;
                let tcpServer = null;
                let udpServer = null;
                let connected = false;

                callback((data) => {
                    // send

                    const json = serialize.getJson(data);
                    const chunk = serialize.getChunk(data);

                    switch (json[0]) {
                        case 'connect':
                            socket = net.createConnection(json[2], json[1]).once('connect', () => {
                                connected = true;

                                sendJson(['open', socket.localAddress, socket.localPort, null], null);
                            }).on('data', (dataChunk) => {
                                sendJson(['data'], dataChunk);
                            }).once('end', () => {
                                sendJson(['end'], null);
                            }).on('error', (err) => {
                                if (!connected && err.code) {
                                    sendJson(['open', socket.localAddress, socket.localPort, err.code], null);
                                }
                            });

                            break;
                        case 'bind':
                            tcpServer = net.createServer({
                                allowHalfOpen: true,
                            }).once('listening', () => {
                                connected = true;

                                const address = tcpServer.address();

                                // note: hack
                                sendJson(['open', info.socket.localAddress, info.socket.localPort, null], null);
                            }).once('connection', (remoteSocket) => {
                                socket = remoteSocket.on('data', (dataChunk) => {
                                    sendJson(['data'], dataChunk);
                                }).once('end', () => {
                                    sendJson(['end'], null);
                                }).once('close', () => {
                                    tcpServer.close();
                                    tcpServer = null;
                                });

                                const address = remoteSocket.address();

                                sendJson(['connection', address.address, address.port, null], null);
                            }).on('error', (err) => {
                                if (!connected && err.code) {
                                    const address = tcpServer.address();

                                    // note: hack
                                    sendJson(['open', info.socket.localAddress, info.socket.localPort, err.code], null);
                                }
                            }).listen();

                            break;
                        case 'udpassociate':
                            udpServer = dgram.createSocket({
                                type: 'udp6',
                            }).once('listening', () => {
                                connected = true;

                                sendJson(['udpassociate', null], null);
                            }).on('message', (msg, address) => {
                                sendJson(['message', address.address, address.port], msg);
                            }).on('error', (err) => {
                                if (!connected && err.code) {
                                    sendJson(['udpassociate', err.code], null);
                                }
                            }).bind();

                            break;
                        case 'message':
                            udpServer.send(chunk, json[2], json[1]);

                            break;
                        case 'data':
                            socket.write(chunk);

                            break;
                        case 'end':
                            if (udpServer) {
                                udpServer.close();
                                udpServer = null;
                            } else {
                                socket.end();
                            }

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

                    close();
                });
            });
        },
    };

    return self;
};

'use strict';

const crypto = require('crypto');
const net = require('net');
const dgram = require('dgram');

const serialize = require('./serialize');

module.exports = (
    fullResponse /*: boolean */
) /*: Pass */ => {
    const self = {
        next: null,

        open: (info, callback) => {
            if (!self.next) {
                // non-null assertion

                throw Error();
            }

            self.next(info, (send, close) => {
                const sendJson = (json, chunk) => {
                    send(serialize.create(json, chunk));
                };

                const id = crypto.randomBytes(2).toString('hex');

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
                            console.log(id + ' connect ' + json[1] + ' ' + json[2]);

                            socket = net.createConnection(json[2], json[1]).once('connect', () => {
                                if (!socket) {
                                    // non-null assertion

                                    throw Error();
                                }

                                connected = true;

                                if (fullResponse) {
                                    sendJson(['open', socket.localAddress, socket.localPort, null], null);
                                }
                            }).on('data', (dataChunk) => {
                                sendJson(['data'], dataChunk);
                            }).once('end', () => {
                                sendJson(['end'], null);
                            }).once('error', (err) => {
                                if (!socket) {
                                    // non-null assertion

                                    throw Error();
                                }

                                if (fullResponse && !connected && err.code) {
                                    sendJson(['open', socket.localAddress, socket.localPort, err.code], null);
                                }
                            }).on('error', (err) => {
                                console.error(id + ' tcp error');
                                console.error(err);
                            });

                            break;
                        case 'bind':
                            console.log(id + ' bind');

                            tcpServer = net.createServer({
                                allowHalfOpen: true,
                            }).once('listening', () => {
                                if (!tcpServer) {
                                    // non-null assertion

                                    throw Error();
                                }

                                connected = true;

                                const bind = tcpServer.address();

                                // note: hack
                                if (info.socket) {
                                    sendJson(['open', info.socket.localAddress, bind.port, null], null);
                                } else {
                                    sendJson(['open', bind.address, bind.port, null], null);
                                }
                            }).once('connection', (remoteSocket) => {
                                socket = remoteSocket.on('data', (dataChunk) => {
                                    sendJson(['data'], dataChunk);
                                }).once('end', () => {
                                    sendJson(['end'], null);
                                }).once('close', () => {
                                    if (!tcpServer) {
                                        // non-null assertion

                                        throw Error();
                                    }

                                    tcpServer.close();
                                    tcpServer = null;
                                }).on('error', (err) => {
                                    console.error(id + ' tcp error');
                                    console.error(err);
                                });

                                sendJson(['connection', remoteSocket.remoteAddress, remoteSocket.remotePort, null], null);
                            }).once('error', (err) => {
                                if (!connected && err.code) {
                                    // note: hack
                                    sendJson(['open', info.socket.localAddress, info.socket.localPort, err.code], null);
                                }
                            }).on('error', (err) => {
                                console.error(id + ' tcp server error');
                                console.error(err);
                            }).listen();

                            break;
                        case 'udpassociate':
                            console.log(id + ' udpassociate');

                            udpServer = dgram.createSocket({
                                type: 'udp6',
                            }).once('listening', () => {
                                connected = true;

                                if (fullResponse) {
                                    sendJson(['udpassociate', null], null);
                                }
                            }).on('message', (msg, address) => {
                                sendJson(['message', address.address, address.port], msg);
                            }).once('error', (err) => {
                                if (fullResponse && !connected && err.code) {
                                    sendJson(['udpassociate', err.code], null);
                                }
                            }).on('error', (err) => {
                                console.error(id + ' udp error');
                                console.error(err);
                            });

                            // note: not chained according to the official docs
                            udpServer.bind();

                            break;
                        case 'message':
                            if (udpServer) {
                                udpServer.send(chunk, json[2], json[1]);
                            } else {
                                throw Error();
                            }

                            break;
                        case 'data':
                            if (socket) {
                                socket.write(chunk);
                            } else {
                                throw Error();
                            }

                            break;
                        case 'end':
                            if (socket) {
                                socket.end();
                            }

                            if (udpServer) {
                                udpServer.close();
                                udpServer = null;
                            }

                            break;
                        default:
                            // ignore
                    }
                }, () => {
                    // close

                    if (socket) {
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

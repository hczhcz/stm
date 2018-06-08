'use strict';

const crypto = require('crypto');
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
                                connected = true;

                                sendJson(['open', socket.localAddress, socket.localPort, null], null);
                            }).on('data', (dataChunk) => {
                                sendJson(['data'], dataChunk);
                            }).once('end', () => {
                                sendJson(['end'], null);
                            }).once('error', (err) => {
                                if (!connected && err.code) {
                                    sendJson(['open', socket.localAddress, socket.localPort, err.code], null);
                                }
                            }).on('error', (err) => {
                                console.error(id + ' request error');
                                console.error(err);
                            });

                            break;
                        case 'bind':
                            console.log(id + ' bind');

                            tcpServer = net.createServer({
                                allowHalfOpen: true,
                            }).once('listening', () => {
                                connected = true;

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
                                }).on('error', (err) => {
                                    console.error(id + ' connection error');
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

                                sendJson(['udpassociate', null], null);
                            }).on('message', (msg, address) => {
                                sendJson(['message', address.address, address.port], msg);
                            }).once('error', (err) => {
                                if (!connected && err.code) {
                                    sendJson(['udpassociate', err.code], null);
                                }
                            }).on('error', (err) => {
                                console.error(id + ' udp bind error');
                                console.error(err);
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

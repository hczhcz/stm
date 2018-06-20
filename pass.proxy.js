'use strict';

const net = require('net');
const dgram = require('dgram');

const config = require('./config');
const serialize = require('./serialize');

// send:
// connect(address, port)
// bind()
// udpassociate()
// message(address, port) + msg
// data() + chunk
// end()

// reply:
// open(address, port, code)
// connection(address, port, code)
// udpassociate(code)
// message(address, port) + msg
// data() + chunk
// end()

module.exports = (
    nextPass /*: Pass */,
    fullResponse /*: boolean */
) /*: Pass */ => {
    return (info, callback) => {
        let socket = null;
        let tcpServer = null;
        let udpBind = null;
        let connected = false;

        const connectInit = (sendJson, address, port) => {
            if (info.socket) {
                info.socket.pause();
            }

            socket = net.createConnection({
                host: address,
                port: port,
                allowHalfOpen: true,
            }).once('connect', () => {
                if (!socket) {
                    // non-null assertion

                    throw Error();
                }

                connected = true;

                if (fullResponse) {
                    sendJson([
                        'open',
                        socket.localAddress,
                        socket.localPort,
                        null,
                    ], null);
                }

                if (info.socket) {
                    info.socket.resume();
                }
            }).on('data', (dataChunk) => {
                sendJson([
                    'data',
                ], dataChunk);
            }).once('end', () => {
                sendJson([
                    'end',
                ], null);
            }).once('error', (err) => {
                if (!socket) {
                    // non-null assertion

                    throw Error();
                }

                if (fullResponse && !connected && err.code) {
                    sendJson([
                        'open',
                        socket.localAddress,
                        socket.localPort,
                        err.code,
                    ], null);
                }
            }).on('error', (err) => {
                console.error(info.id + ' tcp error');

                if (config.log.network) {
                    console.error(err);
                }
            });
        };

        const bindInit = (sendJson) => {
            if (info.socket) {
                info.socket.pause();
            }

            tcpServer = net.createServer({
                allowHalfOpen: true,
            }).once('listening', () => {
                if (!tcpServer) {
                    // non-null assertion

                    throw Error();
                }

                connected = true;

                const bind = tcpServer.address();

                if (info.socket) {
                    sendJson([
                        'open',
                        info.socket.localAddress,
                        bind.port,
                        null,
                    ], null);
                } else {
                    sendJson([
                        'open',
                        bind.address,
                        bind.port,
                        null,
                    ], null);
                }
            }).once('connection', (remoteSocket) => {
                socket = remoteSocket.on('data', (dataChunk) => {
                    sendJson([
                        'data',
                    ], dataChunk);
                }).once('end', () => {
                    sendJson([
                        'end',
                    ], null);
                }).once('close', () => {
                    if (!tcpServer) {
                        // non-null assertion

                        throw Error();
                    }

                    tcpServer.close();
                    tcpServer = null;
                }).on('error', (err) => {
                    console.error(info.id + ' tcp error');

                    if (config.log.network) {
                        console.error(err);
                    }
                });

                sendJson([
                    'connection',
                    remoteSocket.remoteAddress,
                    remoteSocket.remotePort,
                    null,
                ], null);

                if (info.socket) {
                    info.socket.resume();
                }
            }).once('error', (err) => {
                if (!tcpServer) {
                    // non-null assertion

                    throw Error();
                }

                if (!connected && err.code) {
                    const bind = tcpServer.address();

                    if (info.socket) {
                        sendJson([
                            'open',
                            info.socket.localAddress,
                            bind.port,
                            err.code,
                        ], null);
                    } else {
                        sendJson([
                            'open',
                            bind.address,
                            bind.port,
                            err.code,
                        ], null);
                    }
                }
            }).on('error', (err) => {
                console.error(info.id + ' tcp server error');

                if (config.log.network) {
                    console.error(err);
                }
            }).listen();
        };

        const udpAssociateInit = (sendJson) => {
            if (info.socket) {
                info.socket.pause();
            }

            udpBind = dgram.createSocket({
                type: 'udp6',
            }).once('listening', () => {
                connected = true;

                if (fullResponse) {
                    sendJson([
                        'udpassociate',
                        null,
                    ], null);
                }

                if (info.socket) {
                    info.socket.resume();
                }
            }).on('message', (msg, address) => {
                sendJson([
                    'message',
                    address.address,
                    address.port,
                ], msg);
            }).once('error', (err) => {
                if (fullResponse && !connected && err.code) {
                    sendJson([
                        'udpassociate',
                        err.code,
                    ], null);
                }
            }).on('error', (err) => {
                console.error(info.id + ' udp error');

                if (config.log.network) {
                    console.error(err);
                }
            });

            // note: not chained according to the official docs
            udpBind.bind();
        };

        nextPass(info, (send, close) => {
            const sendJson = (json, chunk) => {
                send(serialize.create(json, chunk));
            };

            callback((data) => {
                // send

                const json = serialize.getJson(data);
                const chunk = serialize.getChunk(data);

                switch (json[0]) {
                    case 'connect':
                        console.log(
                            info.id + ' connect ' + json[1] + ' ' + json[2]
                        );

                        connectInit(sendJson, json[1], json[2]);

                        break;
                    case 'bind':
                        console.log(
                            info.id + ' bind'
                        );

                        bindInit(sendJson);

                        break;
                    case 'udpassociate':
                        console.log(
                            info.id + ' udpassociate'
                        );

                        udpAssociateInit(sendJson);

                        break;
                    case 'message':
                        if (udpBind) {
                            udpBind.send(chunk, json[2], json[1]);
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

                        if (udpBind) {
                            udpBind.close();
                            udpBind = null;
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

                if (udpBind) {
                    udpBind.close();
                }

                close();
            });
        });
    };
};

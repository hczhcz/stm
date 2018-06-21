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
    return function *(info) {
        const next = nextPass(info);

        const sendJson = (json, chunk) => {
            next.next(serialize.create(json, chunk));
        };

        next.next();

        const firstData = yield;

        if (firstData === null) {
            next.next(null);

            return;
        }

        const firstJson = serialize.getJson(firstData);

        let socket = null;
        let tcpServer = null;
        let udpBind = null;

        const connectInit = (address, port) => {
            let connected = false;

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

        const bindInit = () => {
            let connected = false;

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

        const udpAssociateInit = () => {
            let connected = false;

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
            }).on('message', (msg, rinfo) => {
                sendJson([
                    'message',
                    rinfo.address,
                    rinfo.port,
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

        switch (firstJson[0]) {
            case 'connect':
                console.log(
                    info.id + ' connect ' + firstJson[1] + ' ' + firstJson[2]
                );

                connectInit(firstJson[1], firstJson[2]);

                break;
            case 'bind':
                console.log(
                    info.id + ' bind'
                );

                bindInit();

                break;
            case 'udpassociate':
                console.log(
                    info.id + ' udpassociate'
                );

                udpAssociateInit();

                break;
            default:
                throw Error();
        }

        for (let data = yield; data !== null; data = yield) {
            const json = serialize.getJson(data);
            const chunk = serialize.getChunk(data);

            switch (json[0]) {
                case 'message':
                    if (udpBind) {
                        udpBind.send(chunk, json[2], json[1]);
                    }

                    break;
                case 'data':
                    if (socket) {
                        socket.write(chunk);
                    }

                    break;
                case 'end':
                    if (socket) {
                        socket.end();
                        socket = null;
                    }

                    if (tcpServer) {
                        tcpServer.close();
                        tcpServer = null;
                    }

                    if (udpBind) {
                        udpBind.close();
                        udpBind = null;
                    }

                    break;
                default:
                    throw Error();
            }
        }

        if (socket) {
            socket.destroy();
        }

        if (tcpServer) {
            tcpServer.close();
        }

        if (udpBind) {
            udpBind.close();
        }

        next.next(null);
    };
};

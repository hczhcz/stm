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
// udpopen(code)
// message(address, port) + msg
// data() + chunk
// end()

module.exports = (
    nextPass /*: Pass */,
    fullResponse /*: boolean */
) /*: Pass */ => {
    return function *(
        info /*: Info */
    ) /*: BufferGenerator */ {
        const next /*: BufferGenerator */ = nextPass(info);

        const sendJson = (
            json /*: Command */,
            chunk /*: Buffer | null */
        ) /*: void */ => {
            next.next(serialize.create(json, chunk));
        };

        next.next();

        const firstData /*: Buffer | null */ = yield;

        if (firstData === null) {
            next.next(null);

            return;
        }

        const firstJson /*: Command */ = serialize.getJson(firstData);

        let socket /*: net$Socket | null */ = null;
        let tcpServer /*: net$Server | null*/ = null;
        let udpBind /*: dgram$Socket | null */ = null;

        const connectInit = (
            address /*: string */,
            port /*: number */
        ) /*: void */ => {
            let connected /*: boolean */ = false;

            if (info.socket) {
                info.socket.pause();
            }

            socket = net.createConnection({
                host: address,
                port: port,
                allowHalfOpen: true,
            }).once('connect', () /*: void */ => {
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
            }).on('data', (
                dataChunk /*: Buffer */
            ) /*: void */ => {
                sendJson([
                    'data',
                ], dataChunk);
            }).once('end', () /*: void */ => {
                sendJson([
                    'end',
                ], null);
            }).once('close', () /*: void */ => {
                if (config.log.networkClose) {
                    console.error(info.id + ' proxy socket close');
                }
            }).once('timeout', () /*: void */ => {
                if (!socket) {
                    // non-null assertion

                    throw Error();
                }

                socket.destroy();
            }).once('error', (
                err /*: error */
            ) /*: void */ => {
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
            }).on('error', (
                err /*: error */
            ) /*: void */ => {
                if (config.log.networkError) {
                    console.error(info.id + ' proxy socket error');
                }

                if (config.log.networkErrorDetail) {
                    console.error(err);
                }
            }).setTimeout(30000);
        };

        const bindInit = () /*: void */ => {
            let connected /*: boolean */ = false;

            if (info.socket) {
                info.socket.pause();
            }

            tcpServer = net.createServer({
                allowHalfOpen: true,
            }).once('listening', () /*: void */ => {
                if (!tcpServer) {
                    // non-null assertion

                    throw Error();
                }

                connected = true;

                const bind /*: Address */ = tcpServer.address();

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
            }).once('connection', (
                remoteSocket /*: net$Socket */
            ) /*: void */ => {
                socket = remoteSocket.on('data', (
                    dataChunk /*: Buffer */
                ) /*: void */ => {
                    sendJson([
                        'data',
                    ], dataChunk);
                }).once('end', () /*: void */ => {
                    sendJson([
                        'end',
                    ], null);
                }).once('close', () /*: void */ => {
                    if (config.log.networkClose) {
                        console.error(info.id + ' proxy socket close');
                    }

                    if (!tcpServer) {
                        // non-null assertion

                        throw Error();
                    }

                    tcpServer.close();
                    tcpServer = null;
                }).once('timeout', () /*: void */ => {
                    if (!socket) {
                        // non-null assertion

                        throw Error();
                    }

                    socket.destroy();
                }).on('error', (
                    err /*: error */
                ) /*: void */ => {
                    if (config.log.networkError) {
                        console.error(info.id + ' proxy socket error');
                    }

                    if (config.log.networkErrorDetail) {
                        console.error(err);
                    }
                }).setTimeout(30000);

                // note: remoteAddress might be absent
                sendJson([
                    'connection',
                    remoteSocket.remoteAddress || '',
                    remoteSocket.remotePort,
                    null,
                ], null);

                if (info.socket) {
                    info.socket.resume();
                }
            }).once('error', (
                err /*: error */
            ) /*: void */ => {
                if (!tcpServer) {
                    // non-null assertion

                    throw Error();
                }

                if (!connected && err.code) {
                    const bind /*: Address */ = tcpServer.address();

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
            }).on('error', (
                err /*: error */
            ) /*: void */ => {
                if (config.log.networkError) {
                    console.error(info.id + ' proxy server error');
                }

                if (config.log.networkErrorDetail) {
                    console.error(err);
                }
            }).listen();
        };

        const udpAssociateInit = () /*: void */ => {
            let connected /*: boolean */ = false;

            if (info.socket) {
                info.socket.pause();
            }

            udpBind = dgram.createSocket({
                type: 'udp6',
            }).once('listening', () /*: void */ => {
                connected = true;

                if (fullResponse) {
                    sendJson([
                        'udpopen',
                        null,
                    ], null);
                }

                if (info.socket) {
                    info.socket.resume();
                }
            }).on('message', (
                msg /*: Buffer */,
                rinfo /*: dgram$Socket$rinfo */
            ) /*: void */ => {
                sendJson([
                    'message',
                    rinfo.address,
                    rinfo.port,
                ], msg);
            }).once('close', () /*: void */ => {
                if (config.log.networkClose) {
                    console.error(info.id + ' proxy udpBind close');
                }
            }).once('error', (
                err /*: error */
            ) /*: void */ => {
                if (fullResponse && !connected && err.code) {
                    sendJson([
                        'udpopen',
                        err.code,
                    ], null);
                }
            }).on('error', (
                err /*: error */
            ) /*: void */ => {
                if (config.log.networkError) {
                    console.error(info.id + ' proxy udpBind error');
                }

                if (config.log.networkErrorDetail) {
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

        for (
            let data /*: Buffer | null */ = yield;
            data !== null;
            data = yield
        ) {
            const json /*: Command */ = serialize.getJson(data);
            const chunk /*: Buffer */ = serialize.getChunk(data);

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

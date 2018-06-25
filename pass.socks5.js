'use strict';

const crypto = require('crypto');
const net = require('net');
const dgram = require('dgram');

const config = require('./config');
const serialize = require('./serialize');
const socks5 = require('./socks5');
const socks5udp = require('./socks5.udp');

module.exports = (
    nextPass /*: Pass */,
    listenPort /*: number */,
    fullResponse /*: boolean */
) /*: Pass */ => {
    net.createServer({
        allowHalfOpen: true,
    }).on('connection', (
        socket /*: net$Socket */
    ) /*: void */ => {
        const info /*: Info */ = {
            id: crypto.randomBytes(2).toString('hex'),
            socket: socket,
        };

        const next = nextPass(info);

        const sendJson = (
            json /*: Command */,
            chunk /*: Buffer | null */
        ) /*: void */ => {
            next.next(serialize.create(json, chunk));
        };

        next.next();

        socks5.accept(socket);

        socket.once('close', () /*: void */ => {
            if (config.log.networkClose) {
                console.error(info.id + ' socks5 socket close');
            }

            next.next(null);
        }).on('error', (
            err /*: error */
        ) /*: void */ => {
            if (config.log.networkError) {
                console.error(info.id + ' socks5 socket error');
            }

            if (config.log.networkErrorDetail) {
                console.error(err);
            }
        }).once('socks5client.connect', (
            address /*: string */,
            port /*: number */
        ) /*: void */ => {
            console.log(
                info.id + ' socks5 connect ' + address + ' ' + port
            );

            sendJson(['connect', address, port], null);

            if (!fullResponse) {
                socket.emit(
                    'socks5server.open',
                    '0.0.0.0',
                    0,
                    null
                );
            }
        }).once('socks5client.bind', (
            address /*: string */,
            port /*: number */
        ) /*: void */ => {
            console.log(
                info.id + ' socks5 bind ' + address + ' ' + port
            );

            sendJson(['bind'], null);
        }).once('socks5client.udpassociate', (
            address /*: string */,
            port /*: number */
        ) /*: void */ => {
            console.log(
                info.id + ' socks5 udpassociate ' + address + ' ' + port
            );

            const udpBind = dgram.createSocket({
                type: 'udp6',
            }).once('listening', () /*: void */ => {
                sendJson(['udpassociate'], null);

                if (!fullResponse) {
                    const bind = udpBind.address();

                    socket.emit(
                        'socks5server.udpassociate',
                        bind.address,
                        bind.port,
                        null
                    );
                }
            }).on('close', () /*: void */ => {
                if (config.log.networkClose) {
                    console.error(info.id + ' socks5 udpBind close');
                }
            }).on('error', (
                err /*: error */
            ) /*: void */ => {
                if (config.log.networkError) {
                    console.error(info.id + ' socks5 udpBind error');
                }

                if (config.log.networkErrorDetail) {
                    console.error(err);
                }
            }).on('socks5client.message', (
                localAddress /*: string */,
                localPort /*: number */,
                remoteAddress /*: string */,
                remotePort /*: number */,
                msg /*: Buffer */
            ) /*: void */ => {
                if (config.log.proxyTransfer) {
                    console.error(info.id + ' socks5 message');
                }

                sendJson(['message', remoteAddress, remotePort], msg);
            }).on('socks5.step', (
                step /*: string */
            ) /*: void */ => {
                if (config.log.proxyStep) {
                    console.error(info.id + ' socks5 step ' + step);
                }
            }).on('socks5.error', (
                step /*: string */
            ) /*: void */ => {
                if (config.log.proxyError) {
                    console.error(info.id + ' socks5 error ' + step);
                }
            });

            // note: not chained according to the official docs
            udpBind.bind();

            socks5udp.init(udpBind);

            info.udpBind = udpBind;
            info.udpAddress = address;
            info.udpPort = port;
        }).on('socks5client.data', (
            chunk /*: Buffer */
        ) /*: void */ => {
            if (config.log.proxyTransfer) {
                console.error(info.id + ' socks5 data');
            }

            sendJson(['data'], chunk);
        }).once('socks5client.end', () /*: void */ => {
            if (config.log.proxyTransfer) {
                console.error(info.id + ' socks5 end');
            }

            if (info.udpBind) {
                info.udpBind.close();

                delete info.udpBind;
                delete info.udpAddress;
                delete info.udpPort;
            }

            sendJson(['end'], null);
        }).on('socks5.step', (
            step /*: string */
        ) /*: void */ => {
            if (config.log.proxyStep) {
                console.error(info.id + ' socks5 step ' + step);
            }
        }).on('socks5.error', (
            step /*: string */
        ) /*: void */ => {
            if (config.log.proxyError) {
                console.error(info.id + ' socks5 error ' + step);
            }
        });
    }).on('error', (
        err /*: error */
    ) /*: void */ => {
        if (config.log.networkError) {
            console.error('socks5 server error');
        }

        if (config.log.networkErrorDetail) {
            console.error(err);
        }
    }).listen(listenPort);

    return function *(
        info /*: Info */
    ) /*: Generator<void, void, Buffer | null> */ {
        if (!info.socket) {
            // non-null assertion

            throw Error();
        }

        const socket = info.socket;

        // TODO: 2-stage

        for (
            let data /*: Buffer | null */ = yield;
            data !== null;
            data = yield
        ) {
            const json = serialize.getJson(data);
            const chunk = serialize.getChunk(data);

            let bind /*: net$Socket$address | null */ = null;

            switch (json[0]) {
                case 'open':
                    socket.emit(
                        'socks5server.open',
                        json[1],
                        json[2],
                        json[3]
                    );

                    break;
                case 'connection':
                    socket.emit(
                        'socks5server.connection',
                        json[1],
                        json[2],
                        json[3]
                    );

                    break;
                case 'udpopen':
                    if (!info.udpBind) {
                        // non-null assertion

                        throw Error();
                    }

                    bind = info.udpBind.address();

                    socket.emit(
                        'socks5server.udpassociate',
                        bind.address,
                        bind.port,
                        json[1]
                    );

                    break;
                case 'message':
                    if (!info.udpBind) {
                        // non-null assertion

                        throw Error();
                    }

                    info.udpBind.emit(
                        'socks5server.message',
                        info.udpAddress,
                        info.udpPort,
                        json[1],
                        json[2],
                        chunk
                    );

                    break;
                case 'data':
                    socket.emit('socks5server.data', chunk);

                    break;
                case 'end':
                    socket.emit('socks5server.end');

                    break;
                default:
                    // ignore
            }
        }

        socket.destroy();

        if (info.udpBind) {
            info.udpBind.close();
        }
    };
};

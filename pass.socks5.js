'use strict';

const crypto = require('crypto');
const net = require('net');
const dgram = require('dgram');

const config = require('./config');
const serialize = require('./serialize');
const socks5 = require('./socks5');
const socks5udp = require('./socks5.udp');

module.exports = (
    listenPort /*: number */,
    fullResponse /*: boolean */
) /*: Pass */ => {
    const self = {
        next: null,

        open: (info, callback) => {
            callback((data) => {
                // send

                const json = serialize.getJson(data);
                const chunk = serialize.getChunk(data);

                let bind = null;

                switch (json[0]) {
                    case 'open':
                        info.socket.emit(
                            'socks5server.open',
                            json[1],
                            json[2],
                            json[3]
                        );

                        break;
                    case 'connection':
                        info.socket.emit(
                            'socks5server.connection',
                            json[1],
                            json[2],
                            json[3]
                        );

                        break;
                    case 'udpassociate':
                        bind = info.udpBind.address();
                        info.socket.emit(
                            'socks5server.udpassociate',
                            bind.address,
                            bind.port,
                            json[1]
                        );

                        break;
                    case 'message':
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
                        info.socket.emit('socks5server.data', chunk);

                        break;
                    case 'end':
                        info.socket.emit('socks5server.end');

                        break;
                    default:
                        // ignore
                }
            }, () => {
                // close

                info.socket.emit('socks5server.close');

                if (info.udpBind) {
                    info.udpBind.close();
                }
            });
        },
    };

    net.createServer({
        allowHalfOpen: true,
    }).on('connection', (socket) => {
        if (!self.next) {
            // non-null assertion

            throw Error();
        }

        socket.pause();

        const info /*: any */ = {
            id: crypto.randomBytes(2).toString('hex'),
            socket: socket,
            udpAddress: null,
            udpPort: null,
            udpBind: null,
        };

        self.next(info, (send, close) => {
            const sendJson = (json, chunk) => {
                send(serialize.create(json, chunk));
            };

            socks5.accept(socket);

            socket.on('error', (err) => {
                console.error(info.id + ' tcp error');

                if (config.log.network) {
                    console.error(err);
                }
            }).once('socks5client.connect', (address, port) => {
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
            }).once('socks5client.bind', (address, port) => {
                console.log(
                    info.id + ' socks5 bind ' + address + ' ' + port
                );

                sendJson(['bind'], null);
            }).once('socks5client.udpassociate', (address, port) => {
                console.log(
                    info.id + ' socks5 udpassociate ' + address + ' ' + port
                );

                info.udpAddress = address;
                info.udpPort = port;
                info.udpBind = dgram.createSocket({
                    type: 'udp6',
                }).once('listening', () => {
                    sendJson(['udpassociate'], null);

                    if (!fullResponse) {
                        const bind = info.udpBind.address();

                        socket.emit(
                            'socks5server.udpassociate',
                            bind.address,
                            bind.port,
                            null
                        );
                    }
                }).on('error', (err) => {
                    console.error(info.id + ' udp error');

                    if (config.log.network) {
                        console.error(err);
                    }
                }).on('socks5client.message', (
                    localAddress,
                    localPort,
                    remoteAddress,
                    remotePort,
                    msg
                ) => {
                    if (config.log.transfer) {
                        console.error(info.id + ' socks5 message');
                    }

                    sendJson(['message', remoteAddress, remotePort], msg);
                }).on('socks5.step', (step) => {
                    if (config.log.step) {
                        console.error(info.id + ' socks5 udp step ' + step);
                    }
                }).on('socks5.error', (step) => {
                    console.error(info.id + ' socks5 udp error ' + step);
                });

                // note: not chained according to the official docs
                info.udpBind.bind();

                socks5udp.init(info.udpBind);
            }).on('socks5client.data', (chunk) => {
                if (config.log.transfer) {
                    console.error(info.id + ' socks5 data');
                }

                sendJson(['data'], chunk);
            }).once('socks5client.end', () => {
                if (config.log.transfer) {
                    console.error(info.id + ' socks5 end');
                }

                if (info.udpBind) {
                    info.udpBind.close();
                    info.udpBind = null;
                }

                sendJson(['end'], null);
            }).once('socks5client.close', () => {
                if (config.log.transfer) {
                    console.error(info.id + ' socks5 close');
                }

                close();
            }).on('socks5.step', (step) => {
                if (config.log.step) {
                    console.error(info.id + ' socks5 tcp step ' + step);
                }
            }).on('socks5.error', (step) => {
                console.error(info.id + ' socks5 tcp error ' + step);
            }).resume();
        });
    }).on('error', (err) => {
        console.error('tcp server error');

        if (config.log.network) {
            console.error(err);
        }
    }).listen(listenPort);

    return self;
};

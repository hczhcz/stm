'use strict';

const crypto = require('crypto');
const net = require('net');
const dgram = require('dgram');

const config = require('./config');
const serialize = require('./serialize');

module.exports = (
    nextPass /*: Pass */,
    tcpPolicy /*: Array<[number, string, number]> */,
    udpPolicy /*: Array<[number, string, number]> */
) /*: Pass */ => {
    const tcpInit = (listenPort, address, port) => {
        net.createServer({
            allowHalfOpen: true,
        }).on('connection', (socket) => {
            const info = {
                id: crypto.randomBytes(2).toString('hex'),
                socket: socket,
            };

            const next = nextPass(info);

            const sendJson = (json, chunk) => {
                next.next(serialize.create(json, chunk));
            };

            next.next();

            console.log(
                info.id + ' nat tcp connect ' + address + ' ' + port
            );

            sendJson(['connect', address, port], null);

            socket.on('data', (chunk) => {
                sendJson(['data'], chunk);
            }).once('end', () => {
                sendJson(['end'], null);
            }).once('close', () => {
                next.next(null);
            }).on('error', (err) => {
                console.error(info.id + ' tcp error');

                if (config.log.network) {
                    console.error(err);
                }
            });
        }).on('error', (err) => {
            console.error('tcp server error');

            if (config.log.network) {
                console.error(err);
            }
        }).listen(listenPort);
    };

    for (let i = 0; i < tcpPolicy.length; i += 1) {
        tcpInit(tcpPolicy[i][0], tcpPolicy[i][1], tcpPolicy[i][2]);
    }

    const udpInit = (listenPort, address, port) => {
        process.nextTick(() => {
            const info = {
                id: crypto.randomBytes(2).toString('hex'),
            };

            const next = nextPass(info);

            const sendJson = (json, chunk) => {
                next.next(serialize.create(json, chunk));
            };

            next.next();

            const udpBind = dgram.createSocket({
                type: 'udp6',
            }).once('listening', () => {
                sendJson(['udpassociate'], null);
            }).on('message', (msg, rinfo) => {
                if (
                    info.udpAddress !== rinfo.address
                    || info.udpPort !== rinfo.port
                ) {
                    console.log(
                        info.id + ' nat udp connect ' + address + ' ' + port
                    );

                    info.udpAddress = rinfo.address;
                    info.udpPort = rinfo.port;
                }

                sendJson(['message', address, port], msg);
            }).on('error', (err) => {
                console.error(info.id + ' udp error');

                if (config.log.network) {
                    console.error(err);
                }
            });

            // note: not chained according to the official docs
            udpBind.bind(listenPort);

            info.udpBind = udpBind;
        });
    };

    for (let i = 0; i < udpPolicy.length; i += 1) {
        udpInit(udpPolicy[i][0], udpPolicy[i][1], udpPolicy[i][2]);
    }

    return function *(info) {
        // TODO: 2-stage

        for (let data = yield; data !== null; data = yield) {
            const json = serialize.getJson(data);
            const chunk = serialize.getChunk(data);

            switch (json[0]) {
                case 'message':
                    if (!info.udpBind || !info.udpAddress || !info.udpPort) {
                        // non-null assertion

                        throw Error();
                    }

                    info.udpBind.send(chunk, info.udpPort, info.udpAddress);

                    break;
                case 'data':
                    if (!info.socket) {
                        // non-null assertion

                        throw Error();
                    }

                    info.socket.write(chunk);

                    break;
                case 'end':
                    if (!info.socket) {
                        // non-null assertion

                        throw Error();
                    }

                    info.socket.end();

                    break;
                default:
                    // ignore
            }
        }

        if (!info.socket) {
            // non-null assertion

            throw Error();
        }

        info.socket.emit('socks5server.close');

        if (info.udpBind) {
            info.udpBind.close();
        }
    };
};

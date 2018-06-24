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
    const tcpInit = (
        listenPort /*: number */,
        address /*: string */,
        port /*: number */
    ) /*: void */ => {
        net.createServer({
            allowHalfOpen: true,
        }).on('connection', (
            socket /*: net$Socket */
        ) /*: void */ => {
            const info = {
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

            console.log(
                info.id + ' nat tcp connect ' + address + ' ' + port
            );

            sendJson(['connect', address, port], null);

            socket.on('data', (
                chunk /*: Buffer */
            ) /*: void */ => {
                sendJson(['data'], chunk);
            }).once('end', () /*: void */ => {
                sendJson(['end'], null);
            }).once('close', () /*: void */ => {
                next.next(null);
            }).on('error', (
                err /*: error */
            ) /*: void */ => {
                console.error(info.id + ' tcp error');

                if (config.log.network) {
                    console.error(err);
                }
            });
        }).on('error', (
            err /*: error */
        ) /*: void */ => {
            console.error('tcp server error');

            if (config.log.network) {
                console.error(err);
            }
        }).listen(listenPort);
    };

    for (let i /*: number */ = 0; i < tcpPolicy.length; i += 1) {
        tcpInit(tcpPolicy[i][0], tcpPolicy[i][1], tcpPolicy[i][2]);
    }

    const udpInit = (
        listenPort /*: number */,
        address /*: string */,
        port /*: number */
    ) /*: void */ => {
        process.nextTick(() /*: void */ => {
            const info = {
                id: crypto.randomBytes(2).toString('hex'),
            };

            const next = nextPass(info);

            const sendJson = (
                json /*: Command */,
                chunk /*: Buffer | null */
            ) /*: void */ => {
                next.next(serialize.create(json, chunk));
            };

            next.next();

            const udpBind = dgram.createSocket({
                type: 'udp6',
            }).once('listening', () /*: void */ => {
                sendJson(['udpassociate'], null);
            }).on('message', (
                msg /*: Buffer */,
                rinfo
            ) /*: void */ => {
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
            }).on('error', (
                err /*: error */
            ) /*: void */ => {
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

    for (let i /*: number */ = 0; i < udpPolicy.length; i += 1) {
        udpInit(udpPolicy[i][0], udpPolicy[i][1], udpPolicy[i][2]);
    }

    return function *(
        info /*: Info */
    ) /*: Generator<void, void, Buffer | null> */ {
        // TODO: 2-stage

        for (
            let data /*: Buffer | null */ = yield;
            data !== null;
            data = yield
        ) {
            const json = serialize.getJson(data);
            const chunk = serialize.getChunk(data);

            switch (json[0]) {
                case 'message':
                    if (
                        !info.udpBind
                        || typeof info.udpAddress !== 'string'
                        || typeof info.udpPort !== 'number'
                    ) {
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

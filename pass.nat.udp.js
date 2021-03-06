'use strict';

const crypto = require('crypto');
const dgram = require('dgram');

const config = require('./config');
const serialize = require('./serialize');

module.exports = (
    nextPass /*: Pass */,
    udpPolicy /*: Array<[number, string, number]> */,
    reconnect /*: number */
) /*: Pass */ => {
    const udpInit = (
        listenPort /*: number */,
        address /*: string */,
        port /*: number */
    ) /*: void */ => {
        process.nextTick(() /*: void */ => {
            const info /*: Info */ = {
                id: crypto.randomBytes(2).toString('hex'),
            };

            const next /*: BufferGenerator */ = nextPass(info);

            const sendJson = (
                json /*: Command */,
                chunk /*: Buffer | null */
            ) /*: void */ => {
                next.next(serialize.create(json, chunk));
            };

            next.next();

            const udpBind /*: dgram$Socket */ = dgram.createSocket({
                type: 'udp6',
            }).once('listening', () /*: void */ => {
                sendJson(['udpassociate'], null);
            }).on('message', (
                msg /*: Buffer */,
                rinfo /*: dgram$Socket$rinfo */
            ) /*: void */ => {
                if (
                    info.udpAddress !== rinfo.address
                    || info.udpPort !== rinfo.port
                ) {
                    console.log(
                        info.id + ' nat udp ' + address + ' ' + port
                    );

                    info.udpAddress = rinfo.address;
                    info.udpPort = rinfo.port;
                }

                sendJson(['message', address, port], msg);
            }).once('close', () /*: void */ => {
                if (config.log.networkClose) {
                    console.error(info.id + ' nat udpBind close');
                }

                next.next(null);

                // reconnect
                setTimeout(() /*: void */ => {
                    udpInit(listenPort, address, port);
                }, reconnect);
            }).on('error', (
                err /*: error */
            ) /*: void */ => {
                if (config.log.networkError) {
                    console.error(info.id + ' nat udpBind error');
                }

                if (config.log.networkErrorDetail) {
                    console.error(err);
                }
            });

            // note: not chained according to the official docs
            udpBind.bind(listenPort);

            info.udpBind = udpBind;
        });
    };

    for (
        let i /*: number */ = 0;
        i < udpPolicy.length;
        i += 1
    ) {
        udpInit(udpPolicy[i][0], udpPolicy[i][1], udpPolicy[i][2]);
    }

    return function *(
        info /*: Info */
    ) /*: BufferGenerator */ {
        // TODO: 2-stage

        for (
            let data /*: Buffer | null */ = yield;
            data !== null;
            data = yield
        ) {
            const json /*: Command */ = serialize.getJson(data);
            const chunk /*: Buffer */ = serialize.getChunk(data);

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
                default:
                    // ignore
            }
        }

        if (info.udpBind) {
            info.udpBind.close();
        }
    };
};

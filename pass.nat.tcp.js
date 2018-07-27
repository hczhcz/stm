'use strict';

const crypto = require('crypto');
const net = require('net');

const config = require('./config');
const serialize = require('./serialize');

module.exports = (
    nextPass /*: Pass */,
    tcpPolicy /*: Array<[number, string, number]> */
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
            const info /*: Info */ = {
                id: crypto.randomBytes(2).toString('hex'),
                socket: socket,
            };

            const next /*: BufferGenerator */ = nextPass(info);

            const sendJson = (
                json /*: Command */,
                chunk /*: Buffer | null */
            ) /*: void */ => {
                next.next(serialize.create(json, chunk));
            };

            next.next();

            console.log(
                info.id + ' nat tcp ' + address + ' ' + port
            );

            sendJson(['connect', address, port], null);

            socket.on('data', (
                chunk /*: Buffer */
            ) /*: void */ => {
                sendJson(['data'], chunk);
            }).once('end', () /*: void */ => {
                sendJson(['end'], null);
            }).once('close', () /*: void */ => {
                if (config.log.networkClose) {
                    console.error(info.id + ' nat socket close');
                }

                next.next(null);
            }).once('timeout', () /*: void */ => {
                socket.destroy();
            }).on('error', (
                err /*: error */
            ) /*: void */ => {
                if (config.log.networkError) {
                    console.error(info.id + ' nat socket error');
                }

                if (config.log.networkErrorDetail) {
                    console.error(err);
                }
            }).setTimeout(30000);
        }).on('error', (
            err /*: error */
        ) /*: void */ => {
            if (config.log.networkError) {
                console.error('nat server error');
            }

            if (config.log.networkErrorDetail) {
                console.error(err);
            }
        }).listen(listenPort);
    };

    for (
        let i /*: number */ = 0;
        i < tcpPolicy.length;
        i += 1
    ) {
        tcpInit(tcpPolicy[i][0], tcpPolicy[i][1], tcpPolicy[i][2]);
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

        if (info.socket) {
            info.socket.destroy();
        }
    };
};

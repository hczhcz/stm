'use strict';

const crypto = require('crypto');
const net = require('net');

const config = require('./config');

module.exports = (
    nextPass /*: Pass */,
    port /*: number */
) /*: Pass */ => {
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

        next.next();

        socket.on('data', (
            chunk /*: Buffer */
        ) /*: void */ => {
            next.next(chunk);
        }).once('close', () /*: void */ => {
            next.next(null);
        }).on('error', (
            err /*: error */
        ) /*: void */ => {
            if (config.log.networkError) {
                console.error(info.id + ' tcp.server socket error');
            }

            if (config.log.networkErrorDetail) {
                console.error(err);
            }
        });
    }).on('error', (
        err /*: error */
    ) /*: void */ => {
        if (config.log.networkError) {
            console.error('tcp.server server error');
        }

        if (config.log.networkErrorDetail) {
            console.error(err);
        }
    }).listen(port);

    return function *(
        info /*: Info */
    ) /*: Generator<void, void, Buffer | null> */ {
        if (!info.socket) {
            // non-null assertion

            throw Error();
        }

        const socket = info.socket;

        for (
            let data /*: Buffer | null */ = yield;
            data !== null;
            data = yield
        ) {
            socket.write(data);
        }

        socket.destroy();
    };
};

'use strict';

const net = require('net');

const config = require('./config');

module.exports = (
    nextPass /*: Pass */,
    address /*: string */,
    port /*: number */
) /*: Pass */ => {
    return function *(
        info /*: Info */
    ) /*: Generator<void, void, Buffer | null> */ {
        const next = nextPass(info);

        const socket = net.createConnection({
            host: address,
            port: port,
            allowHalfOpen: true,
        }).once('connect', () /*: void */ => {
            next.next();
        }).on('data', (
            chunk /*: Buffer */
        ) /*: void */ => {
            next.next(chunk);
        }).once('close', () /*: void */ => {
            next.next(null);
        }).on('error', (
            err /*: error */
        ) /*: void */ => {
            if (config.log.networkError) {
                console.error(info.id + ' tcp.client socket error');
            }

            if (config.log.networkErrorDetail) {
                console.error(err);
            }
        });

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

'use strict';

const net = require('net');

const config = require('./config');

module.exports = (
    nextPass /*: Pass */,
    address /*: string */,
    port /*: number */
) /*: Pass */ => {
    return function *(info) {
        const next = nextPass(info);

        const socket = net.createConnection({
            host: address,
            port: port,
            allowHalfOpen: true,
        }).once('connect', () => {
            next.next();
        }).on('data', (chunk) => {
            next.next(chunk);
        }).once('close', () => {
            next.next(null);
        }).on('error', (err) => {
            console.error(info.id + ' tcp error');

            if (config.log.network) {
                console.error(err);
            }
        });

        for (let data = yield; data !== null; data = yield) {
            socket.write(data);
        }

        socket.destroy();
    };
};

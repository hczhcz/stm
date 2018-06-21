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
    }).on('connection', (socket) => {
        socket.pause();

        const info = {
            id: crypto.randomBytes(2).toString('hex'),
            socket: socket,
        };

        const next = nextPass(info);

        socket.on('data', (chunk) => {
            next.next(chunk);
        }).once('close', () => {
            next.next(null);
        }).on('error', (err) => {
            console.error(info.id + ' tcp error');

            if (config.log.network) {
                console.error(err);
            }
        }).resume();

        next.next();
    }).on('error', (err) => {
        console.error('tcp server error');

        if (config.log.network) {
            console.error(err);
        }
    }).listen(port);

    return function *(info) {
        if (!info.socket) {
            // non-null assertion

            throw Error();
        }

        const socket = info.socket;

        for (let data = yield; data !== null; data = yield) {

            socket.write(data);
        }

        socket.destroy();
    };
};

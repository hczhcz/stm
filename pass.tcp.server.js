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

        nextPass(info, (send, close) => {
            socket.on('data', (chunk) => {
                send(chunk);
            }).once('close', () => {
                close();
            }).on('error', (err) => {
                console.error(info.id + ' tcp error');

                if (config.log.network) {
                    console.error(err);
                }
            }).resume();
        });
    }).on('error', (err) => {
        console.error('tcp server error');

        if (config.log.network) {
            console.error(err);
        }
    }).listen(port);

    return (info, callback) => {
        callback((data) => {
            // send

            if (!info.socket) {
                // non-null assertion

                throw Error();
            }

            info.socket.write(data);
        }, () => {
            // close

            if (!info.socket) {
                // non-null assertion

                throw Error();
            }

            info.socket.destroy();
        });
    };
};

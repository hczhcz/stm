'use strict';

const crypto = require('crypto');
const net = require('net');

const config = require('./config');

module.exports = (
    port /*: number */
) /*: Pass */ => {
    const self = {
        next: null,

        open: (info, callback) => {
            callback((data) => {
                // send

                info.socket.write(data);
            }, () => {
                // close

                info.socket.destroy();
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

        const info = {
            id: crypto.randomBytes(2).toString('hex'),
            socket: socket,
        };

        self.next(info, (send, close) => {
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

    return self;
};

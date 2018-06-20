'use strict';

const net = require('net');

const config = require('./config');

module.exports = (
    nextPass /*: Pass */,
    address /*: string */,
    port /*: number */
) /*: Pass */ => {
    return (info, callback) => {
        nextPass(info, (send, close) => {
            const socket = net.createConnection({
                host: address,
                port: port,
                allowHalfOpen: true,
            }).once('connect', () => {
                callback((data) => {
                    // send

                    socket.write(data);
                }, () => {
                    // close

                    socket.destroy();
                });
            }).on('data', (chunk) => {
                send(chunk);
            }).once('close', () => {
                close();
            }).on('error', (err) => {
                console.error(info.id + ' tcp error');

                if (config.log.network) {
                    console.error(err);
                }
            });
        });
    };
};

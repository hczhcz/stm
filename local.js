'use strict';

const net = require('net');

const socks5 = require('./socks5');

const createLocal = () => {
    return new net.Server((socket) => {
        const handler = socks5.accept(
            socket,
            (addressType, address, port, connect, error) => {
                // connect
            },
            (addressType, address, port, bind, connect, error) => {
                // bind
            },
            (addressType, address, port, udpAssociate, error) => {
                // udp associate
            }
        );

        socket.on('data', (chunk) => {
            for (let i = 0; i < chunk.length; i += 1) {
                handler.next(chunk[i]);
            }
        }).on('error', (err) => {
            console.error('request error');
            console.error(err);
        }).on('end', () => {
            console.error('request end');

            // TODO: close server conn
        }).on('close', () => {
            console.error('request close');

            // TODO: close server conn
        });
    }).on('error', (err) => {
        console.error('server error');
        console.error(err);
    }).on('listening', () => {
        console.error('server listening');
    }).on('close', () => {
        console.error('server close');
    });
};

// module.exports = (options) => {
//     const self = this;
// };

// TODO
createLocal().listen(2333);

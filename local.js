'use strict';

const net = require('net');

const socks5parse = require('./socks5.parse');
const socks5write = require('./socks5.write');

const createLocal = () => {
    return new net.Server((socket) => {
        const handler = socks5parse.parseAuth(
            socket,
            socks5write.writeAuth,
            () => {
                return socks5parse.parseRequest(
                    socket,
                    socks5write.writeReply,
                    socks5write.writeError,
                    // TODO
                    function *(task) {
                        console.error(task);
                    }
                );
            }
        );

        handler.next();

        socket.on('data', (chunk) => {
            for (let i = 0; i < chunk.length; i += 1) {
                handler.next(chunk[i]);
            }
        });

        socket.on('error', (err) => {
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

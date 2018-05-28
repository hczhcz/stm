'use strict';

const socks5address = require('./socks5.address');
const socks5parse = require('./socks5.parse');

const init = (socket) => {
    socket.socks5sessions = {};

    socket.on('message', (msg, info) => {
        let parseDone = false;
        let i = 0;

        const handleClose = function *() {
        };

        const handler = socks5parse.parseUdp(
            socket,
            (task) => {
                // next

                socket.emit('socks5.step', 'message');

                parseDone = true;

                socket.emit('socks5client.message', info.address, info.port, socks5address.stringify(task), task.port, msg.slice(i + 1));

                return handleClose();
            },
            () => {
                // fragment error

                socket.emit('socks5.error', 'fragment');

                return handleClose();
            },
            () => {
                // address error

                socket.emit('socks5.error', 'address');

                return handleClose();
            },
            () => {
                // parse error

                socket.emit('socks5.error', 'parse');

                return handleClose();
            }
        );

        for (; i < msg.length; i += 1) {
            handler.next(msg[i]);

            if (parseDone) {
                break;
            }
        }
    }).on('socks5server.message', (localAddress, localPort, remoteAddress, remotePort, msg) => {
        socket.socks5sessions[localAddress + ':' + localPort](['message', remoteAddress, remotePort, msg]);
    });
};

module.exports = {
    init: init,
};

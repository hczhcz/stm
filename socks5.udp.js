'use strict';

const socks5address = require('./socks5.address');
const socks5parse = require('./socks5.parse');
const socks5write = require('./socks5.write');

const init = (
    socket /*: dgram$Socket */
) => {
    socket.on('message', (msg, address) => {
        let parseDone = false;
        let i = 0;

        const handleClose = function *() {
        };

        const handler = socks5parse.parseUDP(
            (task) => {
                // next

                socket.emit('socks5.step', 'message');

                parseDone = true;

                socket.emit('socks5client.message', address.address, address.port, socks5address.stringify(task), task.port, msg.slice(i + 1));

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
        const task = socks5address.parse(remoteAddress, remotePort);

        socks5write.writeUDP(socket, localAddress, localPort, task, msg);
    });
};

module.exports = {
    init: init,
};

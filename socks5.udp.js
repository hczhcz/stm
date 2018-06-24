'use strict';

const socks5address = require('./socks5.address');
const socks5parse = require('./socks5.parse');
const socks5write = require('./socks5.write');

const init = (
    socket /*: dgram$Socket */
) /*: void */ => {
    socket.on('message', (
        msg /*: Buffer */,
        rinfo /*: dgram$Socket$rinfo */
    ) /*: void */ => {
        let parseDone /*: boolean */ = false;
        let i /*: number */ = 0;

        const handler = socks5parse.parseUDP(
            (
                task /*: Task */
            ) /*: void */ => {
                // next

                socket.emit('socks5.step', 'message');

                parseDone = true;

                socket.emit(
                    'socks5client.message',
                    rinfo.address,
                    rinfo.port,
                    socks5address.stringify(task),
                    task.port,
                    msg.slice(i + 1)
                );
            },
            () /*: void */ => {
                // fragment error

                socket.emit('socks5.error', 'fragment');
            },
            () /*: void */ => {
                // address error

                socket.emit('socks5.error', 'address');
            },
            () /*: void */ => {
                // parse error

                socket.emit('socks5.error', 'parse');
            }
        );

        for (; i < msg.length; i += 1) {
            handler.next(msg[i]);

            if (parseDone) {
                break;
            }
        }
    }).on('socks5server.message', (
        localAddress /*: string */,
        localPort /*: number */,
        remoteAddress /*: string */,
        remotePort /*: number */,
        msg /*: Buffer */
    ) /*: void */ => {
        const task = socks5address.parse(remoteAddress, remotePort);

        socks5write.writeUDP(socket, localAddress, localPort, task, msg);
    });
};

module.exports = {
    init: init,
};

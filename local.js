'use strict';

const net = require('net');

const createLocal = () => {
    return new net.Server((socket) => {
        let res = null;

        const writeAuth = (method) => {
            // version: 5
            // method

            socket.write(new Buffer([
                0x05,
                method,
            ]));
        };

        const writeReply = (addressType, address, port) => {
            // version: 5
            // reply: succeeded
            // reserved

            socket.write(new Buffer([
                0x05,
                0x00,
                0x00,
            ]));

            // address type

            switch (addressType) {
                case 'ipv4':
                    socket.write(new Buffer([
                        0x01,
                    ]));

                    break;
                case 'domainname':
                    socket.write(new Buffer([
                        0x03,
                        address.length,
                    ]));

                    break;
                case 'ipv6':
                    socket.write(new Buffer([
                        0x04,
                    ]));

                    break;
            }

            socket.write(address);

            // port

            socket.write([
                port >>> 8, port & 0xff,
            ]);
        };

        const writeError = (reply) => {
            // version: 5
            // reply
            // reserved
            // address type: ipv4
            // address: 0.0.0.0
            // port: 0

            socket.write(new Buffer([
                0x05,
                reply,
                0x00,
                0x01,
                0x00, 0x00, 0x00, 0x00,
                0x00, 0x00,
            ]));
        };

        const authHandler = function* () {
            // version

            if ((yield) !== 0x05) {
                socket.end();

                return;
            }

            // method list

            const nMethods = yield;
            let auth = false;

            for (let i = 0; i < nMethods; i += 1) {
                if ((yield) === 0x00) {
                    auth = true;
                }
            }

            if (auth) {
                // method: no authentication required
                writeAuth(0x00);

                yield* requestHandler();
            } else {
                // method: no acceptable methods
                writeAuth(0xFF);
                socket.end();
            }
        };

        const requestHandler = function* () {
            // version

            if ((yield) !== 0x05) {
                socket.end();

                return;
            }

            let task = {};

            // command

            switch (yield) {
                case 0x01:
                    task.command = 'connect';

                    break;
                // case 0x02:
                //     task.command = 'bind';

                //     break;
                // case 0x03:
                //     task.command = 'udpassociate';

                //     break;
                default:
                    // reply: command not supported
                    writeError(0x07);
                    socket.end();

                    return;
            }

            // reserved

            yield;

            // address type

            switch (yield) {
                case 0x01:
                    task.addressType = 'ipv4';
                    task.address = new Buffer(4);

                    break;
                case 0x03:
                    task.addressType = 'domainname';
                    task.address = new Buffer(yield);

                    break;
                case 0x04:
                    task.addressType = 'ipv6';
                    task.address = new Buffer(16);

                    break;
                default:
                    // reply: address type not supported
                    writeError(0x07);
                    socket.end();

                    return;
            }

            // address

            for (let i = 0; i < task.address.length; i += 1) {
                task.address[i] = yield;
            }

            // port

            task.port = ((yield) << 8) + (yield);

            console.error(task); // TODO
        };

        const handler = authHandler();

        handler.next();

        socket.on('data', (chunk) => {
            for (let i = 0; i < chunk.length; i += 1) {
                handler.next(chunk[i]);
            }
        });

        const status = {
            pos: 0,
            auth: false,
        };

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

createLocal().listen(2333); // TODO

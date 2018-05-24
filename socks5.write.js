'use strict';

const writeAuth = (socket, method) => {
    // version: 5
    // method

    socket.write(new Buffer([
        0x05,
        method,
    ]));
};

const writeReply = (socket, addressType, address, port) => {
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

const writeError = (socket, reply) => {
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

module.exports = {
    writeAuth: writeAuth,
    writeReply: writeReply,
    writeError: writeError,
};

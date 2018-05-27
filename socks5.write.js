'use strict';

const writeAuth = (socket, method) => {
    // version: 5
    // method

    socket.write(Buffer.from([
        0x05,
        method,
    ]));
};

const writeReply = (socket, task) => {
    // version: 5
    // reply: succeeded
    // reserved

    socket.write(Buffer.from([
        0x05,
        0x00,
        0x00,
    ]));

    // address type

    switch (task.addressType) {
        case 'ipv4':
            socket.write(Buffer.from([
                0x01,
            ]));

            break;
        case 'domainname':
            socket.write(Buffer.from([
                0x03,
                task.address.length,
            ]));

            break;
        case 'ipv6':
            socket.write(Buffer.from([
                0x04,
            ]));

            break;
        default:
            // never reach
            throw Error();
    }

    // address

    socket.write(task.address);

    // port

    socket.write(Buffer.from([
        task.port >>> 8, task.port & 0xff,
    ]));
};

const writeError = (socket, reply) => {
    // version: 5
    // reply
    // reserved
    // address type: ipv4
    // address: 0.0.0.0
    // port: 0

    socket.write(Buffer.from([
        0x05,
        reply,
        0x00,
        0x01,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00,
    ]));
};

const writeErrorTCP = (socket, code) => {
    switch (code) {
        case 'ENETUNREACH':
            // reply: network unreachable
            writeError(socket, 0x03);

            break;
        case 'EHOSTUNREACH':
            // reply: host unreachable
            writeError(socket, 0x04);

            break;
        case 'ECONNREFUSED':
            // reply: connection refused
            writeError(socket, 0x05);

            break;
        default:
            // reply: general socks server failure
            writeError(socket, 0x01);
    }
};

module.exports = {
    writeAuth: writeAuth,
    writeReply: writeReply,
    writeError: writeError,
    writeErrorTCP: writeErrorTCP,
};

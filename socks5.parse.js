'use strict';

const parseAuth = function *(socket, writeAuth, next) {
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
        writeAuth(socket, 0x00);

        yield* next();
    } else {
        // method: no acceptable methods
        writeAuth(socket, 0xFF);
        socket.end();
    }
};

const parseRequest = function *(socket, writeReply, writeError, next) {
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
            writeError(socket, 0x07);
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
            writeError(socket, 0x07);
            socket.end();

            return;
    }

    // address

    for (let i = 0; i < task.address.length; i += 1) {
        task.address[i] = yield;
    }

    // port

    task.port = ((yield) << 8) + (yield);

    // TODO: reply?

    yield* next(task);
};

module.exports = {
    parseAuth: parseAuth,
    parseRequest: parseRequest,
}

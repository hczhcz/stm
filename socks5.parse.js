'use strict';

const parseAuth = function *(
    next /*: () => Generator<void, void, number> */,
    authError /*: () => void */,
    parseError /*: () => void */
) /*: Generator<void, void, number> */ {
    // version

    if ((yield) !== 0x05) {
        parseError();

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
        yield *next();
    } else {
        authError();
    }
};

const parseRequest = function *(
    next /*: (Task) => void */,
    commandError /*: () => void */,
    addressError /*: () => void */,
    parseError /*: () => void */
) /*: Generator<void, void, number> */ {
    // version

    if ((yield) !== 0x05) {
        parseError();

        return;
    }

    const task = {};

    // command

    switch (yield) {
        case 0x01:
            task.command = 'connect';

            break;
        case 0x02:
            task.command = 'bind';

            break;
        case 0x03:
            task.command = 'udpassociate';

            break;
        default:
            commandError();

            return;
    }

    // reserved

    if ((yield) !== 0x00) {
        parseError();

        return;
    }

    // address type

    switch (yield) {
        case 0x01:
            task.addressType = 'ipv4';
            task.address = Buffer.alloc(4);

            break;
        case 0x03:
            task.addressType = 'domainname';
            task.address = Buffer.alloc(yield);

            break;
        case 0x04:
            task.addressType = 'ipv6';
            task.address = Buffer.alloc(16);

            break;
        default:
            addressError();

            return;
    }

    // address

    for (let i = 0; i < task.address.length; i += 1) {
        task.address[i] = yield;
    }

    // port

    task.port = ((yield) << 8) + (yield);

    next(task);
};

const parseUDP = function *(
    next /*: (Task) => void */,
    fragmentError /*: () => void */,
    addressError /*: () => void */,
    parseError /*: () => void */
) /*: Generator<void, void, number> */ {
    // reserved

    if ((yield) !== 0x00 || (yield) !== 0x00) {
        parseError();

        return;
    }

    const task = {};

    // fragment

    if ((yield) !== 0x00) {
        // not supported
        fragmentError();

        return;
    }

    // address type

    switch (yield) {
        case 0x01:
            task.addressType = 'ipv4';
            task.address = Buffer.alloc(4);

            break;
        case 0x03:
            task.addressType = 'domainname';
            task.address = Buffer.alloc(yield);

            break;
        case 0x04:
            task.addressType = 'ipv6';
            task.address = Buffer.alloc(16);

            break;
        default:
            addressError();

            return;
    }

    // address

    for (let i = 0; i < task.address.length; i += 1) {
        task.address[i] = yield;
    }

    // port

    task.port = ((yield) << 8) + (yield);

    next(task);
};

module.exports = {
    parseAuth: parseAuth,
    parseRequest: parseRequest,
    parseUDP: parseUDP,
};

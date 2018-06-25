'use strict';

const parseAuth = function *(
    next /*: () => CharGenerator */,
    done /*: () => void */,
    authError /*: () => void */,
    parseError /*: () => void */
) /*: CharGenerator */ {
    // version

    if ((yield) !== 0x05) {
        parseError();

        return;
    }

    // method list

    const nMethods /*: number */ = yield;
    let auth /*: boolean */ = false;

    for (let i /*: number */ = 0; i < nMethods; i += 1) {
        if ((yield) === 0x00) {
            auth = true;
        }
    }

    if (auth) {
        done();

        yield *next();
    } else {
        authError();
    }
};

const parseRequest = function *(
    done /*: (Socks5Command, Socks5Task) => void */,
    commandError /*: () => void */,
    addressError /*: () => void */,
    parseError /*: () => void */
) /*: CharGenerator */ {
    // version

    if ((yield) !== 0x05) {
        parseError();

        return;
    }

    // command

    let command /*: Socks5Command | null */ = null;

    switch (yield) {
        case 0x01:
            command = 'connect';

            break;
        case 0x02:
            command = 'bind';

            break;
        case 0x03:
            command = 'udpassociate';

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

    let addressType /*: string | null */ = null;
    let address /*: Buffer | null */ = null;

    switch (yield) {
        case 0x01:
            addressType = 'ipv4';
            address = Buffer.alloc(4);

            break;
        case 0x03:
            addressType = 'domainname';
            address = Buffer.alloc(yield);

            break;
        case 0x04:
            addressType = 'ipv6';
            address = Buffer.alloc(16);

            break;
        default:
            addressError();

            return;
    }

    // address

    for (let i /*: number */ = 0; i < address.length; i += 1) {
        address[i] = yield;
    }

    // port

    const port /*: number */ = ((yield) << 8) + (yield);

    done(command, {
        addressType: addressType,
        address: address,
        port: port,
    });
};

const parseUDP = function *(
    done /*: (Socks5Task) => void */,
    fragmentError /*: () => void */,
    addressError /*: () => void */,
    parseError /*: () => void */
) /*: CharGenerator */ {
    // reserved

    if ((yield) !== 0x00 || (yield) !== 0x00) {
        parseError();

        return;
    }

    // fragment

    if ((yield) !== 0x00) {
        // not supported
        fragmentError();

        return;
    }

    // address type

    let addressType /*: string | null */ = null;
    let address /*: Buffer | null */ = null;

    switch (yield) {
        case 0x01:
            addressType = 'ipv4';
            address = Buffer.alloc(4);

            break;
        case 0x03:
            addressType = 'domainname';
            address = Buffer.alloc(yield);

            break;
        case 0x04:
            addressType = 'ipv6';
            address = Buffer.alloc(16);

            break;
        default:
            addressError();

            return;
    }

    // address

    for (let i /*: number */ = 0; i < address.length; i += 1) {
        address[i] = yield;
    }

    // port

    const port /*: number */ = ((yield) << 8) + (yield);

    done({
        addressType: addressType,
        address: address,
        port: port,
    });
};

module.exports = {
    parseAuth: parseAuth,
    parseRequest: parseRequest,
    parseUDP: parseUDP,
};

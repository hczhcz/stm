'use strict';

const net = require('net');

const stringify4 = (
    task /*: Socks5Task */
) /*: string */ => {
    return task.address.join('.');
};

const stringify6 = (
    task /*: Socks5Task */
) /*: string */ => {
    const sections /*: Array<string> */ = [];

    for (
        let i /*: number */ = 0;
        i < 16;
        i += 2
    ) {
        const num /*: number */ = (task.address[i] << 8)
            + task.address[i + 1];

        sections.push(num.toString(16));
    }

    return sections
        .join(':')
        .replace(/(^|:)0(:0)+(:|$)/, '$1::$3')
        .replace(/::::?/, '::');
};

const stringify = (
    task /*: Socks5Task */
) /*: string */ => {
    switch (task.addressType) {
        case 'ipv4':
            return stringify4(task);
        case 'domainname':
            return task.address.toString();
        case 'ipv6':
            return stringify6(task);
        default:
            // never reach
            throw Error();
    }
};

const parse4 = (
    address /*: string */
) /*: Buffer */ => {
    const sections /*: Array<string> */ = address.split('.', 4);

    return Buffer.from(sections.map((
        value /*: string */
    ) /*: number */ => {
        return parseInt(value, 10);
    }));
};

const parse6 = (
    address /*: string */
) /*: Buffer */ => {
    const sections /*: Array<string> */ = address.split(':', 8);
    const buffers /*: Array<Buffer> */ = [];

    let total /*: number */ = 0;

    for (
        let i /*: number */ = 0;
        i < sections.length;
        i += 1
    ) {
        if (net.isIPv4(sections[i])) {
            buffers[i] = parse4(sections[i]);
            total += 4;
        } else if (sections[i] !== '') {
            const value /*: number */ = parseInt(sections[i], 16);

            buffers[i] = Buffer.from([value >>> 8, value & 0xff]);
            total += 2;
        }
    }

    const result /*: Buffer */ = Buffer.alloc(16);

    let position /*: number */ = 0;

    for (
        let i /*: number */ = 0;
        i < buffers.length;
        i += 1
    ) {
        if (buffers[i] === '') {
            position += 16 - total;
            total = 16;
        } else {
            position += buffers[i].copy(result, position);
        }
    }

    return result;
};

const parse = (
    address /*: string */,
    port /*: number */
) /*: Socks5Task */ => {
    if (net.isIPv4(address)) {
        return {
            addressType: 'ipv4',
            address: parse4(address),
            port: port,
        };
    }

    if (net.isIPv6(address)) {
        return {
            addressType: 'ipv6',
            address: parse6(address),
            port: port,
        };
    }

    return {
        addressType: 'domainname',
        address: Buffer.from(address),
        port: port,
    };
};

module.exports = {
    stringify: stringify,
    parse: parse,
};

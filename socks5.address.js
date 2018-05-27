'use strict';

const net = require('net');

const stringify4 = (task) => {
    return task.address.join('.');
};

const stringify6 = (task) => {
    const sections = [];

    for (let i = 0; i < 16; i += 2) {
        const num = (task.address[i] << 8) + task.address[i + 1];

        sections.push(num.toString(16));
    }

    return sections
        .join(':')
        .replace(/(^|:)0(:0)+(:|$)/, '$1::$3')
        .replace(/::::?/, '::');
};

const stringify = (task) => {
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

const parse4 = (address) => {
    return Buffer.from(address.split('.', 4).map((value) => {
        return parseInt(value, 10);
    }));
};

const parse6 = (address) => {
    const sections = address.split(':', 8);

    let total = 0;

    for (const i in sections) {
        if (net.isIPv4(sections[i])) {
            sections[i] = parse4(sections[i]);
            total += 4;
        } else if (sections[i] !== '') {
            const value = parseInt(sections[i], 16);

            sections[i] = Buffer.alloc(2);
            sections[i].writeUInt16BE(value);
            total += 2;
        }
    }

    const result = Buffer.alloc(16);

    let position = 0;

    for (const i in sections) {
        if (sections[i] === '') {
            position += 16 - total;
            total = 16;
        } else {
            position += sections[i].copy(result, position);
        }
    }

    return result;
};

const parse = (address) => {
    const task = {};

    if (net.isIPv4(address)) {
        task.addressType = 'ipv4';
        task.address = parse4(address);
    } else if (net.isIPv6(address)) {
        task.addressType = 'ipv6';
        task.address = parse6(address);
    } else {
        task.addressType = 'domainname';
        task.address = Buffer.from(address);
    }

    return task;
};

module.exports = {
    stringify: stringify,
    parse: parse,
};

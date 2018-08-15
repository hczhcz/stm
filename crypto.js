'use strict';

const crypto = require('crypto');

const cryptoInfo = require('./crypto.info');

const createNonce = (
    nonceLength /*: number */
) /*: Buffer */ => {
    return crypto.randomBytes(nonceLength);
};

const createCipher = (
    algorithm /*: string */,
    password /*: string */,
    nonce /*: Buffer */
) /*: crypto$Cipher */ => {
    const key /*: Buffer */ = crypto.scryptSync(
        password + 'key',
        nonce,
        cryptoInfo[algorithm][0] || nonce.length
    );
    const iv /*: Buffer */ = crypto.scryptSync(
        password + 'iv',
        nonce,
        cryptoInfo[algorithm][1] || nonce.length
    );

    return crypto.createCipheriv(algorithm, key, iv);
};

const createDecipher = (
    algorithm /*: string */,
    password /*: string */,
    nonce /*: Buffer */
) /*: crypto$Decipher */ => {
    const key /*: Buffer */ = crypto.scryptSync(
        password + 'key',
        nonce,
        cryptoInfo[algorithm][0] || nonce.length
    );
    const iv /*: Buffer */ = crypto.scryptSync(
        password + 'iv',
        nonce,
        cryptoInfo[algorithm][1] || nonce.length
    );

    return crypto.createDecipheriv(algorithm, key, iv);
};

const createHmac = (
    algorithm /*: string */,
    password /*: string */,
    nonce /*: Buffer */
) /*: () => crypto$Hmac */ => {
    const key /*: Buffer */ = crypto.scryptSync(
        password + 'hmac',
        nonce,
        nonce.length
    );

    return () /*: crypto$Hmac */ => {
        return crypto.createHmac(algorithm, key);
    };
};

module.exports = {
    createNonce: createNonce,
    createCipher: createCipher,
    createDecipher: createDecipher,
    createHmac: createHmac,
};

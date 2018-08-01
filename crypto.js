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
    return crypto.createCipheriv(
        algorithm,
        crypto.scryptSync(
            password + 'key',
            nonce,
            cryptoInfo[algorithm][0] || nonce.length
        ),
        crypto.scryptSync(
            password + 'iv',
            nonce,
            cryptoInfo[algorithm][1] || nonce.length
        )
    );
};

const createDecipher = (
    algorithm /*: string */,
    password /*: string */,
    nonce /*: Buffer */
) /*: crypto$Decipher */ => {
    return crypto.createDecipheriv(
        algorithm,
        crypto.scryptSync(
            password + 'key',
            nonce,
            cryptoInfo[algorithm][0] || nonce.length
        ),
        crypto.scryptSync(
            password + 'iv',
            nonce,
            cryptoInfo[algorithm][1] || nonce.length
        )
    );
};

module.exports = {
    createNonce: createNonce,
    createCipher: createCipher,
    createDecipher: createDecipher,
};

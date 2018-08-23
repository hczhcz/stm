'use strict';

const crypto = require('crypto');

const cryptoInfo = require('./crypto.info');

const createNonce = (
    nonceLength /*: number */
) /*: Buffer */ => {
    return crypto.randomBytes(nonceLength);
};

const createKey = (
    algorithm /*: string */,
    password /*: string */,
    nonce /*: Buffer */,
    length /*: number */
) /*: Buffer */ => {
    if (algorithm.startsWith('pbkdf2-')) {
        return crypto.pbkdf2Sync(
            password,
            nonce,
            100000,
            length,
            algorithm.slice(7)
        );
    }

    if (algorithm === 'scrypt') {
        return crypto.scryptSync(
            password,
            nonce,
            length
        );
    }

    const hmac /*: crypto$Hmac */ = crypto.createHmac(algorithm, nonce);

    hmac.update(password);

    return hmac.digest().slice(0, length);
};

const createCipher = (
    algorithm /*: string */,
    kdAlgorithm /*: string */,
    password /*: string */,
    nonce /*: Buffer */
) /*: crypto$Cipher */ => {
    const key /*: Buffer */ = createKey(
        kdAlgorithm,
        password + 'key',
        nonce,
        cryptoInfo[algorithm][0] || nonce.length
    );
    const iv /*: Buffer */ = createKey(
        kdAlgorithm,
        password + 'iv',
        nonce,
        cryptoInfo[algorithm][1] || nonce.length
    );

    return crypto.createCipheriv(algorithm, key, iv);
};

const createDecipher = (
    algorithm /*: string */,
    kdAlgorithm /*: string */,
    password /*: string */,
    nonce /*: Buffer */
) /*: crypto$Decipher */ => {
    const key /*: Buffer */ = createKey(
        kdAlgorithm,
        password + 'key',
        nonce,
        cryptoInfo[algorithm][0] || nonce.length
    );
    const iv /*: Buffer */ = createKey(
        kdAlgorithm,
        password + 'iv',
        nonce,
        cryptoInfo[algorithm][1] || nonce.length
    );

    return crypto.createDecipheriv(algorithm, key, iv);
};

const createHmac = (
    algorithm /*: string */,
    kdAlgorithm /*: string */,
    password /*: string */,
    nonce /*: Buffer */
) /*: () => crypto$Hmac */ => {
    const key /*: Buffer */ = createKey(
        kdAlgorithm,
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

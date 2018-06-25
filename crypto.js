'use strict';

const crypto = require('crypto');

const cryptoInfo = require('./crypto.info');

const hmac256 = (
    password /*: string */,
    str /*: string */,
    nonce /*: Buffer */
) /*: Buffer */ => {
    const hmac = crypto.createHmac('sha256', password);

    hmac.update(str);
    hmac.update(nonce);

    return hmac.digest();
};

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
        hmac256(password, 'key', nonce).slice(
            0,
            cryptoInfo[algorithm][0] || nonce.length
        ),
        hmac256(password, 'iv', nonce).slice(
            0,
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
        hmac256(password, 'key', nonce).slice(
            0,
            cryptoInfo[algorithm][0] || nonce.length
        ),
        hmac256(password, 'iv', nonce).slice(
            0,
            cryptoInfo[algorithm][1] || nonce.length
        )
    );
};

module.exports = {
    createNonce: createNonce,
    createCipher: createCipher,
    createDecipher: createDecipher,
};

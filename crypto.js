'use strict';

const crypto = require('crypto');

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
    keyLength /*: number */,
    ivLength /*: number */,
    password /*: string */,
    nonce /*: Buffer */
) /*: crypto$Cipher */ => {
    return crypto.createCipheriv(
        algorithm,
        hmac256(password, 'key', nonce).slice(0, keyLength),
        hmac256(password, 'iv', nonce).slice(0, ivLength)
    );
};

const createDecipher = (
    algorithm /*: string */,
    keyLength /*: number */,
    ivLength /*: number */,
    password /*: string */,
    nonce /*: Buffer */
) /*: crypto$Decipher */ => {
    return crypto.createDecipheriv(
        algorithm,
        hmac256(password, 'key', nonce).slice(0, keyLength),
        hmac256(password, 'iv', nonce).slice(0, ivLength)
    );
};

module.exports = {
    createNonce: createNonce,
    createCipher: createCipher,
    createDecipher: createDecipher,
};

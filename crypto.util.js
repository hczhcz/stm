'use strict';

const crypto = require('crypto');

const hash256 = (
    str /*: string */,
    nonce /*: Buffer */
) /*: Buffer */ => {
    const hash = crypto.createHash('sha256');

    hash.update(str);
    hash.update(nonce);

    return hash.digest();
};

const encryptInit = (
    algorithm /*: string */,
    keyLength /*: number */,
    ivLength /*: number */,
    password /*: string */,
    nonce /*: Buffer */
) /*: crypto$Cipher */ => {
    return crypto.createCipheriv(
        algorithm,
        hash256(password, nonce).slice(0, keyLength),
        hash256('iv', nonce).slice(0, ivLength)
    );
};

const decryptInit = (
    algorithm /*: string */,
    keyLength /*: number */,
    ivLength /*: number */,
    password /*: string */,
    nonce /*: Buffer */
) /*: crypto$Decipher */ => {
    return crypto.createDecipheriv(
        algorithm,
        hash256(password, nonce).slice(0, keyLength),
        hash256('iv', nonce).slice(0, ivLength)
    );
};

module.exports = {
    encryptInit: encryptInit,
    decryptInit: decryptInit,
};

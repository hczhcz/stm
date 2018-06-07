'use strict';

const crypto = require('crypto');

const hash256 = (data, nonce) => {
    const hash = crypto.createHash('sha256');

    hash.update(data);
    hash.update(nonce);

    return hash.digest();
};

const encryptInit = (algorithm, keyLength, ivLength, password, nonce) => {
    return crypto.createCipheriv(
        algorithm,
        hash256(password, nonce).slice(0, keyLength),
        hash256('iv', nonce).slice(0, ivLength)
    );
};

const decryptInit = (algorithm, keyLength, ivLength, password, nonce) => {
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

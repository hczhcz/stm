'use strict';

const crypto = require('crypto');

const hash256 = (data) => {
    const hash = crypto.createHash('sha256');

    hash.update(data);

    return hash.digest();
};

// TODO: prevent replay attack?

const encryptInit = (algorithm, password, iv) => {
    return crypto.createCipheriv(algorithm, hash256(password), hash256(iv).slice(16));
};

const decryptInit = (algorithm, password, iv) => {
    return crypto.createDecipheriv(algorithm, hash256(password), hash256(iv).slice(16));
};

module.exports = {
    encryptInit: encryptInit,
    decryptInit: decryptInit,
};

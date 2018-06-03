'use strict';

const crypto = require('crypto');

const hash256 = (data) => {
    const hash = crypto.createHash('sha256');

    hash.update(data);

    return hash.digest();
};

// TODO: prevent replay attack?

const encryptInit = (password, iv) => {
    return crypto.createCipheriv('aes-256-cfb', hash256(password), hash256(iv).slice(16));
};

const decryptInit = (password, iv) => {
    return crypto.createDecipheriv('aes-256-cfb', hash256(password), hash256(iv).slice(16));
};

module.exports = {
    encryptInit: encryptInit,
    decryptInit: decryptInit,
};

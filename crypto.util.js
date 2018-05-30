'use strict';

const crypto = require('crypto');

const hash256 = (data) => {
    const hash = crypto.createHash('sha256');

    hash.update(data);

    return hash.digest();
};

// TODO: prevent replay attack?

const encryptInit = (password, iv) => {
    return crypto.createCipheriv('aes-256-gcm', hash256(password), iv);
};

const decryptInit = (password, iv) => {
    return crypto.createDecipheriv('aes-256-gcm', hash256(password), iv);
};

module.exports = {
    encryptInit: encryptInit,
    decryptInit: decryptInit,
};

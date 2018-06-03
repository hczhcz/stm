'use strict';

const crypto = require('crypto');
const cryptoUtil = require('./crypto.util');

module.exports = (password) => {
    let next = null;

    return {
        pipe: (piped) => {
            next = piped.open;

            return piped;
        },

        open: (callback) => {
            next((send, close) => {
                const iv = crypto.randomBytes(16);
                const cipher = cryptoUtil.encryptInit(password, iv);

                send(iv);

                callback((data) => {
                    // send

                    send(cipher.update(data));
                }, () => {
                    // close

                    send(cipher.final());
                    close();
                });
            });
        },
    };
};

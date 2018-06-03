'use strict';

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
                const cipher = cryptoUtil.encryptInit(password, 'TODO');

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

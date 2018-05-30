'use strict';

const cryptoUtil = require('./crypto.util');

module.exports = (password) => {
    let next = null;

    return {
        pipe: (piped) => {
            next = piped.open;

            return piped;
        },

        open: (id, callback) => {
            next(id, (send, close) => {
                const cipher = cryptoUtil.encryptInit(password, id);

                callback((data) => {
                    // send

                    send(cipher.update(data));
                }, () => {
                    // close

                    // send(cipher.final());
                    close();
                });
            });
        },
    };
};

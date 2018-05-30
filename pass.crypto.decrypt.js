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
                const decipher = cryptoUtil.decryptInit(password, id);

                callback((data) => {
                    // send

                    send(decipher.update(data));
                }, () => {
                    // close

                    // send(decipher.final());
                    close();
                });
            });
        },
    };
};

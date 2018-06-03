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
                const decipher = cryptoUtil.decryptInit(password, 'TODO');

                callback((data) => {
                    // send

                    send(decipher.update(data));
                }, () => {
                    // close

                    send(decipher.final());
                    close();
                });
            });
        },
    };
};

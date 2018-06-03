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
                let iv = Buffer.alloc(0);
                let decipher = null;

                callback((data) => {
                    // send

                    if (decipher) {
                        send(decipher.update(data));
                    } else {
                        iv = Buffer.concat([iv, data]);

                        if (iv.length >= 16) {
                            decipher = cryptoUtil.decryptInit(password, iv.slice(0, 16));

                            send(decipher.update(iv.slice(16)));
                        }
                    }
                }, () => {
                    // close

                    send(decipher.final());
                    close();
                });
            });
        },
    };
};

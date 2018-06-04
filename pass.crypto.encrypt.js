'use strict';

const crypto = require('crypto');
const cryptoUtil = require('./crypto.util');

module.exports = (algorithm, password) => {
    let next = null;

    return {
        pipe: (piped) => {
            next = piped.open;

            return piped;
        },

        open: (callback) => {
            next((send, close) => {
                const iv = crypto.randomBytes(16);
                const cipher = cryptoUtil.encryptInit(algorithm, password, iv);

                send(iv);

                // verification info

                const header = Buffer.alloc(8);

                header.writeUInt32BE(0xDEADBEEF, 0);
                header.writeUInt32BE(Math.floor(Date.now() / 1000 / 60), 4);

                send(cipher.update(header));

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

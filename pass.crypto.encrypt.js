'use strict';

const crypto = require('crypto');

const cryptoUtil = require('./crypto.util');

module.exports = (algorithm, keyLength, ivLength, password) => {
    const self = {
        next: null,

        open: (info, callback) => {
            self.next(info, (send, close) => {
                const nonceLength = Math.min(keyLength + ivLength, 32);

                const nonce = crypto.randomBytes(nonceLength);
                const cipher = cryptoUtil.encryptInit(algorithm, keyLength, ivLength, password, nonce);

                send(nonce);

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

                    if (cipher.final().length) {
                        // note: should be flushed earlier
                        throw Error();
                    }

                    close();
                });
            });
        },
    };

    return self;
};

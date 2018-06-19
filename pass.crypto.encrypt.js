'use strict';

const crypto = require('./crypto');

module.exports = (
    algorithm /*: string */,
    keyLength /*: number */,
    ivLength /*: number */,
    password /*: string */
) /*: Pass */ => {
    const self = {
        next: null,

        open: (info, callback) => {
            if (!self.next) {
                // non-null assertion

                throw Error();
            }

            const nonceLength = Math.min(keyLength + ivLength, 32);

            const nonce = crypto.createNonce(nonceLength);
            const cipher = crypto.createCipher(
                algorithm,
                keyLength,
                ivLength,
                password,
                nonce
            );

            // verification info

            const header = Buffer.alloc(8);

            header.writeUInt32BE(0xDEADBEEF, 0);
            header.writeUInt32BE(Math.floor(Date.now() / 1000 / 60), 4);

            self.next(info, (send, close) => {
                send(nonce);
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

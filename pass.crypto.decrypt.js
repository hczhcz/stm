'use strict';

const cryptoUtil = require('./crypto.util');

module.exports = (
    algorithm /*: string */,
    keyLength /*: number */,
    ivLength /*: number */,
    password /*: string */
) /*: Pass */ => {
    let nonceSet = {};

    const self = {
        next: null,

        open: (info, callback) => {
            if (!self.next) {
                // non-null assertion

                throw Error();
            }

            self.next(info, (send, close) => {
                let buffer = Buffer.alloc(0);

                const nonceLength = Math.min(keyLength + ivLength, 32);

                let nonce = null;
                let decipher = null;

                let verified = false;
                let failed = false;

                const verify = () => {
                    if (!nonce || !decipher) {
                        // non-null assertion

                        throw Error();
                    }

                    if (buffer.length >= 8) {
                        const magic = buffer.readUInt32BE(0);
                        const timestamp = buffer.readUInt32BE(4);

                        buffer = buffer.slice(8);

                        const nonceString = '#' + nonce.toString('hex');
                        const now = Math.floor(Date.now() / 1000 / 60);

                        const oldNonceSet = nonceSet;

                        nonceSet = {};
                        nonceSet[now - 1] = oldNonceSet[now - 1] || {};
                        nonceSet[now] = oldNonceSet[now] || {};
                        nonceSet[now + 1] = oldNonceSet[now + 1] || {};

                        if (
                            magic === 0xDEADBEEF
                            && timestamp in nonceSet
                            && !(nonceString in nonceSet[timestamp])
                        ) {
                            nonceSet[timestamp][nonceString] = true;
                            verified = true;

                            send(buffer);
                        } else {
                            failed = true;

                            close();
                        }
                    }
                };

                const parse = () => {
                    if (buffer.length >= nonceLength) {
                        nonce = buffer.slice(0, nonceLength);
                        decipher = cryptoUtil.decryptInit(
                            algorithm,
                            keyLength,
                            ivLength,
                            password,
                            nonce
                        );

                        buffer = decipher.update(buffer.slice(nonceLength));

                        verify();
                    }
                };

                callback((data) => {
                    // send

                    if (decipher) {
                        if (verified) {
                            send(decipher.update(data));
                        } else {
                            buffer = Buffer.concat([
                                buffer,
                                decipher.update(data),
                            ]);

                            verify();
                        }
                    } else {
                        buffer = Buffer.concat([buffer, data]);

                        parse();
                    }
                }, () => {
                    // close

                    if (decipher && decipher.final().length) {
                        // note: should be flushed earlier

                        throw Error();
                    }

                    if (!failed) {
                        close();
                    }
                });
            });
        },
    };

    return self;
};

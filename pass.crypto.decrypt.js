'use strict';

const cryptoUtil = require('./crypto.util');

module.exports = (algorithm, keyLength, ivLength, password) => {
    let nonceSet = {};

    const self = {
        next: null,

        open: (info, callback) => {
            self.next(info, (send, close) => {
                const nonceLength = Math.min(keyLength + ivLength, 32);

                let buffer = Buffer.alloc(0);

                let nonce = null;
                let decipher = null;

                let verified = false;
                let failed = false;

                const verify = () => {
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
                        decipher = cryptoUtil.decryptInit(algorithm, keyLength, ivLength, password, nonce);

                        buffer = decipher.update(buffer.slice(nonceLength));

                        verify();
                    }
                };

                callback((data) => {
                    // send

                    if (verified) {
                        send(decipher.update(data));
                    } else if (decipher) {
                        buffer = Buffer.concat([buffer, decipher.update(data)]);

                        verify();
                    } else {
                        buffer = Buffer.concat([buffer, data]);

                        parse();
                    }
                }, () => {
                    // close

                    if (verified && decipher.final().length) {
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

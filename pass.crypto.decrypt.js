'use strict';

const cryptoUtil = require('./crypto.util');

module.exports = (algorithm, password) => {
    let ivSet = {};

    let next = null;

    return {
        pipe: (piped) => {
            next = piped.open;

            return piped;
        },

        open: (info, callback) => {
            next(info, (send, close) => {
                let buffer = Buffer.alloc(0);

                let iv = null;
                let decipher = null;

                let verified = false;
                let failed = false;

                const verify = () => {
                    if (buffer.length >= 8) {
                        const magic = buffer.readUInt32BE(0);
                        const timestamp = buffer.readUInt32BE(4);

                        buffer = buffer.slice(8);

                        const ivString = 'iv_' + iv.toString('hex');
                        const now = Math.floor(Date.now() / 1000 / 60);

                        const oldIvSet = ivSet;

                        ivSet = {};
                        ivSet[now - 1] = oldIvSet[now - 1] || {};
                        ivSet[now] = oldIvSet[now] || {};
                        ivSet[now + 1] = oldIvSet[now + 1] || {};

                        if (
                            magic === 0xDEADBEEF
                            && timestamp in ivSet
                            && !(ivString in ivSet[timestamp])
                        ) {
                            ivSet[timestamp][ivString] = true;
                            verified = true;

                            send(buffer);
                        } else {
                            failed = true;
                            close();
                        }
                    }
                };

                const parse = () => {
                    if (buffer.length >= 16) {
                        iv = buffer.slice(0, 16);
                        decipher = cryptoUtil.decryptInit(algorithm, password, iv);

                        buffer = decipher.update(buffer.slice(16));

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

                    if (verified) {
                        send(decipher.final());
                    }

                    if (!failed) {
                        close();
                    }
                });
            });
        },
    };
};

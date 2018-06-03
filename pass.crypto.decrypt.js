'use strict';

const cryptoUtil = require('./crypto.util');

module.exports = (password) => {
    const ivSet = {};

    let next = null;

    return {
        pipe: (piped) => {
            next = piped.open;

            return piped;
        },

        open: (callback) => {
            next((send, close) => {
                let buffer = Buffer.alloc(0);

                let iv = null;
                let decipher = null;

                let verified = false;

                const verify = () => {
                    if (buffer.length >= 8) {
                        const magic = buffer.readUInt32BE(0);
                        const timestamp = buffer.readUInt32BE(4);

                        buffer = buffer.slice(8);

                        const ivString = 'iv_' + iv.toString('hex');
                        const now = Math.floor(Date.now() / 1000 / 60);

                        if (
                            magic === 0xDEADBEEF
                            && timestamp <= now + 1
                            && timestamp >= now - 1
                            && !(ivString in ivSet)
                        ) {
                            ivSet[ivString] = timestamp;
                            verified = true;

                            send(buffer);
                        } else {
                            close();
                        }
                    }
                };

                const parse = () => {
                    if (buffer.length >= 16) {
                        iv = buffer.slice(0, 16);
                        decipher = cryptoUtil.decryptInit(password, iv);

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

                    send(decipher.final());
                    close();
                });
            });
        },
    };
};

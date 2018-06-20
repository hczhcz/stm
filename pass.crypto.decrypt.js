'use strict';

const crypto = require('./crypto');

module.exports = (
    nextPass /*: Pass */,
    algorithm /*: string */,
    keyLength /*: number */,
    ivLength /*: number */,
    password /*: string */
) /*: Pass */ => {
    let nonceSet = {};

    return function *(info) {
        const next = nextPass(info);

        let buffer = Buffer.alloc(0);

        const nonceLength = Math.min(keyLength + ivLength, 32);

        let nonce = null;
        let decipher = null;

        next.next();

        for (let data = yield; true; data = yield) {
            if (data === null) {
                next.next(null);

                return;
            }

            buffer = Buffer.concat([buffer, data]);

            if (buffer.length >= nonceLength) {
                nonce = buffer.slice(0, nonceLength);
                decipher = crypto.createDecipher(
                    algorithm,
                    keyLength,
                    ivLength,
                    password,
                    nonce
                );

                buffer = decipher.update(buffer.slice(nonceLength));

                break;
            }
        }

        if (!nonce || !decipher) {
            // non-null assertion

            throw Error();
        }

        for (let data = yield; true; data = yield) {
            if (data === null) {
                next.next(null);

                return;
            }

            buffer = Buffer.concat([buffer, decipher.update(data)]);

            if (buffer.length >= 8) {
                const magic = buffer.readUInt32BE(0);
                const timestamp = buffer.readUInt32BE(4);

                buffer = buffer.slice(8);

                const nonceString = '#' + nonce.toString('hex');
                const now = Math.floor(Date.now() / 1000 / 60);

                // TODO: move to a new function

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

                    next.next(buffer);

                    break;
                } else {
                    next.next(null);

                    return;
                }
            }
        }

        for (let data = yield; data !== null; data = yield) {
            next.next(decipher.update(data));
        }

        if (decipher.final().length) {
            // note: should be flushed earlier

            throw Error();
        }

        next.next(null);
    };
};

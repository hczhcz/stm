'use strict';

const crypto = require('./crypto');

module.exports = (
    nextPass /*: Pass */,
    algorithm /*: string */,
    keyLength /*: number */,
    ivLength /*: number */,
    password /*: string */
) /*: Pass */ => {
    return function *(info) {
        const next = nextPass(info);

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

        next.next();

        next.next(nonce);
        next.next(cipher.update(header));

        for (let data = yield; data !== null; data = yield) {
            next.next(cipher.update(data));
        }

        if (cipher.final().length) {
            // note: should be flushed earlier

            throw Error();
        }

        next.next(null);
    };
};

'use strict';

const crypto = require('./crypto');

module.exports = (
    nextPass /*: Pass */,
    cipherAlgorithm /*: string */,
    hashAlgorithm /*: string | null */,
    nonceLength /*: number */,
    password /*: string */
) /*: Pass */ => {
    return function *(
        info /*: Info */
    ) /*: BufferGenerator */ {
        const next /*: BufferGenerator */ = nextPass(info);

        const nonce /*: Buffer */ = crypto.createNonce(nonceLength);
        const cipher /*: crypto$Cipher */ = crypto.createCipher(
            cipherAlgorithm,
            password,
            nonce
        );

        // verification info

        const header /*: Buffer */ = Buffer.alloc(4);

        header.writeUInt32BE(Math.floor(Date.now() / 1000 / 60), 0);

        next.next();

        const firstData /*: Buffer | null */ = yield;

        if (firstData === null) {
            next.next(null);

            return;
        }

        next.next(Buffer.concat([
            nonce,
            cipher.update(header),
            cipher.update(firstData),
        ]));

        for (
            let data /*: Buffer | null */ = yield;
            data !== null;
            data = yield
        ) {
            next.next(cipher.update(data));
        }

        if (cipher.final().length) {
            // note: should be flushed earlier

            throw Error();
        }

        next.next(null);
    };
};

'use strict';

const crypto = require('./crypto');

module.exports = (
    nextPass /*: Pass */,
    cipherAlgorithm /*: string */,
    hashAlgorithm /*: string */,
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
        const hmacGenerator /*: () => crypto$Hmac */ = crypto.createHmac(
            hashAlgorithm,
            password,
            nonce
        );

        const encrypt = (
            data /*: Buffer */
        ) /*: Buffer */ => {
            if (hashAlgorithm === 'unauthorized') {
                return cipher.update(data);
            }

            const encrypted /*: Buffer */ = cipher.update(data);

            const hmac /*: crypto$Hmac */ = hmacGenerator();

            hmac.update(encrypted);

            return Buffer.concat([
                encrypted,
                cipher.update(hmac.digest()),
            ]);
        };

        const encryptAny = (
            data /*: Buffer */
        ) /*: Buffer */ => {
            if (hashAlgorithm === 'unauthorized') {
                return cipher.update(data);
            }

            const header /*: Buffer */ = Buffer.alloc(4);

            header.writeUInt32BE(data.length, 0);

            return Buffer.concat([
                encrypt(header),
                encrypt(data),
            ]);
        };

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
            encrypt(header),
            encryptAny(firstData),
        ]));

        for (
            let data /*: Buffer | null */ = yield;
            data !== null;
            data = yield
        ) {
            next.next(encryptAny(data));
        }

        if (cipher.final().length) {
            // note: should be flushed earlier

            throw Error();
        }

        next.next(null);
    };
};

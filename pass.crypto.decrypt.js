'use strict';

const crypto = require('./crypto');

module.exports = (
    nextPass /*: Pass */,
    cipherAlgorithm /*: string */,
    hashAlgorithm /*: string */,
    nonceLength /*: number */,
    password /*: string */,
    hang /*: boolean */
) /*: Pass */ => {
    let nonceSet /*: CryptoNonceSet */ = {};

    const addNonce = (
        nonce /*: Buffer */,
        timestamp /*: number */
    ) /*: boolean */ => {
        const oldNonceSet /*: CryptoNonceSet */ = nonceSet;

        const nonceString /*: string */ = '#' + nonce.toString('hex');
        const now /*: number */ = Math.floor(Date.now() / 1000 / 60);

        nonceSet = {};
        nonceSet[now - 1] = oldNonceSet[now - 1] || {};
        nonceSet[now] = oldNonceSet[now] || {};
        nonceSet[now + 1] = oldNonceSet[now + 1] || {};

        if (timestamp in nonceSet && !(nonceString in nonceSet[timestamp])) {
            nonceSet[timestamp][nonceString] = true;

            return true;
        }

        return false;
    };

    return function *(
        info /*: Info */
    ) /*: BufferGenerator */ {
        const next /*: BufferGenerator */ = nextPass(info);

        let buffer /*: Buffer */ = Buffer.alloc(0);

        next.next();

        while (buffer.length < nonceLength) {
            const data /*: Buffer | null */ = yield;

            if (data === null) {
                next.next(null);

                return;
            }

            buffer = Buffer.concat([buffer, data]);
        }

        const nonce /*: Buffer */ = buffer.slice(0, nonceLength);
        const decipher /*: crypto$Decipher */ = crypto.createDecipher(
            cipherAlgorithm,
            password,
            nonce
        );
        const hmac /*: () => crypto$Hmac */ = crypto.createHmac(
            hashAlgorithm,
            password,
            nonce
        );

        buffer = buffer.slice(nonceLength);

        let result /*: Buffer | null */ = null;

        const fetch = function *(
            size /*: number */
        ) /*: BufferGenerator */ {
            while (buffer.length < size) {
                const data /*: Buffer | null */ = yield;

                if (data === null) {
                    result = null;

                    return;
                }

                buffer = Buffer.concat([buffer, data]);
            }

            result = buffer.slice(0, size);
            buffer = buffer.slice(size);
        };

        const decrypt = function *(
            size /*: number */
        ) /*: BufferGenerator */ {
            yield *fetch(size);

            if (result === null) {
                return;
            }

            if (hashAlgorithm === 'unauthorized') {
                result = decipher.update(result);
            } else {
                const decrypted /*: Buffer */ = decipher.update(result);

                const hmacInstance /*: crypto$Hmac */ = hmac();

                hmacInstance.update(result);

                const digest /*: Buffer */ = hmacInstance.digest();

                yield *fetch(digest.length);

                if (result === null) {
                    return;
                }

                if (digest.equals(decipher.update(result))) {
                    result = decrypted;
                } else {
                    result = null;
                }
            }
        };

        const decryptAny = function *() /*: BufferGenerator */ {
            if (hashAlgorithm === 'unauthorized') {
                if (buffer.length) {
                    result = buffer;
                    buffer = Buffer.alloc(0);
                } else {
                    result = yield;

                    if (result === null) {
                        return;
                    }
                }

                result = decipher.update(result);
            } else {
                yield *decrypt(4);

                if (result === null) {
                    return;
                }

                yield *decrypt(result.readUInt32BE(0));
            }
        };

        yield *decrypt(4);

        if (result === null) {
            next.next(null);

            return;
        }

        const timestamp /*: number */ = result.readUInt32BE(0);

        if (addNonce(nonce, timestamp)) {
            while (true) {
                yield *decryptAny();

                if (result === null) {
                    break;
                }

                next.next(result);
            }

            if (decipher.final().length) {
                // note: should be flushed earlier

                throw Error();
            }
        } else if (hang) {
            // TODO: log?

            for (
                let data /*: Buffer | null */ = yield;
                data !== null;
                data = yield
            ) {
                // ignore
            }
        }

        next.next(null);
    };
};

'use strict';

const crypto = require('./crypto');

module.exports = (
    nextPass /*: Pass */,
    algorithm /*: string */,
    keyLength /*: number */,
    ivLength /*: number */,
    password /*: string */
) /*: Pass */ => {
    let nonceSet /*: NonceSet */ = {};

    const addNonce = (
        nonce /*: Buffer */,
        timestamp /*: number */
    ) /*: boolean */ => {
        const oldNonceSet = nonceSet;

        const nonceString = '#' + nonce.toString('hex');
        const now = Math.floor(Date.now() / 1000 / 60);

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
    ) /*: Generator<void, void, Buffer | null> */ {
        const next = nextPass(info);

        let buffer /*: Buffer */ = Buffer.alloc(0);

        const nonceLength = Math.min(keyLength + ivLength, 32);

        let nonce /*: Buffer | null */ = null;
        let decipher /*: crypto$Decipher | null */ = null;

        next.next();

        while (buffer.length < nonceLength) {
            const data = yield;

            if (data === null) {
                next.next(null);

                return;
            }

            buffer = Buffer.concat([buffer, data]);
        }

        nonce = buffer.slice(0, nonceLength);
        decipher = crypto.createDecipher(
            algorithm,
            keyLength,
            ivLength,
            password,
            nonce
        );

        buffer = decipher.update(buffer.slice(nonceLength));

        while (buffer.length < 8) {
            const data = yield;

            if (data === null) {
                next.next(null);

                return;
            }

            buffer = Buffer.concat([buffer, decipher.update(data)]);
        }

        const magic = buffer.readUInt32BE(0);
        const timestamp = buffer.readUInt32BE(4);

        buffer = buffer.slice(8);

        if (magic === 0xDEADBEEF && addNonce(nonce, timestamp)) {
            next.next(buffer);

            for (
                let data /*: Buffer | null */ = yield;
                data !== null;
                data = yield
            ) {
                next.next(decipher.update(data));
            }

            if (decipher.final().length) {
                // note: should be flushed earlier

                throw Error();
            }
        }

        next.next(null);
    };
};

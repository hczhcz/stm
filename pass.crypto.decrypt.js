'use strict';

const crypto = require('./crypto');

module.exports = (
    nextPass /*: Pass */,
    algorithm /*: string */,
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

        let nonce /*: Buffer | null */ = null;
        let decipher /*: crypto$Decipher | null */ = null;

        next.next();

        while (buffer.length < nonceLength) {
            const data /*: Buffer | null */ = yield;

            if (data === null) {
                next.next(null);

                return;
            }

            buffer = Buffer.concat([buffer, data]);
        }

        nonce = buffer.slice(0, nonceLength);
        decipher = crypto.createDecipher(
            algorithm,
            password,
            nonce
        );

        buffer = decipher.update(buffer.slice(nonceLength));

        while (buffer.length < 4) {
            const data /*: Buffer | null */ = yield;

            if (data === null) {
                next.next(null);

                return;
            }

            buffer = Buffer.concat([buffer, decipher.update(data)]);
        }

        const timestamp /*: number */ = buffer.readUInt32BE(0);

        buffer = buffer.slice(4);

        if (addNonce(nonce, timestamp)) {
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
        } else if (hang) {
            // TODO: log?

            throw Error();
        }

        next.next(null);
    };
};

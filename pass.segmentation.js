'use strict';

const serialize = require('./serialize');

module.exports = (
    nextPass /*: Pass */
) /*: Pass */ => {
    return function *(
        info /*: Info */
    ) /*: Generator<void, void, Buffer | null> */ {
        const next = nextPass(info);

        let buffer /*: Buffer */ = Buffer.alloc(0);

        next.next();

        for (
            let data /*: Buffer | null */ = yield;
            data !== null;
            data = yield
        ) {
            buffer = Buffer.concat([buffer, data]);

            while (true) {
                const size = serialize.tryParse(buffer);

                if (!size) {
                    break;
                }

                next.next(buffer.slice(0, size));

                buffer = buffer.slice(size);
            }
        }

        next.next(null);
    };
};

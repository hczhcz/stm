'use strict';

module.exports = (
    nextPass /*: Pass */,
    delay /*: number */
) /*: Pass */ => {
    return function *(
        info /*: Info */
    ) /*: BufferGenerator */ {
        const next /*: BufferGenerator */ = nextPass(info);

        let buffer /*: Buffer */ = Buffer.alloc(0);

        const update = () /*: void */ => {
            if (buffer.length) {
                next.next(buffer);

                buffer = Buffer.alloc(0);
            }
        };

        next.next();

        for (
            let data /*: Buffer | null */ = yield;
            data !== null;
            data = yield
        ) {
            buffer = Buffer.concat([buffer, data]);

            setTimeout(() /*: void */ => {
                update();
            }, delay);
        }

        setTimeout(() /*: void */ => {
            // the execution order is guaranteed in the spec

            next.next(null);
        }, delay);
    };
};

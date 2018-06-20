'use strict';

const zlib = require('zlib');

module.exports = (
    nextPass /*: Pass */
) /*: Pass */ => {
    return function *(info) {
        const next = nextPass(info);

        const inflate = zlib.createInflateRaw({
            flush: zlib.constants.Z_SYNC_FLUSH,
            finishFlush: zlib.constants.Z_SYNC_FLUSH,
        }).on('data', (chunk) => {
            next.next(chunk);
        }).on('close', () => {
            next.next(null);
        });

        next.next();

        for (let data = yield; data !== null; data = yield) {
            inflate.write(data);
        }

        inflate.destroy();
    };
};

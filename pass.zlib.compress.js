'use strict';

const zlib = require('zlib');

module.exports = (
    nextPass /*: Pass */,
    level /*: number */
) /*: Pass */ => {
    return function *(info) {
        const next = nextPass(info);

        const deflate = zlib.createDeflateRaw({
            flush: zlib.constants.Z_SYNC_FLUSH,
            finishFlush: zlib.constants.Z_SYNC_FLUSH,
            level: level,
        }).on('data', (chunk) => {
            next.next(chunk);
        }).on('close', () => {
            next.next(null);
        });

        next.next();

        for (let data = yield; data !== null; data = yield) {
            deflate.write(data);
        }

        deflate.destroy();
    };
};

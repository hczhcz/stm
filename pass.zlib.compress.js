'use strict';

const zlib = require('zlib');

module.exports = (
    nextPass /*: Pass */,
    level /*: number */
) /*: Pass */ => {
    return function *(
        info /*: Info */
    ) /*: BufferGenerator */ {
        const next /*: BufferGenerator */ = nextPass(info);

        const deflate /*: zlib.DeflateRaw */ = zlib.createDeflateRaw({
            flush: zlib.constants.Z_SYNC_FLUSH,
            finishFlush: zlib.constants.Z_SYNC_FLUSH,
            level: level,
        }).on('data', (
            chunk /*: Buffer */
        ) /*: void */ => {
            next.next(chunk);
        }).once('close', () /*: void */ => {
            next.next(null);
        });

        next.next();

        for (
            let data /*: Buffer | null */ = yield;
            data !== null;
            data = yield
        ) {
            deflate.write(data);
        }

        deflate.destroy();
    };
};

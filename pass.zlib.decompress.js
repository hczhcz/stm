'use strict';

const zlib = require('zlib');

module.exports = (
    nextPass /*: Pass */
) /*: Pass */ => {
    return function *(
        info /*: Info */
    ) /*: BufferGenerator */ {
        const next /*: BufferGenerator */ = nextPass(info);

        const inflate /*: zlib.InflateRaw */ = zlib.createInflateRaw({
            flush: zlib.constants.Z_SYNC_FLUSH,
            finishFlush: zlib.constants.Z_SYNC_FLUSH,
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
            inflate.write(data);
        }

        inflate.destroy();
    };
};

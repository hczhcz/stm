'use strict';

const zlib = require('zlib');

module.exports = (
    nextPass /*: Pass */,
    level /*: number */
) /*: Pass */ => {
    return (info, callback) => {
        const deflate = zlib.createDeflateRaw({
            flush: zlib.constants.Z_SYNC_FLUSH,
            finishFlush: zlib.constants.Z_SYNC_FLUSH,
            level: level,
        });

        nextPass(info, (send, close) => {
            deflate.on('data', (chunk) => {
                send(chunk);
            });

            callback((data) => {
                // send

                deflate.write(data);
            }, () => {
                // close

                deflate.destroy();

                close();
            });
        });
    };
};

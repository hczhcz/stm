'use strict';

const zlib = require('zlib');

module.exports = (
    nextPass /*: Pass */
) /*: Pass */ => {
    return (info, callback) => {
        const inflate = zlib.createInflateRaw({
            flush: zlib.constants.Z_SYNC_FLUSH,
            finishFlush: zlib.constants.Z_SYNC_FLUSH,
        });

        nextPass(info, (send, close) => {
            inflate.on('data', (chunk) => {
                send(chunk);
            });

            callback((data) => {
                // send

                inflate.write(data);
            }, () => {
                // close

                inflate.destroy();

                close();
            });
        });
    };
};

'use strict';

const zlib = require('zlib');

module.exports = (level) => {
    let next = null;

    return {
        pipe: (piped) => {
            next = piped.open;

            return piped;
        },

        open: (info, callback) => {
            next(info, (send, close) => {
                const deflate = zlib.createDeflateRaw({
                    flush: zlib.constants.Z_SYNC_FLUSH,
                    finishFlush: zlib.constants.Z_SYNC_FLUSH,
                    level: level,
                });

                deflate.on('data', (chunk) => {
                    send(chunk);
                }).on('end', () => {
                    close();
                });

                callback((data) => {
                    // send

                    deflate.write(data);
                }, () => {
                    // close

                    deflate.end();
                });
            });
        },
    };
};

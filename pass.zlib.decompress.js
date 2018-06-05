'use strict';

const zlib = require('zlib');

module.exports = () => {
    let next = null;

    return {
        pipe: (piped) => {
            next = piped.open;

            return piped;
        },

        open: (info, callback) => {
            next(info, (send, close) => {
                const inflate = zlib.createInflateRaw({
                    flush: zlib.constants.Z_SYNC_FLUSH,
                    finishFlush: zlib.constants.Z_SYNC_FLUSH,
                });

                inflate.on('data', (chunk) => {
                    send(chunk);
                }).on('end', () => {
                    close();
                });

                callback((data) => {
                    // send

                    inflate.write(data);
                }, () => {
                    // close

                    inflate.end();
                });
            });
        },
    };
};

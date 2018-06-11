'use strict';

const zlib = require('zlib');

module.exports = (
    level /*: number */
) /*: Pass */ => {
    const self = {
        next: null,

        open: (info, callback) => {
            if (!self.next) {
                // non-null assertion

                throw Error();
            }

            self.next(info, (send, close) => {
                const deflate = zlib.createDeflateRaw({
                    flush: zlib.constants.Z_SYNC_FLUSH,
                    finishFlush: zlib.constants.Z_SYNC_FLUSH,
                    level: level,
                });

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
        },
    };

    return self;
};

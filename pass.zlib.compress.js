'use strict';

const zlib = require('zlib');

module.exports = (level) => {
    const self = {
        next: null,

        open: (info, callback) => {
            self.next(info, (send, close) => {
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

    return self;
};

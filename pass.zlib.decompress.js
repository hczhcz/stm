'use strict';

const zlib = require('zlib');

module.exports = () /*: Pass */ => {
    const self = {
        next: null,

        open: (info, callback) => {
            if (!self.next) {
                // non-null assertion

                throw Error();
            }

            self.next(info, (send, close) => {
                const inflate = zlib.createInflateRaw({
                    flush: zlib.constants.Z_SYNC_FLUSH,
                    finishFlush: zlib.constants.Z_SYNC_FLUSH,
                }).on('data', (chunk) => {
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
        },
    };

    return self;
};

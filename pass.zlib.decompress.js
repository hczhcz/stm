'use strict';

const zlib = require('zlib');

module.exports = () => {
    const self = {
        next: null,

        open: (info, callback) => {
            self.next(info, (send, close) => {
                const inflate = zlib.createInflateRaw({
                    flush: zlib.constants.Z_SYNC_FLUSH,
                    finishFlush: zlib.constants.Z_SYNC_FLUSH,
                });

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
        },
    };

    return self;
};

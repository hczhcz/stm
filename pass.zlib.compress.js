'use strict';

const zlib = require('zlib');

module.exports = (level) => {
    let next = null;

    return {
        pipe: (piped) => {
            next = piped.open;

            return piped;
        },

        open: (callback) => {
            next((send, close) => {
                const deflate = zlib.createDeflateRaw({
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
                    deflate.flush();
                }, () => {
                    // close

                    deflate.end();
                });
            });
        },
    };
};

'use strict';

const zlib = require('zlib');

module.exports = () => {
    let next = null;

    return {
        pipe: (piped) => {
            next = piped.open;

            return piped;
        },

        open: (callback) => {
            next((send, close) => {
                const inflate = zlib.createInflateRaw();

                inflate.on('data', (chunk) => {
                    send(chunk);
                }).on('end', () => {
                    close();
                });

                callback((data) => {
                    // send

                    inflate.write(data);
                    inflate.flush();
                }, () => {
                    // close

                    inflate.end();
                });
            });
        },
    };
};

'use strict';

const serialize = require('./serialize');

module.exports = () /*: Pass */ => {
    const self = {
        next: null,

        open: (info, callback) => {
            if (!self.next) {
                // non-null assertion

                throw Error();
            }

            let buffer = Buffer.alloc(0);

            const parse = (send) => {
                const size = serialize.tryParse(buffer);

                if (size) {
                    send(buffer.slice(0, size));

                    buffer = buffer.slice(size);

                    parse(send);
                }
            };

            self.next(info, (send, close) => {
                callback((data) => {
                    // send

                    buffer = Buffer.concat([buffer, data]);

                    parse(send);
                }, () => {
                    // close

                    close();
                });
            });
        },
    };

    return self;
};

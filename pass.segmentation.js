'use strict';

const serialize = require('./serialize');

module.exports = () => {
    const self = {
        next: null,

        open: (info, callback) => {
            self.next(info, (send, close) => {
                let buffer = Buffer.alloc(0);

                const parse = () => {
                    const size = serialize.tryParse(buffer);

                    if (size) {
                        send(buffer.slice(0, size));

                        buffer = buffer.slice(size);

                        parse();
                    }
                };

                callback((data) => {
                    // send

                    buffer = Buffer.concat([buffer, data]);

                    parse();
                }, () => {
                    // close

                    close();
                });
            });
        },
    };

    return self;
};

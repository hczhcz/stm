'use strict';

const serialize = require('./serialize');

module.exports = (
    nextPass /*: Pass */
) /*: Pass */ => {
    return (info, callback) => {
        let buffer = Buffer.alloc(0);

        const parse = (send) => {
            const size = serialize.tryParse(buffer);

            if (size) {
                send(buffer.slice(0, size));

                buffer = buffer.slice(size);

                parse(send);
            }
        };

        nextPass(info, (send, close) => {
            callback((data) => {
                // send

                buffer = Buffer.concat([buffer, data]);

                parse(send);
            }, () => {
                // close

                close();
            });
        });
    };
};

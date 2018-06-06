'use strict';

module.exports = () => {
    const self = {
        next: null,

        open: (info, callback) => {
            self.next(info, (send, close) => {
                let buffer = Buffer.alloc(0);

                const parse = () => {
                    if (buffer.length >= 8) {
                        const jsonSize = buffer.readUInt32BE(0);
                        const chunkSize = buffer.readUInt32BE(4);
                        const size = 8 + jsonSize + chunkSize;

                        if (buffer.length >= size) {
                            send(buffer, size);
                            buffer = buffer.slice(size);

                            parse();
                        }
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

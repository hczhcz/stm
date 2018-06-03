'use strict';

module.exports = () => {
    let next = null;

    return {
        pipe: (piped) => {
            next = piped.open;

            return piped;
        },

        open: (callback) => {
            next((send, close) => {
                let buffer = Buffer.alloc(0);

                callback((data) => {
                    // send

                    buffer = Buffer.concat([buffer, data]);

                    if (buffer.length >= 8) {
                        const jsonSize = buffer.readUInt32BE(0);
                        const chunkSize = buffer.readUInt32BE(4);
                        const size = 8 + jsonSize + chunkSize;

                        if (buffer.length >= size) {
                            send(buffer, size);
                            buffer = buffer.slice(size);
                        }
                    }
                }, () => {
                    // close

                    close();
                });
            });
        },
    };
};

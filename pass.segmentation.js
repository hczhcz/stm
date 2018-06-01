'use strict';

module.exports = () => {
    let next = null;

    return {
        pipe: (piped) => {
            next = piped.open;

            return piped;
        },

        open: (id, callback) => {
            next(id, (send, close) => {
                const handler = function *() {
                    while (true) {
                        const header = Buffer.alloc(8);

                        for (let i = 0; i < 8; i += 1) {
                            header[i] = yield;
                        }

                        const jsonSize = header.readUInt32BE(0);
                        const chunkSize = header.readUInt32BE(4);

                        const data = Buffer.alloc(8 + jsonSize + chunkSize);

                        header.copy(data);

                        for (let i = 8; i < 8 + jsonSize + chunkSize; i += 1) {
                            data[i] = yield;
                        }

                        send(data);
                    }
                }();

                handler.next();

                callback((data) => {
                    // send

                    for (let i = 0; i < data.length; i += 1) {
                        handler.next(data[i]);
                    }
                }, () => {
                    // close

                    close();
                });
            });
        },
    };
};

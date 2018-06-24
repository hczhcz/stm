'use strict';

const socks5address = require('./socks5.address');
const socks5parse = require('./socks5.parse');
const socks5write = require('./socks5.write');

const accept = (
    socket /*: net$Socket */
) /*: void */ => {
    let parseDone /*: boolean */ = false;

    // TODO: remove extra '(' ')' in type notation
    const waitAddress = (
        callback /*: () => void */
    ) /*: ((string, number, string) => void) */ => {
        return (
            address /*: string */,
            port /*: number */,
            code /*: string | null */
        ) /*: void */ => {
            if (code === null) {
                const task = socks5address.parse(address, port);

                socks5write.writeReply(socket, task);

                callback();
            } else {
                socks5write.writeErrorTCP(socket, code);
                socket.end();
            }
        };
    };

    const establish = () /*: void */ => {
        socket.emit('socks5.step', 'establish');

        socket.on('data', (
            chunk /*: Buffer */
        ) /*: void */ => {
            socket.emit('socks5client.data', chunk);
        }).once('end', () /*: void */ => {
            socket.emit('socks5client.end');
        }).once('close', () /*: void */ => {
            socket.emit('socks5client.close');
        }).on('socks5server.data', (
            chunk /*: Buffer */
        ) /*: void */ => {
            socket.write(chunk);
        }).once('socks5server.end', () /*: void */ => {
            socket.end();
        }).once('socks5server.close', () /*: void */ => {
            socket.destroy();
        }).resume();
    };

    const connect = (
        task /*: Task */
    ) /*: void */ => {
        socket.pause().once('socks5server.open', waitAddress(
            () /*: void */ => {
                establish();
            }
        )).emit(
            'socks5client.connect',
            socks5address.stringify(task),
            task.port
        );
    };

    const bind = (
        task /*: Task */
    ) /*: void */ => {
        socket.pause().once('socks5server.open', waitAddress(
            () /*: void */ => {
                socket.once('socks5server.connection', waitAddress(
                    () /*: void */ => {
                        establish();
                    }
                ));
            }
        )).emit(
            'socks5client.bind',
            socks5address.stringify(task),
            task.port
        );
    };

    const udpAssociate = (
        task /*: Task */
    ) /*: void */ => {
        socket.pause().once('socks5server.udpassociate', waitAddress(
            () /*: void */ => {
                establish();
            }
        )).emit(
            'socks5client.udpassociate',
            socks5address.stringify(task),
            task.port
        );
    };

    const handleRequest = () /*: Generator<void, void, number> */ => {
        return socks5parse.parseRequest(
            (
                task /*: Task */
            ) /*: void */ => {
                // done

                socket.emit('socks5.step', 'request');

                parseDone = true;

                switch (task.command) {
                    case 'connect':
                        connect(task);

                        break;
                    case 'bind':
                        bind(task);

                        break;
                    case 'udpassociate':
                        udpAssociate(task);

                        break;
                    default:
                        // never reach
                        throw Error();
                }
            },
            () /*: void */ => {
                // command error

                // reply: command not supported
                socks5write.writeError(socket, 0x07);

                socket.emit('socks5.error', 'command');
                socket.end();
            },
            () /*: void */ => {
                // address error

                // reply: address type not supported
                socks5write.writeError(socket, 0x08);

                socket.emit('socks5.error', 'address');
                socket.end();
            },
            () /*: void */ => {
                // parse error

                socket.emit('socks5.error', 'parse');
                socket.end();
            }
        );
    };

    const handleAuth = () /*: Generator<void, void, number> */ => {
        return socks5parse.parseAuth(
            handleRequest,
            () /*: void */ => {
                // done

                socket.emit('socks5.step', 'auth');

                // method: no authentication required
                socks5write.writeAuth(socket, 0x00);
            },
            () /*: void */ => {
                // auth error

                socket.emit('socks5.error', 'auth');

                // method: no acceptable methods
                socks5write.writeAuth(socket, 0xFF);
                socket.end();
            },
            () /*: void */ => {
                // parse error

                socket.emit('socks5.error', 'parse');

                socket.end();
            }
        );
    };

    const handler = handleAuth();

    handler.next();

    socket.on('data', (
        chunk /*: Buffer */
    ) /*: void */ => {
        if (!parseDone) {
            for (let i /*: number */ = 0; i < chunk.length; i += 1) {
                handler.next(chunk[i]);

                if (parseDone) {
                    socket.unshift(chunk.slice(i + 1));

                    break;
                }
            }
        }
    });
};

module.exports = {
    accept: accept,
};

'use strict';

const socks5address = require('./socks5.address');
const socks5parse = require('./socks5.parse');
const socks5write = require('./socks5.write');

const accept = (socket) => {
    let parseDone = false;

    const handleClose = () => {
        socket.end();

        return function *() {
            // nothing
        };
    };

    const handleDone = () => {
        socket.pause();
        parseDone = true;

        return function *() {
            // nothing
        };
    };

    const handleRequest = () => {
        return socks5parse.parseRequest(
            socket,
            (task) => {
                // next

                socket.emit('socks5.step', 'request');

                const waitAddress = (next) => {
                    return (address, code) => {
                        if (code) {
                            socks5write.writeErrorTCP(socket, code);
                            socket.end();
                        } else {
                            socks5write.writeReply(socket, socks5address.parse(address));
                            next();
                        }
                    };
                };

                const establish = () => {
                    socket.on('data', (chunk) => {
                        socket.emit('socks5client.data', chunk);
                    }).on('end', () => {
                        socket.emit('socks5client.end');
                    }).on('close', () => {
                        socket.emit('socks5client.close');
                    }).on('socks5server.data', (chunk) => {
                        socket.write(chunk);
                    }).on('socks5server.end', () => {
                        socket.end();
                    }).on('socks5server.close', () => {
                        // socket.end()?
                        socket.destroy();
                    });

                    socket.resume();
                };

                switch (task.command) {
                    case 'connect':
                        socket.once('socks5server.open', waitAddress(() => {
                            socket.emit('socks5.step', 'connect');

                            establish();
                        })).emit('socks5client.connect', socks5address.stringify(task));

                        break;
                    case 'bind':
                        socket.once('socks5server.open', waitAddress(() => {
                            socket.once('socks5server.connection', waitAddress(() => {
                                socket.emit('socks5.step', 'bind');

                                establish();
                            }));
                        })).emit('socks5client.bind', socks5address.stringify(task));

                        break;
                    case 'udpassociate':
                        socket.once('socks5server.open', waitAddress(() => {
                            socket.emit('socks5.step', 'udpassociate');

                            establish();
                        })).emit('socks5client.udpassociate', socks5address.stringify(task));

                        break;
                    default:
                        // never reach
                        throw Error();
                }

                return handleDone();
            },
            () => {
                // command error

                socket.emit('socks5.error', 'command');

                // reply: command not supported
                socks5write.writeError(socket, 0x07);

                return handleClose(socket);
            },
            () => {
                // address error

                socket.emit('socks5.error', 'address');

                // reply: address type not supported
                socks5write.writeError(socket, 0x08);

                return handleClose(socket);
            },
            () => {
                // parse error

                socket.emit('socks5.error', 'parse');

                return handleClose(socket);
            }
        );
    };

    const handleAuth = () => {
        return socks5parse.parseAuth(
            socket,
            () => {
                // next

                socket.emit('socks5.step', 'auth');

                // method: no authentication required
                socks5write.writeAuth(socket, 0x00);

                return handleRequest(socket);
            },
            () => {
                // auth error

                socket.emit('socks5.error', 'auth');

                // method: no acceptable methods
                socks5write.writeAuth(socket, 0xFF);

                return handleClose(socket);
            },
            () => {
                // parse error

                socket.emit('socks5.error', 'parse');

                return handleClose(socket);
            }
        );
    };

    const handler = handleAuth(socket);

    handler.next();

    socket.on('data', (chunk) => {
        if (!parseDone) {
            for (let i = 0; i < chunk.length; i += 1) {
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

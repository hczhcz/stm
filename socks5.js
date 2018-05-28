'use strict';

const socks5address = require('./socks5.address');
const socks5parse = require('./socks5.parse');
const socks5write = require('./socks5.write');

const accept = (socket) => {
    let parseDone = false;

    const handleClose = function *() {
        socket.end();
    };

    const handleDone = function *() {
        socket.pause();
    };

    const waitAddress = (callback) => {
        return (address, port, code) => {
            if (code) {
                socks5write.writeErrorTCP(socket, code);
                socket.end();
            } else {
                const task = socks5address.parse(address);

                task.port = port;

                socks5write.writeReply(socket, task);

                callback();
            }
        };
    };

    const handleRequest = () => {
        return socks5parse.parseRequest(
            socket,
            (task) => {
                // next

                socket.emit('socks5.step', 'request');

                parseDone = true;

                const establish = () => {
                    socket.on('data', (chunk) => {
                        socket.emit('socks5client.data', chunk);
                    }).once('end', () => {
                        socket.emit('socks5client.end');
                    }).once('close', () => {
                        socket.emit('socks5client.close');
                    }).on('socks5server.data', (chunk) => {
                        socket.write(chunk);
                    }).once('socks5server.end', () => {
                        socket.end();
                    }).once('socks5server.close', () => {
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
                        })).emit('socks5client.connect', socks5address.stringify(task), task.port);

                        break;
                    case 'bind':
                        socket.once('socks5server.open', waitAddress(() => {
                            socket.once('socks5server.connection', waitAddress(() => {
                                socket.emit('socks5.step', 'bind');

                                establish();
                            }));
                        })).emit('socks5client.bind', socks5address.stringify(task), task.port);

                        break;
                    case 'udpassociate':
                        socket.once('socks5server.udpassociate', waitAddress(() => {
                            socket.emit('socks5.step', 'udpassociate');

                            establish();
                        })).emit('socks5client.udpassociate', socks5address.stringify(task), task.port);

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

                return handleClose();
            },
            () => {
                // address error

                socket.emit('socks5.error', 'address');

                // reply: address type not supported
                socks5write.writeError(socket, 0x08);

                return handleClose();
            },
            () => {
                // parse error

                socket.emit('socks5.error', 'parse');

                return handleClose();
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

                return handleRequest();
            },
            () => {
                // auth error

                socket.emit('socks5.error', 'auth');

                // method: no acceptable methods
                socks5write.writeAuth(socket, 0xFF);

                return handleClose();
            },
            () => {
                // parse error

                socket.emit('socks5.error', 'parse');

                return handleClose();
            }
        );
    };

    const handler = handleAuth();

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

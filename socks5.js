'use strict';

const socks5address = require('./socks5.address');
const socks5parse = require('./socks5.parse');
const socks5write = require('./socks5.write');

const accept = (
    socket /*: net$Socket */
) /*: void */ => {
    let parseDone = false;

    const waitAddress = (callback) => {
        return (address, port, code) => {
            if (code) {
                socks5write.writeErrorTCP(socket, code);
                socket.end();
            } else {
                const task = socks5address.parse(address, port);

                socks5write.writeReply(socket, task);

                callback();
            }
        };
    };

    const establish = () => {
        socket.emit('socks5.step', 'establish');

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
            socket.destroy();
        }).resume();
    };

    const connect = (task) => {
        socket.pause().once('socks5server.open', waitAddress(() => {
            establish();
        })).emit(
            'socks5client.connect',
            socks5address.stringify(task),
            task.port
        );
    };

    const bind = (task) => {
        socket.pause().once('socks5server.open', waitAddress(() => {
            socket.once('socks5server.connection', waitAddress(() => {
                establish();
            }));
        })).emit(
            'socks5client.bind',
            socks5address.stringify(task),
            task.port
        );
    };

    const udpAssociate = (task) => {
        socket.pause().once('socks5server.udpassociate', waitAddress(() => {
            establish();
        })).emit(
            'socks5client.udpassociate',
            socks5address.stringify(task),
            task.port
        );
    };

    const handleRequest = () => {
        return socks5parse.parseRequest(
            (task) => {
                // next

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
            () => {
                // command error

                // reply: command not supported
                socks5write.writeError(socket, 0x07);

                socket.emit('socks5.error', 'command');
                socket.end();
            },
            () => {
                // address error

                // reply: address type not supported
                socks5write.writeError(socket, 0x08);

                socket.emit('socks5.error', 'address');
                socket.end();
            },
            () => {
                // parse error

                socket.emit('socks5.error', 'parse');
                socket.end();
            }
        );
    };

    const handleAuth = () => {
        return socks5parse.parseAuth(
            () => {
                // next

                socket.emit('socks5.step', 'auth');

                // method: no authentication required
                socks5write.writeAuth(socket, 0x00);

                return handleRequest();
            },
            () => {
                // auth error

                // method: no acceptable methods
                socks5write.writeAuth(socket, 0xFF);

                socket.emit('socks5.error', 'auth');
                socket.end();
            },
            () => {
                // parse error

                socket.emit('socks5.error', 'parse');
                socket.end();
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

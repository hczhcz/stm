'use strict';

const socks5parse = require('./socks5.parse');
const socks5write = require('./socks5.write');

const handleClose = (socket) => {
    socket.end();

    return function *() {
        // nothing
    };
};

const handleAuth = (socket) => {
    return socks5parse.parseAuth(
        socket,
        () => {
            // next

            // method: no authentication required
            socks5write.writeAuth(socket, 0x00);

            return handleRequest(socket);
        },
        () => {
            // auth error

            // method: no acceptable methods
            socks5write.writeAuth(socket, 0xFF);

            return handleClose(socket);
        },
        () => {
            // parse error

            return handleClose(socket);
        }
    );
};

const handleRequest = (socket) => {
    return socks5parse.parseRequest(
        socket,
        (task) => {
            // next

            console.error(task);

            return [];
        },
        () => {
            // command error

            // reply: command not supported
            socks5write.writeError(socket, 0x07);

            return handleClose(socket);
        },
        () => {
            // address error

            // reply: address type not supported
            socks5write.writeError(socket, 0x08);

            return handleClose(socket);
        },
        () => {
            // parse error

            return handleClose(socket);
        }
    );
};

const accept = (socket) => {
    const handler = handleAuth(socket);

    handler.next();

    return handler;
};

module.exports = {
    accept: accept,
};

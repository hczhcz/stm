'use strict';

const net = require('net');

const socks5 = require('./socks5');

const createLocal = () => {
    return new net.Server({
        allowHalfOpen: true,
    }).on('connection', (socket) => {
        socks5.accept(socket);

        socket.on('error', (err) => {
            console.error('request error');
            console.error(err);
        });
    }).on('error', (err) => {
        console.error('server error');
        console.error(err);
    });
};

// module.exports = (options) => {
//     const self = this;
// };

// TODO
createLocal().listen(2333);

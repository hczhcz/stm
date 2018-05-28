'use strict';

const net = require('net');

const socks5 = require('./socks5');
const proxy = require('./proxy.local');

process.on('uncaughtException', (err) => {
    console.error('global error');
    console.error(err);
});

const createLocal = (proxySession) => {
    return net.createServer({
        allowHalfOpen: true,
    }).on('connection', (socket) => {
        socket.pause();

        proxySession((data) => {
            switch (data[0]) {
                case 'open':
                    // address, port, code
                    socket.emit('socks5server.open', data[1], data[2], data[3]);

                    break;
                case 'connection':
                    // address, port, code
                    socket.emit('socks5server.connection', data[1], data[2], data[3]);

                    break;
                case 'data':
                    // chunk
                    socket.emit('socks5server.data', data[1]);

                    break;
                case 'end':
                    socket.emit('socks5server.end');

                    break;
                case 'close':
                    socket.emit('socks5server.close');

                    break;
                default:
                    // ignore
            }
        }, (send) => {
            socks5.accept(socket);

            socket.on('error', (err) => {
                console.error('request error');
                console.error(err);
            }).once('socks5client.connect', (address, port) => {
                console.log('connect ' + address + ' ' + port);

                send(['connect', address, port]);
            }).once('socks5client.bind', (address, port) => {
                console.log('bind ' + address + ' ' + port);

                send(['bind', address, port]);
            }).once('socks5client.udpassociate', (address, port) => {
                console.log('udpassociate ' + address + ' ' + port);

                send(['udpassociate', address, port]);

                // socket.emit('socks5server.open', );
            }).on('socks5client.data', (chunk) => {
                send(['data', chunk]);
            }).once('socks5client.end', () => {
                console.error('end');

                send(['end']);
            }).once('socks5client.close', () => {
                console.error('close');

                send(['close']);
            }).on('socks5.step', (step) => {
                console.error('socks5 step ' + step);
            }).on('socks5.error', (step) => {
                console.error('socks5 error ' + step);
            });

            socket.resume();
        });
    }).on('error', (err) => {
        console.error('server error');
        console.error(err);
    });
};

// TODO
proxy.create((proxySession) => {

    createLocal(proxySession, udpSocket).listen(2333);
});

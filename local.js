'use strict';

const net = require('net');

const socks5 = require('./socks5');
const proxy = require('./proxy.local');

process.on('uncaughtException', (err) => {
    console.error('global error');
    console.error(err);
});

const createLocal = (proxyClient) => {
    return net.createServer({
        allowHalfOpen: true,
    }).on('connection', (socket) => {
        socks5.accept(socket);

        const session = proxyClient.open((data) => {
            switch (data[0]) {
                case 'open':
                    socket.emit('socks5server.open', data[1]);

                    break;
                case 'connection':
                    socket.emit('socks5server.connection', data[1]);

                    break;
                case 'data':
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
        });

        socket.on('error', (err) => {
            console.error('request error');
            console.error(err);
        }).on('socks5client.connect', (address) => {
            console.log('connect ' + address);

            proxyClient.send(session, ['connect', address]);
        }).on('socks5client.bind', (address) => {
            console.log('bind ' + address);

            proxyClient.send(session, ['bind', address]);
        }).on('socks5client.udpassociate', (address) => {
            console.log('udpassociate ' + address);

            proxyClient.send(session, ['udpassociate', address]);
        }).on('socks5client.data', (chunk) => {
            proxyClient.send(session, ['data', chunk]);
        }).on('socks5client.end', () => {
            proxyClient.send(session, ['end']);
        }).on('socks5client.close', () => {
            proxyClient.send(session, ['close']);
            proxyClient.close(session);
        }).on('socks5.step', (step) => {
            console.error('socks5 step ' + step);
        }).on('socks5.error', (step) => {
            console.error('socks5 error ' + step);
        });
    }).on('error', (err) => {
        console.error('server error');
        console.error(err);
    });
};

proxy.create((proxyClient) => {
    // TODO
    createLocal(proxyClient).listen(2333);
});

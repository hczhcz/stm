'use strict';

const net = require('net');
const dgram = require('dgram');

const socks5 = require('./socks5');
const proxy = require('./proxy.local');

process.on('uncaughtException', (err) => {
    console.error('global error');
    console.error(err);
});

const createTcp = (port, callback) => {
    callback(net.createServer({
        allowHalfOpen: true,
    }).listen(port));
};

const createUdp = (port, callback) => {
    callback(dgram.createSocket({
        type: 'udp4',
    }).bind(port));
};

const init = (proxySession, tcpServer, udpServer) => {
    tcpServer.once('connection', (socket) => {
        socket.pause();

        // send:
        // connect(address, port)
        // bind(address, port)
        // udpassociate()
        // message(address, port, msg)
        // data(chunk)
        // end()
        // close()

        // reply:
        // open(address, port, code)
        // connection(address, port, code)
        // message(address, port, msg)
        // data(chunk)
        // end()
        // close()

        proxySession((data) => {
            switch (data[0]) {
                case 'open':
                    socket.emit('socks5server.open', data[1], data[2], data[3]);

                    break;
                case 'connection':
                    socket.emit('socks5server.connection', data[1], data[2], data[3]);

                    break;
                case 'message':
                    udpServer.emit('socks5server.message', data[1], data[2], data[3]);

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

                send(['udpassociate']);

                const udpAddress = udpServer.address();

                socket.emit('socks5server.udpassociate', udpAddress.address, udpAddress.port, null);
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
        console.error('tcp server error');
        console.error(err);
    });

    udpServer.on('message', (msg, info) => {
        socks5.udp();
    }).on('error', (err) => {
        console.error('udp server error');
        console.error(err);
    });
};

// TODO
proxy.create((proxySession) => {
    createTcp((tcpServer) => {
        createUdp((udpServer) => {
            init(proxySession, tcpServer, udpServer);
        });
    });
});

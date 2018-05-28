'use strict';

const net = require('net');
const dgram = require('dgram');

const socks5 = require('./socks5');
const socks5udp = require('./socks5.udp');
const proxy = require('./proxy.local');

process.on('uncaughtException', (err) => {
    console.error('global error');
    console.error(err);
});

const initLocal = (proxySession, tcpServer, udpServer) => {
    const udpListen = udpServer.address();

    tcpServer.on('connection', (socket) => {
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
        // udpassociate(code)
        // message(address, port, msg)
        // data(chunk)
        // end()
        // close()

        let udp = null;

        proxySession((data) => {
            switch (data[0]) {
                case 'open':
                    socket.emit('socks5server.open', data[1], data[2], data[3]);

                    break;
                case 'connection':
                    socket.emit('socks5server.connection', data[1], data[2], data[3]);

                    break;
                case 'udpassociate':
                    socket.emit('socks5server.udpassociate', udpListen.address, udpListen.port, data[1]);

                    break;
                case 'message':
                    udpServer.emit('socks5server.message', udp.address, udp.port, data[1], data[2], data[3]);

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

                // TODO: do dns query if the address is a domain name?

                udp = {
                    address: address,
                    port: port,
                };
                udpServer.socks5sessions[udp.address + ':' + udp.port] = send;

                send(['udpassociate']);
            }).on('socks5client.data', (chunk) => {
                send(['data', chunk]);
            }).once('socks5client.end', () => {
                console.error('end');

                send(['end']);
            }).once('socks5client.close', () => {
                console.error('close');

                if (udp) {
                    delete udpServer.socks5sessions[udp.address + ':' + udp.port];
                }

                send(['close']);
            }).on('socks5.step', (step) => {
                console.error('socks5 tcp step ' + step);
            }).on('socks5.error', (step) => {
                console.error('socks5 tcp error ' + step);
            });

            socket.resume();
        });
    }).on('error', (err) => {
        console.error('tcp server error');
        console.error(err);
    });

    udpServer.on('error', (err) => {
        console.error('udp server error');
        console.error(err);
    }).on('socks5client.message', (localAddress, localPort, remoteAddress, remotePort, msg) => {
        udpServer.socks5sessions[localAddress + ':' + localPort](['message', remoteAddress, remotePort, msg]);
    }).on('socks5.step', (step) => {
        console.error('socks5 udp step ' + step);
    }).on('socks5.error', (step) => {
        console.error('socks5 udp error ' + step);
    });
};

// TODO
proxy.create((proxySession) => {
    const tcpServer = net.createServer({
        allowHalfOpen: true,
    }).listen(2333);

    const udpServer = dgram.createSocket({
        type: 'udp4',
    }).bind(2333);

    socks5udp.init(udpServer);

    initLocal(proxySession, tcpServer, udpServer);
});

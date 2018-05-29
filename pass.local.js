'use strict';

const crypto = require('crypto');
const net = require('net');
const dgram = require('dgram');

const socks5 = require('./socks5');
const socks5udp = require('./socks5.udp');

// send:
// connect(address, port)
// bind(address, port)
// udpassociate()
// message(address, port, msg)
// data(chunk)
// end()

// reply:
// open(address, port, code)
// connection(address, port, code)
// udpassociate(code)
// message(address, port, msg)
// data(chunk)
// end()

module.exports = (tcpPort, udpPort) => {
    const tcpServer = net.createServer({
        allowHalfOpen: true,
    }).listen(tcpPort);

    const udpServer = dgram.createSocket({
        type: 'udp4',
    }).bind(udpPort);

    socks5udp.init(udpServer);

    const sockets = {};
    const udpInfo = {};

    return {
        pipe: (next) => {
            tcpServer.on('connection', (socket) => {
                socket.pause();

                const id = crypto.randomBytes(16).toString('hex');

                sockets[id] = socket;

                next(id, (send, close) => {
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

                        udpInfo[id] = {
                            address: address,
                            port: port,
                            send: send,
                        };

                        send(['udpassociate']);
                    }).on('socks5client.data', (chunk) => {
                        send(['data', chunk]);
                    }).once('socks5client.end', () => {
                        console.error('end');

                        send(['end']);
                    }).once('socks5client.close', () => {
                        console.error('close');

                        close();
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
                for (const i in udpInfo) {
                    if (udpInfo[i].address === localAddress && udpInfo[i].port === localPort) {
                        udpInfo[i].send(['message', remoteAddress, remotePort, msg]);
                    }
                }
            }).on('socks5.step', (step) => {
                console.error('socks5 udp step ' + step);
            }).on('socks5.error', (step) => {
                console.error('socks5 udp error ' + step);
            });
        },

        open: (id, callback) => {
            callback((data) => {
                // send

                let udpListen = null;

                switch (data[0]) {
                    case 'open':
                        sockets[id].emit('socks5server.open', data[1], data[2], data[3]);

                        break;
                    case 'connection':
                        sockets[id].emit('socks5server.connection', data[1], data[2], data[3]);

                        break;
                    case 'udpassociate':
                        udpListen = udpServer.address();
                        sockets[id].emit('socks5server.udpassociate', udpListen.address, udpListen.port, data[1]);

                        break;
                    case 'message':
                        udpServer.emit('socks5server.message', udpInfo[id].address, udpInfo[id].port, data[1], data[2], data[3]);

                        break;
                    case 'data':
                        sockets[id].emit('socks5server.data', data[1]);

                        break;
                    case 'end':
                        sockets[id].emit('socks5server.end');

                        break;
                    default:
                        // ignore
                }
            }, () => {
                // close

                sockets[id].emit('socks5server.close');

                delete sockets[id];
            });
        },
    };
};

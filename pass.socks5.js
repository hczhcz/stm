'use strict';

const crypto = require('crypto');
const net = require('net');
const dgram = require('dgram');

const serialize = require('./serialize');
const socks5 = require('./socks5');
const socks5udp = require('./socks5.udp');

// send:
// connect(address, port)
// bind(address, port)
// udpassociate()
// message(address, port) + msg
// data() + chunk
// end()

// reply:
// open(address, port, code)
// connection(address, port, code)
// udpassociate(code)
// message(address, port) + msg
// data() + chunk
// end()

module.exports = (listenPort) => {
    const self = {
        next: null,

        open: (info, callback) => {
            callback((data) => {
                // send

                const json = serialize.getJson(data);
                const chunk = serialize.getChunk(data);

                let address = null;

                switch (json[0]) {
                    case 'open':
                        info.socket.emit('socks5server.open', json[1], json[2], json[3]);

                        break;
                    case 'connection':
                        info.socket.emit('socks5server.connection', json[1], json[2], json[3]);

                        break;
                    case 'udpassociate':
                        address = info.udpServer.address();
                        info.socket.emit('socks5server.udpassociate', address.address, address.port, json[1]);

                        break;
                    case 'message':
                        info.udpServer.emit('socks5server.message', info.udpAddress, info.udpPort, json[1], json[2], chunk);

                        break;
                    case 'data':
                        info.socket.emit('socks5server.data', chunk);

                        break;
                    case 'end':
                        info.socket.emit('socks5server.end');

                        break;
                    default:
                        // ignore
                }
            }, () => {
                // close

                info.socket.emit('socks5server.close');

                if (info.udpServer) {
                    info.udpServer.close();
                }
            });
        },
    };

    net.createServer({
        allowHalfOpen: true,
    }).on('connection', (socket) => {
        socket.pause();

        const id = crypto.randomBytes(2).toString('hex');
        const info = {
            socket: socket,
        };

        self.next(info, (send, close) => {
            const sendJson = (json, chunk) => {
                send(serialize.create(json, chunk));
            };

            socks5.accept(socket);

            socket.on('error', (err) => {
                console.error(id + ' request error');
                console.error(err);
            }).once('socks5client.connect', (address, port) => {
                console.log(id + ' connect ' + address + ' ' + port);

                sendJson(['connect', address, port], null);
            }).once('socks5client.bind', (address, port) => {
                console.log(id + ' bind ' + address + ' ' + port);

                sendJson(['bind', address, port], null);
            }).once('socks5client.udpassociate', (address, port) => {
                console.log(id + ' udpassociate ' + address + ' ' + port);

                info.udpAddress = address;
                info.udpPort = port;
                info.udpServer = dgram.createSocket({
                    type: 'udp6',
                }).once('listening', () => {
                    sendJson(['udpassociate'], null);
                }).on('error', (err) => {
                    console.error(id + ' udp server error');
                    console.error(err);
                }).on('socks5client.message', (localAddress, localPort, remoteAddress, remotePort, msg) => {
                    sendJson(['message', remoteAddress, remotePort], msg);
                }).on('socks5.step', (step) => {
                    // console.error(id + ' socks5 udp step ' + step);
                }).on('socks5.error', (step) => {
                    console.error(id + ' socks5 udp error ' + step);
                }).bind();

                socks5udp.init(info.udpServer);
            }).on('socks5client.data', (chunk) => {
                sendJson(['data'], chunk);
            }).once('socks5client.end', () => {
                // console.error(id + ' end');

                if (info.udpServer) {
                    info.udpServer.close();
                    info.udpServer = null;
                }

                sendJson(['end'], null);
            }).once('socks5client.close', () => {
                // console.error(id + ' close');

                close();
            }).on('socks5.step', (step) => {
                // console.error(id + ' socks5 tcp step ' + step);
            }).on('socks5.error', (step) => {
                console.error(id + ' socks5 tcp error ' + step);
            }).resume();
        });
    }).on('error', (err) => {
        console.error('tcp server error');
        console.error(err);
    }).listen(listenPort);

    return self;
};

'use strict';

const crypto = require('crypto');
const net = require('net');
const dgram = require('dgram');

const serialize = require('./serialize');
const socks5 = require('./socks5');
const socks5udp = require('./socks5.udp');

// send:
// connect(address, port) + id
// bind(address, port) + id
// udpassociate() + id
// message(address, port) + msg
// data() + chunk
// end()

// reply:
// open(address, port, code) + id
// connection(address, port, code)
// udpassociate(code) + id
// message(address, port) + msg
// data() + chunk
// end()

module.exports = (tcpPort, udpPort) => {
    const tcpServer = net.createServer({
        allowHalfOpen: true,
    }).listen(tcpPort);

    const udpServer = dgram.createSocket({
        type: 'udp4',
    }).bind(udpPort);

    socks5udp.init(udpServer);

    const info = {};

    return {
        pipe: (piped) => {
            tcpServer.on('connection', (socket) => {
                socket.pause();

                const rawId = crypto.randomBytes(16);
                const id = rawId.toString('hex');

                info[id] = {
                    socket: socket,
                };

                piped.open((send, close) => {
                    info[id].sendJson = (json, chunk) => {
                        send(serialize.create(json, chunk));
                    };

                    socks5.accept(socket);

                    socket.on('error', (err) => {
                        console.error('request error');
                        console.error(err);
                    }).once('socks5client.connect', (address, port) => {
                        console.log('connect ' + address + ' ' + port);

                        info[id].sendJson(['connect', address, port], rawId);
                    }).once('socks5client.bind', (address, port) => {
                        console.log('bind ' + address + ' ' + port);

                        info[id].sendJson(['bind', address, port], rawId);
                    }).once('socks5client.udpassociate', (address, port) => {
                        console.log('udpassociate ' + address + ' ' + port);

                        // TODO: do dns query if the address is a domain name?

                        info[id].udpAddress = address;
                        info[id].udpPort = port;

                        info[id].sendJson(['udpassociate'], rawId);
                    }).on('socks5client.data', (chunk) => {
                        info[id].sendJson(['data'], chunk);
                    }).once('socks5client.end', () => {
                        console.error('end');

                        info[id].sendJson(['end'], null);
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
                for (const id in info) {
                    if (info[id].udpAddress === localAddress && info[id].udpPort === localPort) {
                        info[id].sendJson(['message', remoteAddress, remotePort], msg);
                    }
                }
            }).on('socks5.step', (step) => {
                console.error('socks5 udp step ' + step);
            }).on('socks5.error', (step) => {
                console.error('socks5 udp error ' + step);
            });

            return piped;
        },

        open: (callback) => {
            let id = null;

            callback((data) => {
                // send

                const json = serialize.getJson(data);
                const chunk = serialize.getChunk(data);

                let udpListen = null;

                switch (json[0]) {
                    case 'open':
                        id = chunk.toString('hex');

                        info[id].socket.emit('socks5server.open', json[1], json[2], json[3]);

                        break;
                    case 'connection':
                        info[id].socket.emit('socks5server.connection', json[1], json[2], json[3]);

                        break;
                    case 'udpassociate':
                        id = chunk.toString('hex');

                        udpListen = udpServer.address();
                        info[id].socket.emit('socks5server.udpassociate', udpListen.address, udpListen.port, json[1]);

                        break;
                    case 'message':
                        udpServer.emit('socks5server.message', info[id].udpAddress, info[id].udpPort, json[1], json[2], chunk);

                        break;
                    case 'data':
                        info[id].socket.emit('socks5server.data', chunk);

                        break;
                    case 'end':
                        info[id].socket.emit('socks5server.end');

                        break;
                    default:
                        // ignore
                }
            }, () => {
                // close

                info[id].socket.emit('socks5server.close');

                delete info[id];
            });
        },
    };
};

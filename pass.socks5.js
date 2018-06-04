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

module.exports = (listenPort) => {
    const tcpServer = net.createServer({
        allowHalfOpen: true,
    }).listen(listenPort);

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
                    const sendJson = (json, chunk) => {
                        send(serialize.create(json, chunk));
                    };

                    socks5.accept(socket);

                    socket.on('error', (err) => {
                        console.error(id.slice(0, 4) + ' request error');
                        console.error(err);
                    }).once('socks5client.connect', (address, port) => {
                        console.log(id.slice(0, 4) + ' connect ' + address + ' ' + port);

                        sendJson(['connect', address, port], rawId);
                    }).once('socks5client.bind', (address, port) => {
                        console.log(id.slice(0, 4) + ' bind ' + address + ' ' + port);

                        sendJson(['bind', address, port], rawId);
                    }).once('socks5client.udpassociate', (address, port) => {
                        console.log(id.slice(0, 4) + ' udpassociate ' + address + ' ' + port);

                        info[id].udpServer = dgram.createSocket({
                            type: 'udp6',
                        }).on('error', (err) => {
                            console.error(id.slice(0, 4) + ' udp server error');
                            console.error(err);
                        }).on('socks5client.message', (localAddress, localPort, remoteAddress, remotePort, msg) => {
                            sendJson(['message', remoteAddress, remotePort], msg);
                        }).on('socks5.step', (step) => {
                            // console.error(id.slice(0, 4) + ' socks5 udp step ' + step);
                        }).on('socks5.error', (step) => {
                            console.error(id.slice(0, 4) + ' socks5 udp error ' + step);
                        }).bind(() => {
                            sendJson(['udpassociate'], rawId);
                        });

                        socks5udp.init(info[id].udpServer);
                    }).on('socks5client.data', (chunk) => {
                        sendJson(['data'], chunk);
                    }).once('socks5client.end', () => {
                        console.error(id.slice(0, 4) + ' end');

                        if (info[id].udpServer) {
                            info[id].udpServer.close();
                            info[id].udpServer = null;
                        }

                        sendJson(['end'], null);
                    }).once('socks5client.close', () => {
                        console.error(id.slice(0, 4) + ' close');

                        close();
                    }).on('socks5.step', (step) => {
                        // console.error(id.slice(0, 4) + ' socks5 tcp step ' + step);
                    }).on('socks5.error', (step) => {
                        console.error(id.slice(0, 4) + ' socks5 tcp error ' + step);
                    });

                    socket.resume();
                });
            }).on('error', (err) => {
                console.error('tcp server error');
                console.error(err);
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

                        udpListen = info[id].udpServer.address();
                        // TODO: address?
                        info[id].socket.emit('socks5server.udpassociate', '::1', udpListen.port, json[1]);

                        break;
                    case 'message':
                        info[id].udpServer.emit('socks5server.message', info[id].udpAddress, info[id].udpPort, json[1], json[2], chunk);

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

                if (info[id].udpServer) {
                    info[id].udpServer.close();
                }

                delete info[id];
            });
        },
    };
};

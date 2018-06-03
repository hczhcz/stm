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
        pipe: (piped) => {
            tcpServer.on('connection', (socket) => {
                socket.pause();

                const id = crypto.randomBytes(16);

                sockets[id] = socket;

                piped.open(id, (send, close) => {
                    const sendJson = (json, chunk) => {
                        send(serialize.create(json, chunk));
                    };

                    socks5.accept(socket);

                    socket.on('error', (err) => {
                        console.error('request error');
                        console.error(err);
                    }).once('socks5client.connect', (address, port) => {
                        console.log('connect ' + address + ' ' + port);

                        sendJson(['connect', address, port], null);
                    }).once('socks5client.bind', (address, port) => {
                        console.log('bind ' + address + ' ' + port);

                        sendJson(['bind', address, port], null);
                    }).once('socks5client.udpassociate', (address, port) => {
                        console.log('udpassociate ' + address + ' ' + port);

                        // TODO: do dns query if the address is a domain name?

                        udpInfo[id] = {
                            address: address,
                            port: port,
                            sendJson: sendJson,
                        };

                        sendJson(['udpassociate'], null);
                    }).on('socks5client.data', (chunk) => {
                        sendJson(['data'], chunk);
                    }).once('socks5client.end', () => {
                        console.error('end');

                        sendJson(['end'], null);
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
                        udpInfo[i].sendJson(['message', remoteAddress, remotePort], msg);
                    }
                }
            }).on('socks5.step', (step) => {
                console.error('socks5 udp step ' + step);
            }).on('socks5.error', (step) => {
                console.error('socks5 udp error ' + step);
            });

            return piped;
        },

        open: (id, callback) => {
            callback((data) => {
                // send

                const json = serialize.getJson(data);

                let udpListen = null;

                switch (json[0]) {
                    case 'open':
                        sockets[id].emit('socks5server.open', json[1], json[2], json[3]);

                        break;
                    case 'connection':
                        sockets[id].emit('socks5server.connection', json[1], json[2], json[3]);

                        break;
                    case 'udpassociate':
                        udpListen = udpServer.address();
                        sockets[id].emit('socks5server.udpassociate', udpListen.address, udpListen.port, json[1]);

                        break;
                    case 'message':
                        udpServer.emit('socks5server.message', udpInfo[id].address, udpInfo[id].port, json[1], json[2], serialize.getChunk(data));

                        break;
                    case 'data':
                        sockets[id].emit('socks5server.data', serialize.getChunk(data));

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
                delete udpInfo[id];
            });
        },
    };
};

'use strict';

const net = require('net');
const dgram = require('dgram');

const create = (callback) => {
    callback((reply, callback2) => {
        let socket = null;
        let udpServer = null;
        let connected = false;

        callback2((data) => {
            switch (data[0]) {
                case 'connect':
                    socket = net.createConnection(data[2], data[1]).once('connect', () => {
                        connected = true;

                        reply(['open', socket.localAddress, socket.localPort, null]);
                    }).on('data', (chunk) => {
                        reply(['data', chunk]);
                    }).once('end', () => {
                        reply(['end']);
                    }).once('close', () => {
                        reply(['close']);
                    }).on('error', (err) => {
                        if (!connected && err.code) {
                            reply(['open', socket.localAddress, socket.localPort, err.code]);
                        }
                    });

                    break;
                case 'bind':
                    //

                    break;
                case 'udpassociate':
                    udpServer = dgram.createSocket({
                        type: 'udp4',
                    }).once('listening', () => {
                        connected = true;
                    }).on('message', (msg, info) => {
                        reply(['message', info.address, info.port, msg]);
                    }).on('error', (err) => {
                        if (!connected && err.code) {
                            reply(['udpassociate', err.code]);
                        }
                    }).bind();

                    break;
                case 'message':
                    udpServer.send(data[3], data[2], data[1]);

                    break;
                case 'data':
                    socket.write(data[1]);

                    break;
                case 'end':
                    socket.end();

                    break;
                case 'close':
                    if (socket && !socket.destroyed) {
                        socket.destroy();
                    }

                    if (udpServer) {
                        udpServer.close();
                    }

                    break;
                default:
                    // ignore
            }
        });
    });
};

module.exports = {
    create: create,
};

'use strict';

const crypto = require('crypto');
const net = require('net');

const config = require('./config');
const serialize = require('./serialize');
const http = require('./http');

module.exports = (
    nextPass /*: Pass */,
    listenPort /*: number */,
    fullResponse /*: boolean */
) /*: Pass */ => {
    net.createServer({
        allowHalfOpen: true,
    }).on('connection', (
        socket /*: net$Socket */
    ) /*: void */ => {
        const info /*: Info */ = {
            id: crypto.randomBytes(2).toString('hex'),
            socket: socket,
        };

        const next /*: BufferGenerator */ = nextPass(info);

        const sendJson = (
            json /*: Command */,
            chunk /*: Buffer | null */
        ) /*: void */ => {
            next.next(serialize.create(json, chunk));
        };

        next.next();

        http.accept(socket);

        socket.once('close', () /*: void */ => {
            if (config.log.networkClose) {
                console.error(info.id + ' http socket close');
            }

            next.next(null);
        }).on('error', (
            err /*: error */
        ) /*: void */ => {
            if (config.log.networkError) {
                console.error(info.id + ' http socket error');
            }

            if (config.log.networkErrorDetail) {
                console.error(err);
            }
        }).once('httpclient.request', (
            address /*: string */,
            port /*: number */
        ) /*: void */ => {
            console.log(
                info.id + ' http request ' + address + ' ' + port
            );

            sendJson(['connect', address, port], null);

            if (!fullResponse) {
                socket.emit('httpserver.open', null);
            }
        }).once('httpclient.connect', (
            address /*: string */,
            port /*: number */
        ) /*: void */ => {
            console.log(
                info.id + ' http connect ' + address + ' ' + port
            );

            sendJson(['connect', address, port], null);

            if (!fullResponse) {
                socket.emit('httpserver.open', null);
            }
        }).on('httpclient.data', (
            chunk /*: Buffer */
        ) /*: void */ => {
            if (config.log.proxyTransfer) {
                console.error(info.id + ' http data');
            }

            sendJson(['data'], chunk);
        }).once('httpclient.end', () /*: void */ => {
            if (config.log.proxyTransfer) {
                console.error(info.id + ' http end');
            }

            sendJson(['end'], null);
        }).on('http.step', (
            step /*: string */
        ) /*: void */ => {
            if (config.log.proxyStep) {
                console.error(info.id + ' http step ' + step);
            }
        }).on('http.error', (
            step /*: string */
        ) /*: void */ => {
            if (config.log.proxyError) {
                console.error(info.id + ' http error ' + step);
            }
        });
    }).on('error', (
        err /*: error */
    ) /*: void */ => {
        if (config.log.networkError) {
            console.error('http server error');
        }

        if (config.log.networkErrorDetail) {
            console.error(err);
        }
    }).listen(listenPort);

    return function *(
        info /*: Info */
    ) /*: BufferGenerator */ {
        if (!info.socket) {
            // non-null assertion

            throw Error();
        }

        const socket /*: net$Socket */ = info.socket;

        // TODO: 2-stage

        for (
            let data /*: Buffer | null */ = yield;
            data !== null;
            data = yield
        ) {
            const json /*: Command */ = serialize.getJson(data);
            const chunk /*: Buffer */ = serialize.getChunk(data);

            switch (json[0]) {
                case 'open':
                    socket.emit('httpserver.open', json[3]);

                    break;
                case 'data':
                    socket.emit('httpserver.data', chunk);

                    break;
                case 'end':
                    socket.emit('httpserver.end');

                    break;
                default:
                    // ignore
            }
        }

        socket.destroy();
    };
};

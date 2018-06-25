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
        const info = {
            id: crypto.randomBytes(2).toString('hex'),
            socket: socket,
        };

        const next = nextPass(info);

        const sendJson = (
            json /*: Command */,
            chunk /*: Buffer | null */
        ) /*: void */ => {
            next.next(serialize.create(json, chunk));
        };

        next.next();

        http.accept(socket);

        socket.once('close', () /*: void */ => {
            if (config.log.transfer) {
                console.error(info.id + ' tcp close');
            }

            next.next(null);
        }).on('error', (
            err /*: error */
        ) /*: void */ => {
            console.error(info.id + ' tcp error');

            if (config.log.network) {
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
            if (config.log.transfer) {
                console.error(info.id + ' http data');
            }

            sendJson(['data'], chunk);
        }).once('httpclient.end', () /*: void */ => {
            if (config.log.transfer) {
                console.error(info.id + ' http end');
            }

            sendJson(['end'], null);
        }).on('http.step', (
            step /*: string */
        ) /*: void */ => {
            if (config.log.step) {
                console.error(info.id + ' http step ' + step);
            }
        }).on('http.error', (
            step /*: string */
        ) /*: void */ => {
            console.error(info.id + ' http error ' + step);
        });
    }).on('error', (
        err /*: error */
    ) /*: void */ => {
        console.error('tcp server error');

        if (config.log.network) {
            console.error(err);
        }
    }).listen(listenPort);

    return function *(
        info /*: Info */
    ) /*: Generator<void, void, Buffer | null> */ {
        if (!info.socket) {
            // non-null assertion

            throw Error();
        }

        const socket = info.socket;

        // TODO: 2-stage

        for (
            let data /*: Buffer | null */ = yield;
            data !== null;
            data = yield
        ) {
            const json = serialize.getJson(data);
            const chunk = serialize.getChunk(data);

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

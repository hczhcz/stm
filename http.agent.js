'use strict';

const url = require('url');
const http = require('http');

const acceptRequest = (req, res) => {
    const address = url.parse(req.url);

    req.emit(
        'http.request',
        address.hostname,
        address.port || 80
    ).emit(
        'http.header',
        req.method + ' ' + address.path + ' HTTP/' + req.httpVersion + '\r\n'
    );

    for (let i = 0; i < req.rawHeaders.length; i += 2) {
        req.emit(
            'http.header',
            req.rawHeaders[i] + ':' + req.rawHeaders[i + 1] + '\r\n';
        )
    }

    req.emit('http.header', '\r\n');

    // pipe

    req.on('data', (chunk) => {
        req.emit('http.data', chunk);
    }).once('end', () => {
        req.emit('http.end');
    }).once('close', () => {
        req.emit('http.close');
    });

    res.on('http.data', (chunk) => {
        res.write(chunk);
    }).once('http.end', () => {
        res.end();
    }).once('http.close', () => {
        req.destroy();
        res.destroy();
    });
};

const acceptConnect = (req, res) => {
    const address = url.parse(req.url);

    req.emit(
        'http.connect',
        address.hostname,
        address.port || 80
    );

    res.emit(
        'http.header',
        'HTTP/' + req.httpVersion + ' 200 Connection Established\r\n'
    );

    res.emit('http.header', '\r\n');

    // pipe

    req.on('data', (chunk) => {
        req.emit('http.data', chunk);
    }).once('end', () => {
        req.emit('http.end');
    }).once('close', () => {
        req.emit('http.close');
    });

    res.on('http.data', (chunk) => {
        res.write(chunk);
    }).once('http.end', () => {
        res.end();
    }).once('http.close', () => {
        req.destroy();
        res.destroy();
    });
};

module.exports = {
    acceptRequest: acceptRequest,
    acceptConnect: acceptConnect,
};

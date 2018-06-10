'use strict';

const url = require('url');

const accept = (socket) => {
    let buffer = Buffer.alloc(0);

    let startLine = null;
    let headers = [];
    let piped = false;

    const establish = () => {
        socket.emit('http.step', 'establish');

        socket.on('data', (chunk) => {
            socket.emit('httpclient.data', chunk);
        }).once('end', () => {
            socket.emit('httpclient.end');
        }).once('close', () => {
            socket.emit('httpclient.close');
        }).on('httpserver.data', (chunk) => {
            socket.write(chunk);
        }).once('httpserver.end', () => {
            socket.end();
        }).once('httpserver.close', () => {
            socket.destroy();
        });
    };

    const parseHeader = () => {
        const index = buffer.indexOf('\r\n');

        if (index >= 0) {
            const line = buffer.slice(0, index).toString();

            buffer = buffer.slice(index + 2);

            if (line === '') {
                socket.emit('http.step', 'header');

                // notice: how about 'OPTIONS' and 'TRACE'?
                if (startLine[1] === 'CONNECT') {
                    const address = url.parse('http://' + startLine[2]);

                    socket.emit('httpclient.connect', address.hostname, address.port || 80);

                    socket.write('HTTP/' + startLine[3] + ' 200 Connection Established\r\n\r\n');
                } else {
                    const address = url.parse(startLine[2]);

                    socket.emit('httpclient.request', address.hostname, address.port || 80);

                    socket.emit('httpclient.data', Buffer.from(
                        startLine[1] + ' ' + address.path + ' HTTP/' + startLine[3] + '\r\n'
                    ));

                    for (let i = 0; i < headers.length; i += 1) {
                        socket.emit('httpclient.data', Buffer.from(
                            headers[i][0] + ':' + headers[i][1] + '\r\n'
                        ));

                        for (let j = 2; j < headers[i].length; j += 1) {
                            socket.emit('httpclient.data', Buffer.from(
                                headers[i][j] + '\r\n'
                            ));
                        }
                    }

                    socket.emit('httpclient.data', Buffer.from('\r\n'));
                }

                if (buffer.length) {
                    socket.emit('httpclient.data', buffer);
                }

                piped = true;

                establish();
            } else if (line[0] === ' ' || line[0] === '\t') {
                if (headers.length) {
                    headers[headers.length - 1].push(line);

                    parseHeader();
                } else {
                    socket.emit('http.error', 'parse');
                    socket.end();
                }
            } else {
                const header = line.match(/^([^ \t]+):(.*)$/);

                if (header) {
                    headers.push([header[1], header[2]]);

                    parseHeader();
                } else {
                    socket.emit('http.error', 'parse');
                    socket.end();
                }
            }
        }
    };

    const parseStartLine = () => {
        const index = buffer.indexOf('\r\n');

        if (index >= 0) {
            const line = buffer.slice(0, index).toString();

            startLine = line.match(/^([^ \t\r\n]+) ([^ \t\r\n]+) HTTP\/([\d.]+)$/);

            buffer = buffer.slice(index + 2);

            if (startLine) {
                socket.emit('http.step', 'startline');

                parseHeader();
            } else {
                socket.emit('http.error', 'parse');
                socket.end();
            }
        }
    };

    socket.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);

        if (piped) {
            // nothing, see function established()
        } else if (startLine) {
            parseHeader();
        } else {
            parseStartLine();
        }
    });
};

module.exports = {
    accept: accept,
};

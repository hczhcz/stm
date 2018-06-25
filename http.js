'use strict';

const httpParse = require('./http.parse');

const accept = (
    socket /*: net$Socket */
) /*: void */ => {
    let buffer /*: Buffer */ = Buffer.alloc(0);
    let parseDone /*: boolean */ = false;

    const establish = () /*: void */ => {
        socket.emit('http.step', 'establish');

        socket.on('data', (
            chunk /*: Buffer */
        ) /*: void */ => {
            socket.emit('httpclient.data', chunk);
        }).once('end', () /*: void */ => {
            socket.emit('httpclient.end');
        }).on('httpserver.data', (
            chunk /*: Buffer */
        ) /*: void */ => {
            socket.write(chunk);
        }).once('httpserver.end', () /*: void */ => {
            socket.end();
        }).resume();
    };

    const connect = (
        target /*: string */,
        httpVersion /*: string */
    ) /*: void */ => {
        const address /*: URL */ = new URL('http://' + target);

        socket.pause().once('httpserver.open', (
            code /*: string | null */
        ) /*: void */ => {
            if (code === null) {
                socket.write(
                    'HTTP/' + httpVersion
                        + ' 200 Connection Established\r\n\r\n'
                );

                establish();
            } else {
                socket.write(
                    'HTTP/' + httpVersion
                        + ' 502 Bad Gateway\r\n\r\n'
                );
                socket.end();
            }
        }).emit(
            'httpclient.connect',
            address.hostname,
            parseInt(address.port, 10) || 80
        );
    };

    const request = (
        method /*: string */,
        target /*: string */,
        httpVersion /*: string */,
        headers /*: Array<Array<string>> */
    ) /*: void */ => {
        const address /*: URL */ = new URL(target);

        socket.pause().once('httpserver.open', (
            code /*: string | null */
        ) /*: void */ => {
            if (code === null) {
                socket.emit(
                    'httpclient.data',
                    Buffer.from(
                        method
                            + ' ' + address.pathname
                            + address.search
                            + address.hash
                            + ' HTTP/' + httpVersion + '\r\n'
                    )
                );

                for (
                    let i /*: number */ = 0;
                    i < headers.length;
                    i += 1
                ) {
                    socket.emit(
                        'httpclient.data',
                        Buffer.from(
                            headers[i][0] + ':' + headers[i][1] + '\r\n'
                        )
                    );

                    for (
                        let j /*: number */ = 2;
                        j < headers[i].length;
                        j += 1
                    ) {
                        socket.emit(
                            'httpclient.data',
                            Buffer.from(
                                headers[i][j] + '\r\n'
                            )
                        );
                    }
                }

                socket.emit(
                    'httpclient.data',
                    Buffer.from(
                        '\r\n'
                    )
                );

                establish();
            } else {
                socket.write(
                    'HTTP/' + httpVersion
                        + ' 502 Bad Gateway\r\n\r\n'
                );
                socket.end();
            }
        }).emit(
            'httpclient.request',
            address.hostname,
            parseInt(address.port, 10) || 80
        );
    };

    const handleHeader = (
        method /*: string */,
        target /*: string */,
        httpVersion /*: string */
    ) /*: StringGenerator */ => {
        return httpParse.parseHeader(
            (
                headers /*: Array<Array<string>> */
            ) /*: void */ => {
                // done

                socket.emit('http.step', 'header');

                parseDone = true;

                // notice: how about 'OPTIONS' and 'TRACE'?
                if (method === 'CONNECT') {
                    connect(target, httpVersion);
                } else {
                    request(method, target, httpVersion, headers);
                }
            },
            () /*: void */ => {
                // parse error

                socket.emit('http.error', 'parse');

                socket.end();
            }
        );
    };

    const handleStartLine = () /*: StringGenerator */ => {
        return httpParse.parseStartLine(
            handleHeader,
            () /*: void */ => {
                // done

                socket.emit('http.step', 'startline');
            },
            () /*: void */ => {
                // parse error

                socket.emit('http.error', 'parse');

                socket.end();
            }
        );
    };

    const handler /*: StringGenerator */ = handleStartLine();

    handler.next();

    socket.on('data', (
        chunk /*: Buffer */
    ) /*: void */ => {
        if (!parseDone) {
            buffer = Buffer.concat([buffer, chunk]);

            while (true) {
                const index /*: number */ = buffer.indexOf('\r\n');

                if (index < 0) {
                    break;
                }

                handler.next(buffer.slice(0, index).toString());

                buffer = buffer.slice(index + 2);

                if (parseDone) {
                    socket.unshift(buffer);

                    break;
                }
            }
        }
    });
};

module.exports = {
    accept: accept,
};

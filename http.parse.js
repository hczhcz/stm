'use strict';

const parseStartLine = function *(
    next /*: (string, string, string) => Generator<void, void, string> */,
    parseError /*: () => void */
) /*: Generator<void, void, string> */ {
    const line = yield;

    const startLine = line.match(
        /^([^ \t\r\n]+) ([^ \t\r\n]+) HTTP\/([\d.]+)$/
    );

    if (startLine) {
        yield *next(startLine[1], startLine[2], startLine[3]);
    } else {
        parseError();
    }
};

const parseHeader = function *(
    next /*: (Array<Array<string>>) => void */,
    parseError /*: () => void */
) /*: Generator<void, void, string> */ {
    const headers = [];

    while (true) {
        const line = yield;

        if (line === '') {
            next(headers);

            break;
        } else if (line[0] === ' ' || line[0] === '\t') {
            if (headers.length) {
                headers[headers.length - 1].push(line);
            } else {
                parseError();

                break;
            }
        } else {
            const header = line.match(/^([^ \t]+):(.*)$/);

            if (header) {
                headers.push([header[1], header[2]]);
            } else {
                parseError();

                break;
            }
        }
    }
};

module.exports = {
    parseStartLine: parseStartLine,
    parseHeader: parseHeader,
};

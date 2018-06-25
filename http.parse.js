'use strict';

const parseStartLine = function *(
    next /*: (string, string, string) => StringGenerator */,
    done /*: () => void */,
    parseError /*: () => void */
) /*: StringGenerator */ {
    const line /*: string */ = yield;

    const startLine /*: Array<string> | null */ = line.match(
        /^([^ \t\r\n]+) ([^ \t\r\n]+) HTTP\/([\d.]+)$/
    );

    if (startLine) {
        done();

        yield *next(startLine[1], startLine[2], startLine[3]);
    } else {
        parseError();
    }
};

const parseHeader = function *(
    done /*: (Array<Array<string>>) => void */,
    parseError /*: () => void */
) /*: StringGenerator */ {
    const headers /*: Array<Array<string>> */ = [];

    while (true) {
        const line /*: string */ = yield;

        if (line === '') {
            done(headers);

            break;
        } else if (line[0] === ' ' || line[0] === '\t') {
            if (headers.length) {
                headers[headers.length - 1].push(line);
            } else {
                parseError();

                break;
            }
        } else {
            const header /*: Array<string> | null */ = line.match(
                /^([^ \t]+):(.*)$/
            );

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

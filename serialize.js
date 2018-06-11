'use strict';

const create = (
    json /*: any */,
    chunk /*: Buffer | null */
) /*: Buffer */ => {
    const jsonData = Buffer.from(JSON.stringify(json));
    const chunkData = chunk || Buffer.alloc(0);

    const header = Buffer.alloc(8);

    header.writeUInt32BE(jsonData.length, 0);
    header.writeUInt32BE(chunkData.length, 4);

    return Buffer.concat([
        header,
        jsonData,
        chunkData,
    ]);
};

const getJson = (
    data /*: Buffer */
) /*: any */ => {
    const jsonSize = data.readUInt32BE(0);

    return JSON.parse(data.slice(8, 8 + jsonSize).toString());
};

const getChunk = (
    data /*: Buffer */
) /*: Buffer */ => {
    const jsonSize = data.readUInt32BE(0);
    const chunkSize = data.readUInt32BE(4);

    return data.slice(8 + jsonSize, 8 + jsonSize + chunkSize);
};

const tryParse = (
    data /*: Buffer */
) /*: number */ => {
    if (data.length >= 8) {
        const jsonSize = data.readUInt32BE(0);
        const chunkSize = data.readUInt32BE(4);
        const size = 8 + jsonSize + chunkSize;

        if (data.length >= size) {
            return size;
        }
    }

    return 0;
};

module.exports = {
    create: create,
    getJson: getJson,
    getChunk: getChunk,
    tryParse: tryParse,
};

'use strict';

const create = (json, chunk) => {
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

const getJson = (data) => {
    const jsonSize = data.readUInt32BE(0);

    return JSON.parse(data.slice(8, 8 + jsonSize).toString());
};

const getChunk = (data) => {
    const jsonSize = data.readUInt32BE(0);
    const chunkSize = data.readUInt32BE(4);

    return data.slice(8 + jsonSize, 8 + jsonSize + chunkSize);
};

module.exports = {
    create: create,
    getJson: getJson,
    getChunk: getChunk,
};

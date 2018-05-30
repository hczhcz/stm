'use strict';

const create = (json, chunk) => {
    const jsonData = Buffer.from(JSON.stringify(json));
    const chunkData = chunk || Buffer.alloc(0);

    const jsonSize = Buffer.alloc(4);
    const chunkSize = Buffer.alloc(4);

    jsonSize.writeUInt32BE(jsonData.length);
    chunkSize.writeUInt32BE(chunkData.length);

    return Buffer.concat([
        jsonSize,
        chunkSize,
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

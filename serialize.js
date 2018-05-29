'use strict';

const create = (json, chunk) => {
    const jsonData = Buffer.from(JSON.stringify(json));
    const sizeData = Buffer.alloc(4);

    sizeData.writeUInt32BE(jsonData.length);

    if (chunk) {
        return Buffer.concat([
            sizeData,
            jsonData,
            chunk,
        ]);
    }

    return Buffer.concat([
        sizeData,
        jsonData,
    ]);
};

const getJson = (data) => {
    const size = data.readUInt32BE();

    return JSON.parse(data.slice(4, 4 + size).toString());
};

const getChunk = (data) => {
    const size = data.readUInt32BE();

    return data.slice(4 + size);
};

module.exports = {
    create: create,
    getJson: getJson,
    getChunk: getChunk,
};

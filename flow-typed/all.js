declare type error = any;

declare type CharGenerator = Generator<void, void, number>;
declare type StringGenerator = Generator<void, void, string>;
declare type BufferGenerator = Generator<void, void, Buffer | null>;

// main

// declare type PassParams = Array<number | string | Array>;
declare type PassParams = Array<any>

// declare type PassArgs = Array<number | string | Array | Function>;
declare type PassArgs = Array<any>

declare type Args = {
    [string]: number | string,
};

// pass

declare type Info = {
    id: string,
    socket?: net$Socket,
    udpBind?: dgram$Socket,
    udpAddress?: string,
    udpPort?: number,
};

declare type Pass = (Info) => BufferGenerator;

// proxy

// TODO
// declare type Command = ['connect', string, number]
//     | ['bind']
//     | ['udpassociate']
//     | ['open', string, number, string | null]
//     | ['connection', string, number, string | null]
//     | ['udpopen', string | null]
//     | ['message', string, number]
//     | ['data']
//     | ['end'];

declare type Command = Array<any>;
declare type Address = net$Socket$address;

// socks5

declare type Socks5Command = 'connect' | 'bind' | 'udpassociate';

declare type Socks5Task = {
    addressType: 'ipv4' | 'domainname' | 'ipv6',
    address: Buffer,
    port: number,
};

// crypto

declare type CryptoNonceSet = {
    [number]: {
        [string]: true,
    },
};

declare type error = any;

declare type Args = {
    [string]: number | string,
};

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

declare type Task = {
    command?: string,
    addressType: 'ipv4' | 'domainname' | 'ipv6',
    address: Buffer,
    port: number,
};

declare type Info = {
    id: string,
    socket?: net$Socket,
    udpBind?: dgram$Socket,
    udpAddress?: string,
    udpPort?: number,
};

declare type Pass = (Info) => Generator<void, void, Buffer | null>;

declare type NonceSet = {
    [number]: {
        [string]: true,
    },
};

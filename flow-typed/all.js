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

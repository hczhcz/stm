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

declare type PassCallback = ((Buffer) => void, () => void) => void;
// declare type PassCallback = (Generator<void, void, Buffer | null>) => void;

declare type Pass = (Info, PassCallback) => void;

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

declare type PassCallback = (
    send: (Buffer) => void,
    close: () => void
) => void;

declare type PassOpen = (
    info: Info,
    callback: PassCallback
) => void

declare type Pass = {
    next: PassOpen | null,
    open: PassOpen,
};

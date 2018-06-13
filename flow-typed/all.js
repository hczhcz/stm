declare type Task = {
    command?: string,
    addressType: 'ipv4' | 'domainname' | 'ipv6',
    address: Buffer,
    port: number,
};

declare type PassCallback = (
    send: (chunk: Buffer) => void,
    close: () => void
) => void;

declare type PassOpen = (
    info: any,
    callback: PassCallback
) => void

declare type Pass = {
    next: PassOpen | null,
    open: PassOpen,
};

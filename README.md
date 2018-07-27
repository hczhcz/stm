STM Transmission Machine
===

STM is a modularized network proxy system. The basic functionality is similar to [Shadowsocks](https://github.com/shadowsocks). STM is designed to be easy to extend, customize, and deploy.

Requirements
---

* Node.js 8.x or newer
* OpenSSL

Usage
---

Client side:

```bash
# for Socks5 proxy at 127.0.0.1:<Listen port>
nodejs main.js -s <Server> -p <Server port> -k <Password> -ls <Listen port> socks5

# for HTTP proxy at 127.0.0.1:<Listen port>
nodejs main.js -s <Server> -p <Server port> -k <Password> -lh <Listen port> http
```

Server side:

```bash
nodejs main.js -p <Server port> -k <Password> server
```

Customize
---

Steps:

1. Create a file `pass.<name>.js`;
2. Implement a `Pass` structure in it;
3. Add a new mode to `config.js` and put the pass in it.

Here is an example pass file:

```javascript
// pass.mypass.js

module.exports = (nextPass) => {
    return function *(info) {
        const next = nextPass(info);

        next.next(); // ready

        for (let data = yield; data !== null; data = yield) {
            // TODO: modify the data buffer
            // example: flip every bit in the buffer

            for (let i = 0; i < data.length; i += 1) {
                data[i] = ~data[i]
            }

            next.next(data); // send
        }

        next.next(null); // end
    };
};
```

Now, we have a `Pass` structure that flips every bit in the data go through it.

Then, add new modes to `config.js`.

Here is a simple example:

```javascript
mylocalmode: [
    ['socks5', '-ls', false],
    ['mypass'],
    ['_include', '_local'],
],

myservermode: [
    ['tcp.server', '-p'],
    ['_include', '_decode'],
    ['mypass'],
    ['proxy', false],
    ['_include', '_encode'],
],
```

Finally, we can run `main.js` with our new modes:

```bash
nodejs main.js -s <Server> -p <Server port> -k <Password> -ls <Listen port> mylocalmode
nodejs main.js -p <Port> -k <Password> myservermode
```

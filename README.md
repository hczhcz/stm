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

module.exports = () => {
    const self = {
        next: null,

        open: (info, callback) => {
            self.next(info, (send, close) => {
                callback((data) => {
                    // send

                    // TODO: modify the data buffer
                    // example: flip every bit in the buffer
                    for (let i = 0; i < data.length; i += 1) {
                        data[i] = ~data[i]
                    }

                    send(data);
                }, () => {
                    // close

                    // TODO: do some cleanup here

                    close();
                });
            });
        },
    };

    return self;
};
```

Now, we have a `Pass` structure that flips every bit in the data go through it.

Then, add new modes to `config.js`.

Here is an simple example:

```javascript
mylocalmode: [
    'Some description',
    ['socks5', '-ls', false],
    ['mypass'],
    ['crypto.encrypt', '-m', 32, 16, '-k'],
    ['tcp.client', '-s', '-p'],
    ['crypto.decrypt', '-m', 32, 16, '-k'],
    ['mypass'],
    ['segmentation'],
],

myservermode: [
    'Some description',
    ['tcp.server', '-p'],
    ['crypto.decrypt', '-m', 32, 16, '-k'],
    ['mypass'],
    ['segmentation'],
    ['proxy', false],
    ['mypass'],
    ['crypto.encrypt', '-m', 32, 16, '-k'],
],
```

Finally, we can run `main.js` with our new modes:

```bash
nodejs main.js -s <Server> -p <Server port> -k <Password> -ls <Listen port> mylocalmode
nodejs main.js -p <Port> -k <Password> myservermode
```
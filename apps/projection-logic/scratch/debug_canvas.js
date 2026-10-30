const http = require('http');

http.get('http://127.0.0.1:9222/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const pages = JSON.parse(data);
        const page = pages.find(p => p.type === 'page');
        if (!page) { console.error('No page found'); return; }
        
        console.log('Connecting to:', page.webSocketDebuggerUrl);
        connectWS(page.webSocketDebuggerUrl);
    });
}).on('error', (err) => console.error('HTTP err:', err.message));

function connectWS(wsUrl) {
    const { URL } = require('url');
    const u = new URL(wsUrl);
    const net = require('net');
    const crypto = require('crypto');

    const key = crypto.randomBytes(16).toString('base64');
    const client = net.createConnection({ host: u.hostname, port: u.port }, () => {
        const req = [
            `GET ${u.pathname} HTTP/1.1`,
            `Host: ${u.host}`,
            'Upgrade: websocket',
            'Connection: Upgrade',
            `Sec-WebSocket-Key: ${key}`,
            'Sec-WebSocket-Version: 13',
            '\r\n'
        ].join('\r\n');
        client.write(req);
    });

    let isUpgraded = false;
    let buffer = Buffer.alloc(0);

    client.on('data', (chunk) => {
        if (!isUpgraded) {
            const str = chunk.toString();
            if (str.includes('101 Switching Protocols')) {
                isUpgraded = true;
                console.log('WebSocket connected!');
                
                // Enable Runtime and Console
                sendMsg(client, 1, 'Runtime.enable');
                sendMsg(client, 2, 'Console.enable');
                
                // Call switchTab('canvas')
                setTimeout(() => {
                    console.log('Evaluating switchTab("canvas")...');
                    sendMsg(client, 3, 'Runtime.evaluate', {
                        expression: 'try { switchTab("canvas"); "SWITCHED_OK"; } catch(e) { "ERROR: " + e.stack; }',
                        returnByValue: true
                    });
                }, 500);

                setTimeout(() => {
                    console.log('Evaluating renderCanvas()...');
                    sendMsg(client, 4, 'Runtime.evaluate', {
                        expression: 'try { renderCanvas(); "RENDERED_OK"; } catch(e) { "ERROR: " + e.stack; }',
                        returnByValue: true
                    });
                }, 1000);

                setTimeout(() => {
                    client.end();
                    process.exit(0);
                }, 2500);
            }
            return;
        }

        // Parse websocket frames
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length >= 2) {
            const firstByte = buffer[0];
            const secondByte = buffer[1];
            const isMasked = (secondByte & 0x80) !== 0;
            let payloadLen = secondByte & 0x7F;
            let offset = 2;
            if (payloadLen === 126) {
                if (buffer.length < 4) break;
                payloadLen = buffer.readUInt16BE(2);
                offset = 4;
            } else if (payloadLen === 127) {
                if (buffer.length < 10) break;
                payloadLen = Number(buffer.readBigUInt64BE(2));
                offset = 10;
            }
            if (isMasked) offset += 4;
            if (buffer.length < offset + payloadLen) break;

            const payload = buffer.slice(offset, offset + payloadLen);
            buffer = buffer.slice(offset + payloadLen);

            const msgStr = payload.toString('utf8');
            try {
                const msg = JSON.parse(msgStr);
                if (msg.method === 'Runtime.consoleAPICalled') {
                    console.log('[BROWSER CONSOLE]', msg.params.type, msg.params.args.map(a => a.value || a.description || JSON.stringify(a)));
                } else if (msg.method === 'Runtime.exceptionThrown') {
                    console.log('[EXCEPTION]', msg.params.exceptionDetails);
                } else if (msg.id === 3 || msg.id === 4) {
                    console.log(`[RESPONSE ${msg.id}]`, JSON.stringify(msg.result));
                }
            } catch (_) {}
        }
    });

    client.on('error', err => console.error('Socket err:', err.message));
}

function sendMsg(client, id, method, params = {}) {
    const json = JSON.stringify({ id, method, params });
    const payload = Buffer.from(json);
    const len = payload.length;
    let header;
    if (len < 126) {
        header = Buffer.from([0x81, 0x80 | len]);
    } else if (len <= 0xFFFF) {
        header = Buffer.alloc(4);
        header[0] = 0x81;
        header[1] = 0x80 | 126;
        header.writeUInt16BE(len, 2);
    } else {
        header = Buffer.alloc(10);
        header[0] = 0x81;
        header[1] = 0x80 | 127;
        header.writeBigUInt64BE(BigInt(len), 2);
    }
    const mask = crypto.randomBytes(4);
    const masked = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
        masked[i] = payload[i] ^ mask[i % 4];
    }
    client.write(Buffer.concat([header, mask, masked]));
}

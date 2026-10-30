#!/usr/bin/env node
/**
 * PixelLogic — local licence generator (browser UI).
 *
 *   node scripts/license-server.mjs           # opens on http://127.0.0.1:4599
 *   node scripts/license-server.mjs --port 5000
 *
 * VENDOR-ONLY TOOL. This starts a small web server BOUND TO LOCALHOST ONLY so
 * you can paste a customer's Machine ID into a browser form and get a signed,
 * machine-locked licence key back with one click.
 *
 * SECURITY:
 *  * The Ed25519 PRIVATE key never leaves this Node process — the browser only
 *    ever sends a Machine ID and receives a finished key. The key file is never
 *    served or exposed.
 *  * The server listens on 127.0.0.1 only, so nothing on your network can reach
 *    it. Do NOT change the host binding, and never run this on a public machine.
 *  * NEVER ship this script (or scripts/.keys/) to customers.
 *
 * Generated keys only work on the machine whose ID was supplied — copying a key
 * to another computer fails verification inside the app (licensing.js).
 */
import { createServer } from 'node:http';
import { mintLicense, hasPrivateKey } from './license/mint.mjs';

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const PORT = Number(arg('--port', '4599'));
const HOST = '127.0.0.1'; // localhost only — do not change.

if (!hasPrivateKey()) {
  console.error('Private key not found. Run `node scripts/generate-keypair.mjs` first.');
  process.exit(1);
}

const PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>PixelLogic — Licence Generator</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #0b0d10; color: #e2e8f0;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    padding: 24px;
  }
  .card {
    width: 100%; max-width: 560px; background: #141823; border: 1px solid #2a2d38;
    border-radius: 16px; padding: 32px 36px; box-shadow: 0 24px 64px rgba(0,0,0,.6);
  }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: rgba(255,255,255,.45); font-size: 13px; margin: 0 0 24px; }
  label { display: block; font-size: 11px; font-weight: 600; letter-spacing: .06em;
    text-transform: uppercase; color: rgba(255,255,255,.5); margin: 0 0 6px; }
  input, textarea {
    width: 100%; background: #0b0d10; border: 1px solid #2a2d38; border-radius: 8px;
    padding: 10px 12px; color: #e2e8f0; font-size: 13px; outline: none;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  input:focus, textarea:focus { border-color: #3b82f6; }
  .row { display: flex; gap: 12px; margin-bottom: 18px; }
  .row > div:first-child { flex: 1; }
  .expiry { width: 150px; }
  .expiry select {
    width: 100%; background: #0b0d10; border: 1px solid #2a2d38; border-radius: 8px;
    padding: 10px 12px; color: #e2e8f0; font-size: 13px; outline: none;
  }
  button {
    width: 100%; background: #3b82f6; color: #fff; border: none; border-radius: 8px;
    padding: 12px; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 4px;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  }
  button:disabled { opacity: .6; cursor: default; }
  .result { margin-top: 22px; display: none; }
  .result.show { display: block; }
  .keybox {
    background: #0b0d10; border: 1px solid #16a34a; border-radius: 8px; padding: 12px;
    color: #86efac; font-family: ui-monospace, monospace; font-size: 12.5px;
    word-break: break-all; line-height: 1.5;
  }
  .meta { font-size: 12px; color: rgba(255,255,255,.5); margin: 10px 0 12px; }
  .copy { background: #1f2430; border: 1px solid #2a2d38; }
  .copy.done { border-color: #16a34a; color: #86efac; }
  .error { color: #fca5a5; font-size: 13px; margin-top: 14px; display: none; }
  .error.show { display: block; }
  .warn { margin-top: 22px; font-size: 11px; color: rgba(255,255,255,.3); line-height: 1.5;
    border-top: 1px solid #2a2d38; padding-top: 14px; }
</style>
</head>
<body>
  <div class="card">
    <h1>PixelLogic Licence Generator</h1>
    <p class="sub">Paste the customer's Machine ID, choose validity, and generate a signed key.</p>

    <div style="margin-bottom:18px">
      <label for="machine">Machine ID</label>
      <input id="machine" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" autocomplete="off" spellcheck="false" />
    </div>

    <div class="row">
      <div class="expiry" style="flex:0 0 auto">
        <label for="expiry">Validity</label>
        <select id="expiry">
          <option value="0" selected>Perpetual</option>
          <option value="365">1 year</option>
          <option value="730">2 years</option>
          <option value="90">90 days</option>
          <option value="30">30 days</option>
        </select>
      </div>
    </div>

    <button id="gen">Generate Licence Key</button>

    <div class="error" id="error"></div>

    <div class="result" id="result">
      <label>Licence Key — send this to the customer</label>
      <div class="keybox" id="keybox"></div>
      <div class="meta" id="meta"></div>
      <button class="copy" id="copy">Copy Key</button>
    </div>

    <p class="warn">
      Local vendor tool. The signing key stays on this computer and is never sent to the browser.
      Generated keys work only on the machine whose ID was entered.
    </p>
  </div>

<script>
  const $ = (id) => document.getElementById(id);
  const genBtn = $('gen'), errEl = $('error'), resEl = $('result'),
        keyEl = $('keybox'), metaEl = $('meta'), copyBtn = $('copy');

  async function generate() {
    const machineId = $('machine').value.trim();
    const days = $('expiry').value;
    errEl.classList.remove('show');
    resEl.classList.remove('show');
    if (!machineId) { showError('Please enter a Machine ID.'); return; }

    genBtn.disabled = true; genBtn.textContent = 'Generating…';
    try {
      const r = await fetch('/api/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machineId, days }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) { showError(data.error || 'Failed to generate key.'); return; }
      keyEl.textContent = data.key;
      metaEl.textContent = 'Machine ID: ' + data.machineId + '  •  Expires: ' +
        (data.exp === 0 ? 'never (perpetual)' : new Date(data.exp * 1000).toLocaleString());
      resEl.classList.add('show');
      copyBtn.textContent = 'Copy Key'; copyBtn.classList.remove('done');
    } catch (e) {
      showError('Could not reach the local server.');
    } finally {
      genBtn.disabled = false; genBtn.textContent = 'Generate Licence Key';
    }
  }

  function showError(msg) { errEl.textContent = msg; errEl.classList.add('show'); }

  genBtn.addEventListener('click', generate);
  $('machine').addEventListener('keydown', (e) => { if (e.key === 'Enter') generate(); });
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(keyEl.textContent);
      copyBtn.textContent = 'Copied!'; copyBtn.classList.add('done');
    } catch { /* clipboard blocked */ }
  });
</script>
</body>
</html>`;

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

const server = createServer((req, res) => {
  // Extra guard: reject anything not coming from localhost.
  const remote = req.socket.remoteAddress || '';
  if (!remote.includes('127.0.0.1') && remote !== '::1' && !remote.endsWith(':127.0.0.1')) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(PAGE);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/mint') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 4096) req.destroy(); // guard against oversized payloads
    });
    req.on('end', () => {
      try {
        const { machineId, days } = JSON.parse(body || '{}');
        const result = mintLicense({ machineId, days });
        sendJson(res, 200, { ok: true, ...result });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: err.message });
      }
    });
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}/`;
  console.log('PixelLogic — Licence Generator');
  console.log('Local vendor tool. The signing key never leaves this machine.\n');
  console.log(`  Open:  ${url}`);
  console.log('\nPress Ctrl+C to stop.');
});

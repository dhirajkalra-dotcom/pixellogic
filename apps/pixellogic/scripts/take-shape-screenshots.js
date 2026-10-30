// Shape-feature screenshot script — captures the Pixel Designer in several
// shape states (rectangle, circle, triangle, hexagon) to showcase the new
// LED Wall Shape feature. Connects to Electron via CDP on port 9222.
//
// Usage:
//   1) Launch the app with remote debugging:
//        electron . --remote-debugging-port=9222
//   2) node scripts/take-shape-screenshots.js
//
// Output: scripts/screenshots-v2/  (kept separate from the old screenshots)

const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots-v2');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// Each entry: { shape, value (circle only), name }
const SHOTS = [
  { shape: 'circle',    value: '', name: '02-Pixel-Designer' },        // main hero shot
  { shape: 'rectangle', value: '', name: 'Designer-Shape-Rectangle' },
  { shape: 'triangle',  value: '', name: 'Designer-Shape-Triangle' },
  { shape: 'hexagon',   value: '', name: 'Designer-Shape-Hexagon' },
  { shape: 'diamond',   value: '', name: 'Designer-Shape-Diamond' },
  { shape: 'cross',     value: '', name: 'Designer-Shape-Cross' },
];

function getPages() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

let msgId = 1;
function sendCommand(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    const handler = (raw) => {
      const msg = JSON.parse(raw);
      if (msg.id === id) {
        ws.removeListener('message', handler);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function evaluate(ws, expression) {
  return sendCommand(ws, 'Runtime.evaluate', { expression, returnByValue: true });
}

async function main() {
  const pages = await getPages();
  const page = pages.find(p => p.url.includes('index.html'));
  if (!page) { console.error('Could not find PixelLogic page. Is the app running with --remote-debugging-port=9222?'); process.exit(1); }
  console.log('Connecting to:', page.title);

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.on('open', resolve); ws.on('error', reject); });
  console.log('Connected!');

  await sendCommand(ws, 'Runtime.enable');
  await sendCommand(ws, 'Page.enable');
  await sendCommand(ws, 'Emulation.setDeviceMetricsOverride', {
    width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false
  });
  await sleep(500);

  // Switch to the Pixel Designer tab
  await evaluate(ws, `(function(){var b=document.querySelector('.nav-tab[data-tab="designer"]');if(b){b.click();return 'ok';}return 'no tab';})()`);
  await sleep(1200);

  for (const { shape, value, name } of SHOTS) {
    console.log(`Setting shape = ${shape}${value ? ' (' + value + ')' : ''}`);

    // Set the wall shape select and fire change so the mask re-applies + UI re-renders
    await evaluate(ws, `
      (function(){
        var sel = document.getElementById('wall-shape-select');
        if(!sel) return 'no select';
        sel.value = '${shape}';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        return 'set';
      })()
    `);
    await sleep(900);

    // For circle, set a sizing value to exercise the derived-figure note
    if (shape === 'circle' && value) {
      await evaluate(ws, `
        (function(){
          var inp = document.getElementById('circle-value-input');
          if(!inp) return 'no input';
          inp.value = '${value}';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
          return 'set';
        })()
      `);
      await sleep(900);
    }

    // Make sure the page is scrolled to the top so the designer header + preview show
    await evaluate(ws, `window.scrollTo(0,0);`);
    await sleep(400);

    const result = await sendCommand(ws, 'Page.captureScreenshot', { format: 'png', quality: 100 });
    const buffer = Buffer.from(result.data, 'base64');
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    fs.writeFileSync(filePath, buffer);
    console.log(`  Saved: ${filePath}`);
  }

  console.log('\nDone! Screenshots saved to:', SCREENSHOT_DIR);
  ws.close();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });

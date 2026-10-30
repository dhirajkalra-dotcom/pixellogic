// Screenshot script — connects to Electron via CDP and captures each tab
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const OPTIMIZED_SCREENSHOT_DIR = path.join(SCREENSHOT_DIR, 'optimized');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
if (!fs.existsSync(OPTIMIZED_SCREENSHOT_DIR)) fs.mkdirSync(OPTIMIZED_SCREENSHOT_DIR, { recursive: true });

// Tabs to screenshot (data-tab attribute values)
const TABS = [
  { tab: 'shows',                    name: '01-New-Shows' },
  { tab: 'saved',                    name: '02-Saved-Shows' },
  { tab: 'designer',                 name: '03-Pixel-Designer' },
  { tab: 'effects',                  name: '04-Special-Effects' },
  { tab: 'visualizer',               name: '05-2D-Visualizer' },
  { tab: 'view3d',                   name: '06-3D-Visualizer' },
  { tab: 'canvas',                   name: '07-Output-Maps' },
  { tab: 'led-patching',             name: '08-Signal-Patching' },
  { tab: 'av-engineering',           name: '09-AV-Schematics' },
  { tab: 'pdf',                      name: '10-PDF-Export' },
  { tab: 'power-calc',               name: '11-Power-Calc' },
  { tab: 'utility-tools',            name: '12-Misc-Tools' },
  { tab: 'projector-test-pattern',   name: '13-Projector-Test-Pattern' },
  { tab: 'help',                     name: '14-Help' },
];

function getPages() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
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

async function main() {
  const pages = await getPages();
  const page = pages.find(p => p.url.includes('index.html'));
  if (!page) { console.error('Could not find PixelLogic page'); process.exit(1); }
  console.log('Connecting to:', page.title, page.webSocketDebuggerUrl);

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  console.log('Connected!');

  // Enable necessary domains
  await sendCommand(ws, 'Runtime.enable');
  await sendCommand(ws, 'Page.enable');

  // Maximize / set a consistent viewport
  await sendCommand(ws, 'Emulation.setDeviceMetricsOverride', {
    width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false
  });
  await sleep(500);

  for (const { tab, name } of TABS) {
    console.log(`Capturing: ${name} (tab=${tab})`);
    // Click the tab
    await sendCommand(ws, 'Runtime.evaluate', {
      expression: `
        (function() {
          var btn = document.querySelector('.nav-tab[data-tab="${tab}"]');
          if (btn) { btn.click(); return 'clicked'; }
          return 'not found';
        })()
      `,
      returnByValue: true
    });
    await sleep(1200); // wait for tab render

    if (tab === 'led-patching') {
      const prepared = await sendCommand(ws, 'Runtime.evaluate', {
        expression: `
          (function() {
            var drawButton = Array.from(document.querySelectorAll('button')).find(function(button) {
              return button.textContent.trim() === 'DRAW LINES';
            });
            if (!drawButton) return 'draw control unavailable';
            drawButton.click();
            return 'draw mode enabled';
          })()
        `,
        returnByValue: true
      });
      console.log(`  ${prepared.result.value}`);
      await sleep(300);

      const firstRoute = await sendCommand(ws, 'Runtime.evaluate', {
        expression: `
          (function() {
            var tiles = Array.from(document.querySelectorAll('.pl-draw-tile'));
            var columns = {};
            tiles.forEach(function(tile) {
              var rect = tile.querySelector('rect');
              var x = rect ? rect.getAttribute('x') : '';
              if (!columns[x]) columns[x] = [];
              columns[x].push(tile);
            });
            var orderedColumns = Object.keys(columns).sort(function(a, b) { return Number(a) - Number(b); });
            function clickTile(tile) {
              tile.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1 }));
              tile.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, pointerId: 1 }));
            }
            (columns[orderedColumns[0]] || []).slice(0, 5).forEach(clickTile);
            return orderedColumns.length;
          })()
        `,
        returnByValue: true
      });
      await sleep(250);

      await sendCommand(ws, 'Runtime.evaluate', {
        expression: `
          (function() {
            var nextPort = Array.from(document.querySelectorAll('button')).find(function(button) {
              return button.textContent.includes('NEXT PORT');
            });
            if (nextPort) nextPort.click();
            return nextPort ? 'advanced to next port' : 'next port unavailable';
          })()
        `,
        returnByValue: true
      });
      await sleep(250);

      await sendCommand(ws, 'Runtime.evaluate', {
        expression: `
          (function() {
            var tiles = Array.from(document.querySelectorAll('.pl-draw-tile'));
            var columns = {};
            tiles.forEach(function(tile) {
              var rect = tile.querySelector('rect');
              var x = rect ? rect.getAttribute('x') : '';
              if (!columns[x]) columns[x] = [];
              columns[x].push(tile);
            });
            var orderedColumns = Object.keys(columns).sort(function(a, b) { return Number(a) - Number(b); });
            function clickTile(tile) {
              tile.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 2 }));
              tile.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, pointerId: 2 }));
            }
            (columns[orderedColumns[1]] || []).slice(0, 4).forEach(clickTile);
            return 'manual data routes prepared';
          })()
        `,
        returnByValue: true
      });
      await sleep(700);
    }

    // Take screenshot
    const result = await sendCommand(ws, 'Page.captureScreenshot', {
      format: 'png', quality: 100
    });
    const buffer = Buffer.from(result.data, 'base64');
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    fs.writeFileSync(filePath, buffer);
    await sharp(buffer).jpeg({ quality: 88, mozjpeg: true }).toFile(path.join(OPTIMIZED_SCREENSHOT_DIR, `${name}.jpg`));
    console.log(`  Saved: ${filePath}`);
  }

  // Now try to trigger the tour and capture a few tour steps
  console.log('\\nStarting app tour screenshots...');
  // Open tour
  await sendCommand(ws, 'Runtime.evaluate', {
    expression: `
      (function() {
        // Try to find and click the "Start Tour" button in the Help tab
        var btn = document.querySelector('.nav-tab[data-tab="help"]');
        if (btn) btn.click();
        return 'switched to help';
      })()
    `,
    returnByValue: true
  });
  await sleep(800);

  await sendCommand(ws, 'Runtime.evaluate', {
    expression: `
      (function() {
        if (typeof window.startPixelLogicTutorial === 'function') {
          window.startPixelLogicTutorial();
          return 'tour started';
        }
        return 'tour unavailable';
      })()
    `,
    returnByValue: true
  });
  await sleep(1500);

  // Capture several tour steps
  for (let step = 0; step < 14; step++) {
    const result2 = await sendCommand(ws, 'Page.captureScreenshot', {
      format: 'png', quality: 100
    });
    const buffer2 = Buffer.from(result2.data, 'base64');
    const filePath2 = path.join(SCREENSHOT_DIR, `Tour-Step-${String(step + 1).padStart(2, '0')}.png`);
    fs.writeFileSync(filePath2, buffer2);
    console.log(`  Saved: ${filePath2}`);

    // Click next
    await sendCommand(ws, 'Runtime.evaluate', {
      expression: `
        (function() {
          var btn = document.getElementById('pl-tut-next');
          if (!btn) {
            var btns = document.querySelectorAll('button');
            for(var b of btns) { if (b.textContent.trim() === 'Next' || b.textContent.includes('Next')) { btn = b; break; } }
          }
          if (btn) { btn.click(); return 'next clicked'; }
          return 'no next button';
        })()
      `,
      returnByValue: true
    });
    await sleep(1200);
  }

  console.log('\\nDone! All screenshots saved to:', SCREENSHOT_DIR);
  ws.close();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });

// Runtime smoke sweep: visits every tab and records console errors / uncaught exceptions.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const fresh = process.argv.includes('--fresh');
if (fresh) app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'pl-sweep-')));
const profArg = process.argv.find(a => a.startsWith('--profile='));
if (profArg) app.setPath('userData', profArg.slice('--profile='.length));

// Stub IPC handlers that live in main.js so the renderer doesn't hit missing-handler noise.
const stubs = {
  'get-installed-template': () => null,
  'get-app-version': () => '1.0.135-test',
  'get-system-fonts': () => ['Arial', 'Segoe UI'],
  'check-first-run': () => false,
  'license-status': () => ({ valid: true, edition: 'advanced', tier: 'pro' }),
  'license-machine-id': () => 'TEST',
  'get-graphics-status': () => ({}),
  'external-output:get-status': () => ({ active: false }),
  'ai-auto-map-key-status': () => ({ hasKey: false }),
};
for (const [k, fn] of Object.entries(stubs)) ipcMain.handle(k, fn);

const TABS = ['shows', 'sheets', 'designer', 'effects', 'visualizer', 'view3d', 'canvas', 'led-patching', 'pdf',
  'power-calc', 'projector-test-pattern', 'devices', 'utility-tools', 'video-converter', 'help'];

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1600, height: 950, show: false,
    webPreferences: { preload: path.join(__dirname, '..', 'preload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false }
  });
  const log = [];
  let currentTab = 'load';
  win.webContents.on('console-message', (e) => {
    const level = e.level ?? e.params?.level;
    const msg = e.message ?? e.params?.message;
    const lvl = typeof level === 'string' ? level : ['verbose', 'info', 'warning', 'error'][level];
    if (lvl === 'error' || lvl === 'warning') log.push({ tab: currentTab, lvl, msg: String(msg).slice(0, 400), src: `${e.sourceId || ''}:${e.lineNumber || ''}` });
  });
  win.webContents.on('render-process-gone', (_e, d) => log.push({ tab: currentTab, lvl: 'CRASH', msg: JSON.stringify(d) }));

  await win.loadFile(path.join(__dirname, '..', 'index.html'));
  await new Promise(r => setTimeout(r, 2500));

  // Hook uncaught errors inside the page
  await win.webContents.executeJavaScript(`
    window.__sweepErrors = [];
    window.addEventListener('error', e => window.__sweepErrors.push('ERR ' + (e.message||'') + ' @' + (e.lineno||'') + ':' + (e.colno||'')));
    window.addEventListener('unhandledrejection', e => window.__sweepErrors.push('REJ ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));
    const sw = document.getElementById('app-edition-switch');
    if (sw && !sw.checked) sw.click();
    true;
  `);
  await new Promise(r => setTimeout(r, 500));

  const perTab = {};
  for (const tab of TABS) {
    currentTab = tab;
    const res = await win.webContents.executeJavaScript(`
      (async () => {
        window.__sweepErrors = [];
        const btn = document.querySelector('[data-tab="${tab}"]');
        if (!btn) return { found: false };
        const t0 = performance.now();
        btn.click();
        await new Promise(r => setTimeout(r, 1500));
        const content = document.getElementById('${tab}-content') || document.querySelector('[id="${tab}-tab"], [data-tab-content="${tab}"]');
        const visible = content ? (content.offsetParent !== null || getComputedStyle(content).display !== 'none') : null;
        return { found: true, ms: Math.round(performance.now() - t0), visible, hasContent: !!content, errors: window.__sweepErrors.slice() };
      })()
    `).catch(err => ({ execError: String(err) }));
    perTab[tab] = res;
  }

  const out = { perTab, console: log };
  fs.writeFileSync(path.join(__dirname, 'sweep_result.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2).slice(0, 20000));
  app.quit();
});

// Re-run effects tab against real profile and capture full stack of the render error
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const profArg = process.argv.find(a => a.startsWith('--profile='));
if (profArg) app.setPath('userData', profArg.slice(10));
['get-installed-template', 'get-app-version', 'get-system-fonts', 'check-first-run', 'license-status', 'license-machine-id', 'get-graphics-status', 'external-output:get-status', 'ai-auto-map-key-status']
  .forEach(k => ipcMain.handle(k, () => k === 'license-status' ? { valid: true, edition: 'advanced' } : null));
const tab = (process.argv.find(a => a.startsWith('--tab=')) || '--tab=effects').slice(6);
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1600, height: 950, webPreferences: { preload: path.join(__dirname, '..', 'preload.js'), contextIsolation: true, backgroundThrottling: false } });
  await win.loadFile(path.join(__dirname, '..', 'index.html'));
  await new Promise(r => setTimeout(r, 2500));
  const r = await win.webContents.executeJavaScript(`(async () => {
    const out = [];
    const origErr = console.error;
    console.error = (...a) => { out.push(a.map(x => x && x.stack ? x.stack : String(x)).join(' | ')); origErr.apply(console, a); };
    const sw = document.getElementById('app-edition-switch'); if (sw && !sw.checked) sw.click();
    await new Promise(r => setTimeout(r, 300));
    document.querySelector('[data-tab="${tab}"]').click();
    await new Promise(r => setTimeout(r, 1500));
    return out;
  })()`);
  console.log(r.join('\n\n'));
  app.quit();
});

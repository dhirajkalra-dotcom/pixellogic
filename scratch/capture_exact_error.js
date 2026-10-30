const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const errLog = path.join(__dirname, 'exact_error.log');
fs.writeFileSync(errLog, '');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.webContents.on('console-message', (e, level, msg, line, src) => {
    const lineStr = `[CONSOLE ${level}] ${msg} (${src}:${line})\n`;
    fs.appendFileSync(errLog, lineStr);
    console.log(lineStr);
  });

  await win.loadFile(path.join(__dirname, '..', 'index.html'));
  await new Promise((r) => setTimeout(r, 1000));

  const result = await win.webContents.executeJavaScript(`
    (async () => {
      try {
        switchTab('view3d');
        await new Promise(r => setTimeout(r, 800));
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message, stack: e.stack };
      }
    })()
  `);

  fs.appendFileSync(errLog, 'Result: ' + JSON.stringify(result, null, 2) + '\n');
  app.quit();
});

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

process.on('uncaughtException', (err) => {
  fs.writeFileSync(path.join(__dirname, 'err.txt'), String(err.stack || err));
  process.exit(1);
});

app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    win.webContents.on('console-message', (e, level, msg) => {
      fs.appendFileSync(path.join(__dirname, 'console.txt'), msg + '\n');
    });

    await win.loadFile(path.join(__dirname, '..', 'index.html'));

    // Wait a brief moment for scripts to initialize
    await new Promise(r => setTimeout(r, 1000));

    const res = await win.webContents.executeJavaScript(`
      (() => {
        try {
          const p = typeof state !== 'undefined' && state.projects ? state.projects.find(x => x.id === state.activeProjectId) : null;
          const m = p && p.pixelMaps ? p.pixelMaps[0] : null;
          const c = m && typeof calculateLayout === 'function' ? calculateLayout(m) : null;
          return {
            mapCount: p && p.pixelMaps ? p.pixelMaps.length : 0,
            mapNames: p && p.pixelMaps ? p.pixelMaps.map(x => x.name) : [],
            calc: c ? {
              screenWidthMm: c.screenWidthMm,
              screenHeightMm: c.screenHeightMm,
              horizontalPanels: c.horizontalPanels,
              verticalPanels: c.verticalPanels,
              totalResWidth: c.totalResWidth,
              totalResHeight: c.totalResHeight
            } : null
          };
        } catch(err) {
          return { error: err.message };
        }
      })()
    `);

    fs.writeFileSync(path.join(__dirname, 'calc_res.json'), JSON.stringify(res, null, 2));
  } catch (e) {
    fs.writeFileSync(path.join(__dirname, 'err.txt'), String(e.stack || e));
  } finally {
    app.quit();
  }
});

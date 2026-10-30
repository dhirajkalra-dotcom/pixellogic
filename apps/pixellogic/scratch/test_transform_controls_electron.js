const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await win.loadFile(path.join(__dirname, '..', 'index.html'));
  await new Promise((r) => setTimeout(r, 1200));

  const result = await win.webContents.executeJavaScript(`
    (() => {
      try {
        const hasTC = typeof window.THREE !== 'undefined' && typeof window.THREE.TransformControls !== 'undefined';
        let tcInstance = null;
        if (hasTC) {
          const camera = new window.THREE.PerspectiveCamera();
          const dom = document.createElement('div');
          tcInstance = new window.THREE.TransformControls(camera, dom);
        }
        return {
          hasTransformControls: hasTC,
          canInstantiate: !!tcInstance,
          modes: tcInstance ? ['translate', 'rotate', 'scale'].filter(m => {
            try { tcInstance.setMode(m); return true; } catch(e) { return false; }
          }) : []
        };
      } catch (err) {
        return { error: err.message, stack: err.stack };
      }
    })()
  `);

  console.log('TransformControls Test in Electron:', JSON.stringify(result, null, 2));
  app.quit();
});

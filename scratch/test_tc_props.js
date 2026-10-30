const { app, BrowserWindow } = require('electron');
const path = require('path');

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

  const res = await win.webContents.executeJavaScript(`
    (() => {
      const THREE = window.THREE;
      const tc = new THREE.TransformControls(new THREE.PerspectiveCamera(), document.createElement('div'));
      tc.setSpace('world');
      tc.setTranslationSnap(0.1);
      tc.setRotationSnap(0.087);
      return { space: tc.space, tSnap: tc.translationSnap, rSnap: tc.rotationSnap };
    })()
  `);

  console.log('Result:', JSON.stringify(res, null, 2));
  app.quit();
});

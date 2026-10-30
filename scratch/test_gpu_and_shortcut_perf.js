const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const logFile = path.join(__dirname, 'perf_and_gpu_test_result.json');

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
  await new Promise((r) => setTimeout(r, 1500));

  const result = await win.webContents.executeJavaScript(`
    (async () => {
      try {
        if (typeof applyAppEdition === 'function' && typeof APP_EDITIONS !== 'undefined') {
          applyAppEdition(APP_EDITIONS.advanced);
        }

        switchTab('view3d');
        await new Promise(r => setTimeout(r, 600));

        // 1. Verify HUD title and GPU Badge
        const hudTitle = document.querySelector('.view3d-root .text-amber-400');
        const hudTitleText = hudTitle ? hudTitle.textContent.trim() : '';
        const gpuNameEl = document.getElementById('v3d-gpu-name');
        const gpuNameText = gpuNameEl ? gpuNameEl.textContent.trim() : '';

        // 2. Measure tool switching performance (W -> E -> R -> Q)
        const times = [];
        const modes = ['translate', 'rotate', 'scale', 'select', 'translate'];

        for (const mode of modes) {
          const t0 = performance.now();
          const btn = document.querySelector(\`.v3d-tool-btn[data-tool="\${mode}"]\`);
          if (btn) btn.click();
          const t1 = performance.now();
          times.push({ mode, durationMs: Number((t1 - t0).toFixed(2)) });
        }

        // 3. Test keyboard shortcuts (W, E, R, Q)
        const keyTimes = [];
        const keys = ['w', 'e', 'r', 'q'];
        for (const k of keys) {
          const t0 = performance.now();
          window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
          const t1 = performance.now();
          keyTimes.push({ key: k, activeMode: state.view3dState.toolMode, durationMs: Number((t1 - t0).toFixed(2)) });
        }

        // Check if any mention of Autodesk or 3ds Max exists in the DOM
        const bodyText = document.querySelector('.view3d-root').innerText;
        const containsAutodesk = /autodesk|3ds\\s*max/i.test(bodyText);

        return {
          success: true,
          hudTitleText,
          gpuNameText,
          containsAutodesk,
          buttonClickTimes: times,
          keyShortcutTimes: keyTimes,
          finalToolMode: state.view3dState.toolMode
        };
      } catch (err) {
        return {
          success: false,
          error: err.message,
          stack: err.stack
        };
      }
    })()
  `);

  fs.writeFileSync(logFile, JSON.stringify(result, null, 2));
  console.log('Result:', JSON.stringify(result, null, 2));
  app.quit();
});

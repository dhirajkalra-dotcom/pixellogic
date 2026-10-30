const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const logFile = path.join(__dirname, 'view3d_full_interaction_result.json');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.webContents.on('console-message', (e, level, msg) => {
    if (level >= 2) console.log(`[BROWSER CONSOLE ${level}] ${msg}`);
  });

  await win.loadFile(path.join(__dirname, '..', 'index.html'));
  await new Promise((r) => setTimeout(r, 1200));

  const result = await win.webContents.executeJavaScript(`
    (async () => {
      try {
        if (typeof applyAppEdition === 'function' && typeof APP_EDITIONS !== 'undefined') {
          applyAppEdition(APP_EDITIONS.advanced);
        }
        switchTab('view3d');
        await new Promise(r => setTimeout(r, 800));

        const canvas = document.getElementById('view3d-canvas');
        if (!canvas) throw new Error('Canvas not found');

        // Test Preset switching
        const presetTests = {};
        const presets = ['front', 'left', 'right', 'top', 'back', 'persp'];
        for (const p of presets) {
          const btn = document.querySelector(\`.v3d-cam-preset[data-view="\${p}"]\`);
          if (!btn) throw new Error('Preset button not found: ' + p);
          btn.click();
          await new Promise(r => setTimeout(r, 80));
          presetTests[p] = {
            activeClass: btn.className.includes('text-sky-300'),
            hudText: document.getElementById('v3d-hud-stats')?.textContent || ''
          };
        }

        // Test Tool switching (including new Pan and Orbit tools)
        const toolTests = {};
        const tools = ['translate', 'rotate', 'scale', 'select', 'pan', 'orbit'];
        for (const t of tools) {
          const btn = document.querySelector(\`.v3d-tool-btn[data-tool="\${t}"]\`);
          if (btn) {
            btn.click();
            await new Promise(r => setTimeout(r, 50));
            toolTests[t] = btn.className.includes('bg-amber-400');
          }
        }

        // Test Stage Pan / Tilt / Center Nudge Buttons
        const nudgeTests = {};
        const stageButtons = [
          'v3d-stage-pan-left',
          'v3d-stage-pan-right',
          'v3d-stage-pan-up',
          'v3d-stage-pan-down',
          'v3d-stage-tilt-up',
          'v3d-stage-tilt-down',
          'v3d-stage-center'
        ];

        for (const btnId of stageButtons) {
          const btn = document.getElementById(btnId);
          if (btn) {
            btn.click();
            await new Promise(r => setTimeout(r, 50));
            nudgeTests[btnId] = true;
          } else {
            nudgeTests[btnId] = false;
          }
        }

        // Also test switching to Canvas / Output Maps tab to verify live bottom-right badge
        switchTab('canvas');
        await new Promise(r => setTimeout(r, 600));
        const canvasBadge = document.getElementById('canvas-bottom-right-scale-badge');
        const canvasBadgeExists = !!canvasBadge;
        const canvasBadgeText = canvasBadge ? canvasBadge.textContent.trim() : '';

        return {
          success: true,
          canvasFound: true,
          presetTests,
          toolTests,
          nudgeTests,
          canvasBadgeExists,
          canvasBadgeText: canvasBadgeText.slice(0, 120)
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

  fs.writeFileSync(logFile, JSON.stringify(result, null, 2), 'utf8');
  console.log('Test completed:', JSON.stringify(result, null, 2));
  app.quit();
});

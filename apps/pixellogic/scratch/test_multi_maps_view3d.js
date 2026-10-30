const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const logFile = path.join(__dirname, 'multi_map_test_result.json');

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
    console.log(`[BROWSER CONSOLE ${level}] ${msg}`);
  });

  await win.loadFile(path.join(__dirname, '..', 'index.html'));
  await new Promise((r) => setTimeout(r, 1500));

  const result = await win.webContents.executeJavaScript(`
    (async () => {
      try {
        if (typeof applyAppEdition === 'function' && typeof APP_EDITIONS !== 'undefined') {
          applyAppEdition(APP_EDITIONS.advanced);
        }

        // Add 2 more test pixel maps to active project
        const p = state.projects.find(x => String(x.id) === String(state.activeProjectId));
        const baseMap = p.pixelMaps[0];

        const map2 = JSON.parse(JSON.stringify(baseMap));
        map2.id = 'map-test-left-wing';
        map2.name = 'Stage Left Wing';
        map2.horizontalPanels = 4;
        map2.verticalPanels = 4;
        p.pixelMaps.push(map2);

        const map3 = JSON.parse(JSON.stringify(baseMap));
        map3.id = 'map-test-right-wing';
        map3.name = 'Stage Right Wing';
        map3.horizontalPanels = 4;
        map3.verticalPanels = 4;
        p.pixelMaps.push(map3);

        // Reset view3dState to simulate a fresh load with multiple maps
        state.view3dState = {};

        // Switch to 3D tab
        switchTab('view3d');
        await new Promise(r => setTimeout(r, 500));

        const initialComposeIds = [...state.view3dState.composeMapIds];

        // 1. Verify initially ONLY 1 map is loaded into composeMapIds, not all 3!
        const initialCount = initialComposeIds.length;

        // 2. Add Left Wing to 3D scene by clicking its add button or triggering logic
        const addBtn = document.querySelector('.v3d-add-screen-item-btn[data-mapid="map-test-left-wing"]');
        if (addBtn) addBtn.click();
        await new Promise(r => setTimeout(r, 300));
        const afterAddIds = [...state.view3dState.composeMapIds];

        // 3. Move Left Wing to Left Wing preset
        const leftWingPresetBtn = document.querySelector('.v3d-pos-preset[data-pos-preset="left-wing"]');
        if (leftWingPresetBtn) leftWingPresetBtn.click();
        await new Promise(r => setTimeout(r, 300));
        const leftWingTf = { ...state.view3dState.mapTransforms['map-test-left-wing'] };

        // 4. Change mountMode to ground support
        const groundBtn = document.querySelector('.v3d-mount-btn[data-mount-mode="ground"]');
        if (groundBtn) groundBtn.click();
        await new Promise(r => setTimeout(r, 300));
        const updatedMount = state.view3dState.mapTransforms['map-test-left-wing'].mountMode;

        // 5. Remove the base map from 3D scene
        const removeBaseBtn = document.querySelector('.v3d-remove-map-btn[data-mapid="' + baseMap.id + '"]');
        if (removeBaseBtn) removeBaseBtn.click();
        await new Promise(r => setTimeout(r, 300));
        const finalComposeIds = [...state.view3dState.composeMapIds];

        return {
          success: true,
          initialCount,
          initialComposeIds,
          afterAddIds,
          leftWingTf,
          updatedMount,
          finalComposeIds
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
  console.log('Multi-Map Result:', JSON.stringify(result, null, 2));
  app.quit();
});

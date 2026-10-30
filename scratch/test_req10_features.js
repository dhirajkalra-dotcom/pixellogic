const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const logFile = path.join(__dirname, 'req10_test_result.json');

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
    console.log(`[BROWSER ${level}] ${msg}`);
  });

  await win.loadFile(path.join(__dirname, '..', 'index.html'));
  await new Promise((r) => setTimeout(r, 1500));

  const result = await win.webContents.executeJavaScript(`
    (async () => {
      try {
        if (typeof applyAppEdition === 'function' && typeof APP_EDITIONS !== 'undefined') {
          applyAppEdition(APP_EDITIONS.advanced);
        }

        // Ensure we have at least 2 pixel maps in the active project for testing multi-screen gap and snapping
        const prj = state.projects.find(p => p.id === state.activeProjectId);
        if (!prj.pixelMaps) prj.pixelMaps = [];
        while (prj.pixelMaps.length < 2) {
          const newMap = {
            id: 'test-map-' + (prj.pixelMaps.length + 1),
            name: 'LED Wall ' + (prj.pixelMaps.length + 1),
            brand: 'Absen',
            model: 'PL2.5 Pro',
            horizontalPanels: 8,
            verticalPanels: 4,
            panelWidthMm: 500,
            panelHeightMm: 500
          };
          prj.pixelMaps.push(newMap);
        }
        if (typeof persistProjects === 'function') persistProjects();

        // Switch to 3D View
        switchTab('view3d');
        await new Promise(r => setTimeout(r, 600));

        // 1. Verify Top-Left Toolbar has NO add/remove buttons or chips
        const topHeader = document.querySelector('.view3d-root header');
        const topLeftSection = topHeader ? topHeader.children[0] : null;
        const topLeftButtons = topLeftSection ? Array.from(topLeftSection.querySelectorAll('button')) : [];
        const hasAddOnTopLeft = topLeftButtons.some(b => b.textContent.includes('Add') || b.textContent.includes('+'));

        // 2. Verify Active 3D Screen dropdown in Inspector
        const activeScreenDropdown = document.getElementById('v3d-active-screen-dropdown');
        const removeScreenBtn = document.getElementById('v3d-remove-selected-screen-btn');
        const addScreenSelect = document.getElementById('v3d-add-screen-select');
        const confirmAddBtn = document.getElementById('v3d-confirm-add-screen-btn');

        // Initial compose map IDs
        const initialComposeIds = [...state.view3dState.composeMapIds];

        // 3. Add second screen to 3D scene if not already added
        if (addScreenSelect && confirmAddBtn && addScreenSelect.options.length > 1) {
          addScreenSelect.selectedIndex = 1;
          confirmAddBtn.click();
          await new Promise(r => setTimeout(r, 400));
        }

        const composeIdsAfterAdd = [...state.view3dState.composeMapIds];

        // 4. Verify Gap dimension and snapping options with 2 screens
        const gapValElem = document.getElementById('v3d-live-gap-val');
        const gapValText = gapValElem ? gapValElem.textContent.trim() : null;
        const snapLeftBtn = document.getElementById('v3d-snap-flush-left');
        const snapRightBtn = document.getElementById('v3d-snap-flush-right');
        const alignTrimBtn = document.getElementById('v3d-align-trim-btn');
        const alignDepthBtn = document.getElementById('v3d-align-depth-btn');

        // Test one-click snap action
        let snappedGapText = null;
        if (snapRightBtn) {
          snapRightBtn.click();
          await new Promise(r => setTimeout(r, 300));
          const updatedGapElem = document.getElementById('v3d-live-gap-val');
          snappedGapText = updatedGapElem ? updatedGapElem.textContent.trim() : null;
        }

        // 5. Test Screen Removal
        const removeBtnNow = document.getElementById('v3d-remove-selected-screen-btn');
        let composeIdsAfterRemove = [];
        if (removeBtnNow) {
          removeBtnNow.click();
          await new Promise(r => setTimeout(r, 300));
          composeIdsAfterRemove = [...state.view3dState.composeMapIds];
        }

        return {
          success: true,
          topLeftButtonsCount: topLeftButtons.length,
          hasAddOnTopLeft,
          activeScreenDropdownFound: !!activeScreenDropdown,
          removeScreenBtnFound: !!removeScreenBtn,
          initialComposeIds,
          composeIdsAfterAdd,
          gapValText,
          hasSnapButtons: !!(snapLeftBtn && snapRightBtn && alignTrimBtn && alignDepthBtn),
          snappedGapText,
          composeIdsAfterRemove
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

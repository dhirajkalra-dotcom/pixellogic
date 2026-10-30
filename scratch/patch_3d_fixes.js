const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'view3d-pro.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Helper function parseTrimHeight
if (!code.includes('function parseTrimHeight')) {
  const insertBefore = '  function calculateScreenGapInfo(';
  const helperCode = `  function parseTrimHeight(v, d = 1.0) {
    if (typeof v === 'undefined' || v === null || v === '') return d;
    const num = Number(v);
    return Number.isFinite(num) ? num : d;
  }\n\n`;
  code = code.replace(insertBefore, helperCode + insertBefore);
}

// 2. Replace (Number(sTf.trimHeightM) || 1.0) and similar
code = code.replace(/Number\(sTf\.trimHeightM\)\s*\|\|\s*1\.0/g, 'parseTrimHeight(sTf.trimHeightM, 1.0)');
code = code.replace(/Number\(oTf\.trimHeightM\)\s*\|\|\s*1\.0/g, 'parseTrimHeight(oTf.trimHeightM, 1.0)');
code = code.replace(/Number\(tf\.trimHeightM\)\s*\|\|\s*1\.0/g, 'parseTrimHeight(tf.trimHeightM, 1.0)');
code = code.replace(/Number\(lTf\.trimHeightM\)\s*\|\|\s*1\.0/g, 'parseTrimHeight(lTf.trimHeightM, 1.0)');
code = code.replace(/Number\(firstWall\.transform\.trimHeightM\)\s*\|\|\s*1\.0/g, 'parseTrimHeight(firstWall.transform.trimHeightM, 1.0)');

// 3. WebGLRenderer logarithmicDepthBuffer & sharp zoom-out
code = code.replace(
  /const renderer = new THREE\.WebGLRenderer\(\{\s*canvas,\s*antialias: true,\s*powerPreference: 'high-performance',\s*preserveDrawingBuffer: true\s*\}\);/,
  `const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      logarithmicDepthBuffer: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });`
);

// 4. Fog: Remove dense exponential fog so zooming out doesn't wipe out screen clarity
code = code.replace(
  'scene.fog = new THREE.FogExp2(s.backgroundTopColor, 0.012);',
  'scene.fog = null; // High clarity: no exponential fog darkening when zooming out'
);

// 5. frontMat polygonOffset to avoid Z-fighting with chassis at distance
code = code.replace(
  'frontMat.toneMapped = false;',
  'frontMat.toneMapped = false;\n    frontMat.polygonOffset = true;\n    frontMat.polygonOffsetFactor = -2;\n    frontMat.polygonOffsetUnits = -4;'
);

// 6. Undo/Redo: undo should push to redo!
code = code.replace(
  /const snap = history\.undo\.pop\(\);\s*if \(snap\) \{\s*history\.undo\.push\(captureSceneSnapshot\(\)\);\s*restoreSnapshot\(snap\);\s*\}/,
  `const snap = history.undo.pop();
          if (snap) { history.redo.push(captureSceneSnapshot()); restoreSnapshot(snap); }`
);

// 7. Keyboard shortcuts safety (avoid inputs/textareas, require active container, avoid hijacking Ctrl/Alt)
code = code.replace(
  "if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;",
  `if (e.target.closest && e.target.closest('input, select, textarea, [contenteditable="true"]')) return;
      if (!container.isConnected || !container.offsetParent) return;
      if (e.altKey || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() !== 'z')) return;`
);

// 8. Top camera preset: avoid breaking OrbitControls with up=(0,0,-1)
code = code.replace(
  /camera\.position\.set\(target\.x,\s*target\.y \+ frameDist \* 1\.3,\s*target\.z \+ 0\.0001\);\s*camera\.up\.set\(0,\s*0,\s*-1\);/,
  `camera.position.set(target.x, target.y + frameDist * 1.3, target.z + 0.001);
        camera.up.set(0, 1, 0);`
);

// 9. Ground support masts: place directly behind the actual panel columns so curved screens never show masts in front!
const oldGroundSupport = `        } else if (mount === 'ground') {
          const numMasts = Math.max(2, Math.round(widthM / 2));
          for (let mIdx = 0; mIdx < numMasts; mIdx++) {
            const mastX = -widthM / 2 + 0.4 + mIdx * ((widthM - 0.8) / Math.max(1, numMasts - 1));
            const gs = createGroundSupportMesh(heightM, trimH);
            gs.position.set(posX + mastX * Math.cos(rotYRad), 0, posZ - mastX * Math.sin(rotYRad));
            gs.rotation.y = rotYRad;
            riggingGroup.add(gs);
          }
        }`;

const newGroundSupport = `        } else if (mount === 'ground') {
          // Position ground support masts strictly behind actual screen panel columns (supports curves & L-corners)
          const numMasts = Math.max(2, Math.round(widthM / 2));
          const stepCols = Math.max(1, Math.floor((cols - 1) / Math.max(1, numMasts - 1)));
          const colIndices = [];
          for (let i = 0; i < numMasts; i++) {
            colIndices.push(Math.min(cols - 1, i * stepCols));
          }
          const actualH = heightM * (Number(tf.scale) || 1);
          colIndices.forEach((colIdx) => {
            const colChild = screenWallGroup.children[colIdx];
            const mastLocalX = colChild ? colChild.position.x : (-widthM / 2 + 0.4 + colIdx * (widthM / cols));
            const mastLocalZ = colChild ? colChild.position.z - (panelDepth / 2 + 0.14) : -0.2;
            const mastColRot = colChild ? colChild.rotation.y : 0;
            const gs = createGroundSupportMesh(actualH, trimH);
            // Transform local mast pos to world space
            const mastWorldX = posX + (mastLocalX * Math.cos(rotYRad) + mastLocalZ * Math.sin(rotYRad)) * (Number(tf.scale) || 1);
            const mastWorldZ = posZ + (-mastLocalX * Math.sin(rotYRad) + mastLocalZ * Math.cos(rotYRad)) * (Number(tf.scale) || 1);
            gs.position.set(mastWorldX, 0, mastWorldZ);
            gs.rotation.y = rotYRad + mastColRot;
            riggingGroup.add(gs);
          });
        }`;

if (code.includes('const numMasts = Math.max(2, Math.round(widthM / 2));')) {
  code = code.replace(oldGroundSupport, newGroundSupport);
}

// 10. Truss height accounting for scale
code = code.replace(
  'trussMesh.position.set(posX, posY + heightM / 2 + 0.42, posZ);',
  'const actualScreenHalfH = (heightM * (Number(tf.scale) || 1)) / 2;\n          trussMesh.position.set(posX, posY + actualScreenHalfH + 0.42, posZ);'
);

// 11. Event listeners for corner angle, corner col, stage card & color
const cornerListeners = `
    // L-Corner Column Slider & Angle Buttons
    const cornerColInput = container.querySelector('#v3d-corner-col');
    if (cornerColInput) {
      cornerColInput.addEventListener('input', () => {
        if (!selectedEntry) return;
        selectedEntry.transform.cornerCol = Number(cornerColInput.value) || 1;
        const colLabel = container.querySelector('#v3d-corner-col-label');
        if (colLabel) colLabel.textContent = \`Col \${selectedEntry.transform.cornerCol}\`;
      });
      cornerColInput.addEventListener('change', () => {
        if (!selectedEntry) return;
        pushHistory();
        selectedEntry.transform.cornerCol = Number(cornerColInput.value) || 1;
        persistProjects();
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    }
    container.querySelectorAll('.v3d-corner-ang').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!selectedEntry) return;
        pushHistory();
        selectedEntry.transform.cornerAngleDeg = Number(btn.getAttribute('data-corner-ang')) || 90;
        persistProjects();
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    });

    // Stage Deck Selection & Color
    container.querySelectorAll('.v3d-stage-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('input, button')) return;
        const id = card.getAttribute('data-stageid');
        s.selectedStageObjectId = id;
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    });
    container.querySelectorAll('.v3d-stage-color').forEach((colInput) => {
      colInput.addEventListener('change', () => {
        const id = colInput.getAttribute('data-stageid');
        const deck = s.stageObjects.find((d) => String(d.id) === String(id));
        if (deck) {
          pushHistory();
          deck.color = colInput.value;
          persistProjects();
          renderView3DPro(container, activeMap, activeProject, helpers);
        }
      });
    });
`;

if (!code.includes('v3d-corner-ang')) {
  // Already in template, insert listeners right after mounting mode buttons
  const anchor = "selectedEntry.transform.mountMode = btn.getAttribute('data-mount-mode');";
  const anchorBlock = code.indexOf(anchor);
  if (anchorBlock !== -1) {
    const insertPos = code.indexOf('});', anchorBlock) + 3;
    code = code.slice(0, insertPos) + '\n' + cornerListeners + code.slice(insertPos);
  }
}

// 12. View3DPro.render return a stable object with dispose
const oldExport = `  window.View3DPro = {
    render: (container, activeMap, activeProject, helpers = {}) => {
      renderView3DPro(container, activeMap, activeProject, helpers);
      return window.__view3dProRuntime;
    }
  };`;

const newExport = `  window.View3DPro = {
    render: (container, activeMap, activeProject, helpers = {}) => {
      renderView3DPro(container, activeMap, activeProject, helpers);
      return {
        dispose: () => {
          try {
            if (window.__view3dProRuntime && typeof window.__view3dProRuntime.dispose === 'function') {
              window.__view3dProRuntime.dispose();
            }
          } catch (_) {}
          window.__view3dProRuntime = null;
        }
      };
    }
  };`;

if (code.includes('return window.__view3dProRuntime;')) {
  code = code.replace(oldExport, newExport);
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully patched src/view3d-pro.js!');

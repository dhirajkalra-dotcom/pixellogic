(function () {
  'use strict';

  function renderView3DPro(container, activeMap, activeProject, helpers = {}) {
    if (window.__view3dProRuntime && typeof window.__view3dProRuntime.dispose === 'function') {
      try { window.__view3dProRuntime.dispose(); } catch (_) {}
      window.__view3dProRuntime = null;
    }
    const {
      state,
      calculateLayout,
      drawVisualizerCanvas,
      persistProjects,
      showNotification,
      showInputModal,
      applyDemoWatermarkToCanvas,
      switchTab,
      escapeHtml: escapeHtmlHelper
    } = helpers;

    const escapeHtml = typeof escapeHtmlHelper === 'function'
      ? escapeHtmlHelper
      : (str) => String(str || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');

    if (!state.view3dState || typeof state.view3dState !== 'object') state.view3dState = {};
    const s = state.view3dState;

    const mapPool = Array.isArray(activeProject?.pixelMaps) && activeProject.pixelMaps.length
      ? activeProject.pixelMaps
      : (activeMap ? [activeMap] : []);

    // ──────────────────────────────────────────────────────────────────────────
    // 1. SELECTIVE LED WALL MANAGEMENT
    // ──────────────────────────────────────────────────────────────────────────
    const validPoolIds = new Set(mapPool.map((m) => String(m.id)));

    if (!Array.isArray(s.composeMapIds)) {
      const initialId = String(activeMap?.id || mapPool[0]?.id || '');
      s.composeMapIds = initialId ? [initialId] : [];
    } else {
      s.composeMapIds = s.composeMapIds.filter((id) => validPoolIds.has(String(id)));
    }

    if (!s.selectedMapId || !s.composeMapIds.includes(String(s.selectedMapId))) {
      s.selectedMapId = s.composeMapIds[0] || '';
    }

    const activeComposeMaps = mapPool.filter((m) => s.composeMapIds.includes(String(m.id)));
    const availableToAdd = mapPool.filter((m) => !s.composeMapIds.includes(String(m.id)));

    // View defaults (3D Transform tool modes: 'select', 'translate', 'rotate', 'scale', 'orbit', 'pan')
    if (!s.toolMode) s.toolMode = 'translate';
    if (!s.gizmoSpace) s.gizmoSpace = 'world';
    if (typeof s.mapAutoSnap === 'undefined') s.mapAutoSnap = true;
    if (!Number.isFinite(Number(s.mapSnapGap))) s.mapSnapGap = 0.0; // 0.00m flush seam by default
    if (!Number.isFinite(Number(s.mapAutoSnapRange))) s.mapAutoSnapRange = 0.30; // 30cm magnetic range
    if (!s.inspectorTab) s.inspectorTab = 'wall';
    if (!s.surfaceMode) s.surfaceMode = 'pattern';
    if (!Number.isFinite(Number(s.rotX))) s.rotX = 14;
    if (!Number.isFinite(Number(s.rotY))) s.rotY = 25;
    if (!Number.isFinite(Number(s.panX))) s.panX = 0;
    if (!Number.isFinite(Number(s.panY))) s.panY = 0;
    if (!Number.isFinite(Number(s.distance))) s.distance = 11;
    if (typeof s.showGrid === 'undefined') s.showGrid = true;
    if (typeof s.showAxes === 'undefined') s.showAxes = true;
    if (typeof s.showUV === 'undefined') s.showUV = true;
    if (typeof s.showRigging === 'undefined') s.showRigging = true;
    if (typeof s.showHuman === 'undefined') s.showHuman = true;
    if (typeof s.showDimensions === 'undefined') s.showDimensions = true;
    if (typeof s.showReflection === 'undefined') s.showReflection = true;
    if (typeof s.showLabels === 'undefined') s.showLabels = true;
    if (!Number.isFinite(Number(s.uvOpacity))) s.uvOpacity = 95;
    if (!Number.isFinite(Number(s.gridSizeM))) s.gridSizeM = 1;
    if (!s.backgroundTopColor) s.backgroundTopColor = '#060a12';
    if (!s.backgroundBottomColor) s.backgroundBottomColor = '#0d1527';
    if (!s.gridMinorColor) s.gridMinorColor = '#1e293b';
    if (!s.gridMajorColor) s.gridMajorColor = '#334155';
    if (!Array.isArray(s.stageObjects)) s.stageObjects = [];
    if (!s.selectedStageObjectId && s.stageObjects.length) s.selectedStageObjectId = String(s.stageObjects[0].id);
    if (!Array.isArray(s.savedCameraViews)) s.savedCameraViews = [];

    // Ensure mapTransforms exist for each active map
    if (!s.mapTransforms || typeof s.mapTransforms !== 'object') s.mapTransforms = {};
    activeComposeMaps.forEach((m) => {
      const k = String(m.id);
      if (!s.mapTransforms[k]) {
        s.mapTransforms[k] = {
          x: 0,
          y: 0,
          z: 0,
          rotY: 0,
          rotX: 0,
          rotZ: 0,
          scale: 1,
          wallShape: 'flat',
          curveDeg: 0,
          cornerCol: 5,
          cornerAngleDeg: 90,
          mountMode: 'flown',
          trimHeightM: 1.0
        };
      }
      const tf = s.mapTransforms[k];
      if (!Number.isFinite(Number(tf.x))) tf.x = 0;
      if (!Number.isFinite(Number(tf.y))) tf.y = 0;
      if (!Number.isFinite(Number(tf.z))) tf.z = 0;
      if (!Number.isFinite(Number(tf.rotY))) tf.rotY = 0;
      if (!Number.isFinite(Number(tf.rotX))) tf.rotX = 0;
      if (!Number.isFinite(Number(tf.scale))) tf.scale = 1;
      if (!tf.wallShape) tf.wallShape = 'flat';
      if (!Number.isFinite(Number(tf.curveDeg))) tf.curveDeg = 0;
      if (!Number.isFinite(Number(tf.cornerCol))) tf.cornerCol = 5;
      if (!Number.isFinite(Number(tf.cornerAngleDeg))) tf.cornerAngleDeg = 90;
      if (!['flown', 'ground', 'wall'].includes(tf.mountMode)) tf.mountMode = 'flown';
      if (!Number.isFinite(Number(tf.trimHeightM))) tf.trimHeightM = 1.0;
    });

    // History Undo/Redo Manager
    const historyProjectId = String(activeProject?.id || state.activeProjectId || 'default');
    if (!window.__view3dHistory || window.__view3dHistory.projectId !== historyProjectId) {
      window.__view3dHistory = { projectId: historyProjectId, undo: [], redo: [] };
    }
    const history = window.__view3dHistory;

    const captureSceneSnapshot = () => JSON.parse(JSON.stringify({
      composeMapIds: s.composeMapIds,
      selectedMapId: s.selectedMapId,
      mapTransforms: s.mapTransforms,
      stageObjects: s.stageObjects,
      selectedStageObjectId: s.selectedStageObjectId,
      rotX: s.rotX,
      rotY: s.rotY,
      panX: s.panX,
      panY: s.panY,
      distance: s.distance
    }));

    const pushHistory = () => {
      const snap = captureSceneSnapshot();
      const ser = JSON.stringify(snap);
      const prev = history.undo[history.undo.length - 1];
      if (!prev || JSON.stringify(prev) !== ser) {
        history.undo.push(snap);
        if (history.undo.length > 40) history.undo.shift();
      }
      history.redo = [];
    };

    const restoreSnapshot = (snap) => {
      if (!snap) return;
      Object.assign(s, JSON.parse(JSON.stringify(snap)));
      if (typeof persistProjects === 'function') persistProjects();
      renderView3DPro(container, activeMap, activeProject, helpers);
    };

    // Calculate layout metrics for active compose maps
    const mapRenderData = activeComposeMaps.map((m) => {
      const calcs = (typeof calculateLayout === 'function' ? calculateLayout(m) : null) || {};
      const widthM = Math.max(0.2, (Number(calcs.screenWidthMm || 0) || 4000) / 1000);
      const heightM = Math.max(0.2, (Number(calcs.screenHeightMm || 0) || 2500) / 1000);
      const cols = Math.max(1, Math.round(Number(calcs.horizontalPanels) || Number(m.horizontalPanels) || 8));
      const rows = Math.max(1, Math.round(Number(calcs.verticalPanels) || Number(m.verticalPanels) || 5));
      const resW = Math.max(1, Math.round(Number(calcs.totalResWidth) || 1920));
      const resH = Math.max(1, Math.round(Number(calcs.totalResHeight) || 1080));
      const weightKg = Math.round(Number(calcs.totalWeightKg) || (cols * rows * 8.5));
      const powerW = Math.round(Number(calcs.totalMaxPowerWatts) || (cols * rows * 180));
      const brand = String(calcs.brand || m.brand || 'LED');
      const model = String(calcs.model || m.model || 'Panel');
      const key = String(m.id);
      const tf = s.mapTransforms[key];

      return {
        id: key,
        map: m,
        calcs,
        widthM,
        heightM,
        cols,
        rows,
        resW,
        resH,
        weightKg,
        powerW,
        brand,
        model,
        transform: tf
      };
    });

    const selectedEntry = mapRenderData.find((it) => it.id === String(s.selectedMapId)) || mapRenderData[0] || null;
    const selTf = selectedEntry ? selectedEntry.transform : null;

    // ──────────────────────────────────────────────────────────────────────────
    // 2. WALL-TO-WALL GAP & NEAREST SCREEN CALCULATION
    // ──────────────────────────────────────────────────────────────────────────
    const getNearestScreenGap = (sourceEntry) => {
      if (!sourceEntry || mapRenderData.length < 2) return null;
      const sTf = sourceEntry.transform;
      const sW = sourceEntry.widthM * (Number(sTf.scale) || 1);
      const sH = sourceEntry.heightM * (Number(sTf.scale) || 1);
      const sX = Number(sTf.x) || 0;
      const sY = (Number(sTf.trimHeightM) || 1.0) + sH / 2;
      const sZ = Number(sTf.z) || 0;

      let nearest = null;
      let minDistance = Infinity;

      mapRenderData.forEach((other) => {
        if (other.id === sourceEntry.id) return;
        const oTf = other.transform;
        const oW = other.widthM * (Number(oTf.scale) || 1);
        const oH = other.heightM * (Number(oTf.scale) || 1);
        const oX = Number(oTf.x) || 0;
        const oY = (Number(oTf.trimHeightM) || 1.0) + oH / 2;
        const oZ = Number(oTf.z) || 0;

        // Proximity in 3D
        const dist = Math.hypot(sX - oX, sY - oY, sZ - oZ);
        if (dist < minDistance) {
          minDistance = dist;

          // Calculate horizontal edge-to-edge gap
          let gapX = 0;
          let side = 'left';
          let edgePointSource = { x: 0, y: sY, z: sZ };
          let edgePointTarget = { x: 0, y: oY, z: oZ };

          if (sX < oX) {
            // Source is to the left of Target
            gapX = (oX - oW / 2) - (sX + sW / 2);
            side = 'left';
            edgePointSource.x = sX + sW / 2;
            edgePointTarget.x = oX - oW / 2;
          } else {
            // Source is to the right of Target
            gapX = (sX - sW / 2) - (oX + oW / 2);
            side = 'right';
            edgePointSource.x = sX - sW / 2;
            edgePointTarget.x = oX + oW / 2;
          }

          const deltaTrim = (Number(sTf.trimHeightM) || 1.0) - (Number(oTf.trimHeightM) || 1.0);
          const deltaZ = sZ - oZ;

          nearest = {
            target: other,
            gapX,
            side,
            deltaTrim,
            deltaZ,
            edgePointSource,
            edgePointTarget,
            sourceWidth: sW,
            targetWidth: oW,
            sourceTrim: Number(sTf.trimHeightM) || 1.0,
            targetTrim: Number(oTf.trimHeightM) || 1.0,
            targetX: oX,
            targetZ: oZ
          };
        }
      });

      return nearest;
    };

    const nearestInfo = getNearestScreenGap(selectedEntry);

    // ──────────────────────────────────────────────────────────────────────────
    // 3. RENDER HTML SHELL
    // Clean top toolbar (NO add/remove buttons at left top; centralized in sidebar)
    // ──────────────────────────────────────────────────────────────────────────
    container.innerHTML = `
      <div class="view3d-root flex flex-col h-full bg-[#060a12] text-slate-200 select-none overflow-hidden font-sans">

        <!-- Top 3D Viewport Toolbar -->
        <header class="h-14 bg-[#090f1d] border-b border-slate-800 flex items-center justify-between px-4 shrink-0 z-20 gap-3">
          
          <!-- Left: Clean Section Title & Screen Count (User requested NO add/remove on top left) -->
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2 px-3 py-1 bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-black tracking-wider">
              <svg class="w-4 h-4 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="3" width="20" height="14"/><path d="M8 21h8M12 17v4"/></svg>
              <span>3D VISUALIZER</span>
            </div>
            <span class="text-xs text-slate-400 font-mono">
              ${activeComposeMaps.length} ${activeComposeMaps.length === 1 ? 'Screen' : 'Screens'} in 3D Scene
            </span>
          </div>

          <!-- Center-Right: 3D Transform Gizmos (Q, W, E, R) & Tools -->
          <div class="flex items-center gap-2 shrink-0">
            
            <!-- 3D Transform Gizmo Modes -->
            <div class="flex items-center bg-[#070d18] border border-slate-700 p-0.5">
              <span class="text-[10px] uppercase font-black px-1.5 text-slate-500 select-none tracking-wider">LED:</span>
              ${[
                { id: 'select', key: 'Q', label: 'Select (Q)', title: 'Select Only [Q]', icon: '<path d="M3 3l7 18 3-7 7-3L3 3z"/>' },
                { id: 'translate', key: 'W', label: 'Move (W)', title: 'Select & Move [W] (3D Tripod Gizmo)', icon: '<path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>' },
                { id: 'rotate', key: 'E', label: 'Rotate (E)', title: 'Select & Rotate [E] (Gimbal Rings Gizmo)', icon: '<path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>' },
                { id: 'scale', key: 'R', label: 'Scale (R)', title: 'Select & Scale [R] (Scale Handles Gizmo)', icon: '<rect x="2" y="2" width="6" height="6"/><rect x="16" y="2" width="6" height="6"/><rect x="9" y="16" width="6" height="6"/><path d="M5 8v6h14V8"/>' }
              ].map((t) => `
                <button
                  type="button"
                  data-tool="${t.id}"
                  class="v3d-tool-btn px-2.5 py-1 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    s.toolMode === t.id
                      ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }"
                  title="${t.title}"
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">${t.icon}</svg>
                  <span>${t.label}</span>
                </button>
              `).join('')}
              <button
                type="button"
                id="v3d-toggle-space-btn"
                class="px-2 py-1 border-l border-slate-700 hover:bg-slate-800 text-[11px] font-mono font-bold text-sky-400 cursor-pointer"
                title="Toggle Transform Gizmo Space: World (WLD) / Local (LOC)"
              >
                ${s.gizmoSpace === 'local' ? 'LOC' : 'WLD'}
              </button>
            </div>

            <!-- Stage Interface Navigation (Pan & Tilt Options on Header) -->
            <div class="flex items-center bg-[#070d18] border border-sky-800/70 p-0.5 gap-0.5">
              <span class="text-[10px] uppercase font-black px-1.5 text-sky-400 select-none tracking-wider">Stage View:</span>
              
              <!-- Pan Stage Tool (V) -->
              <button
                type="button"
                data-tool="pan"
                class="v3d-tool-btn px-2 py-1 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  s.toolMode === 'pan'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }"
                title="Pan Stage Interface [V] (Drag in 3D viewport to pan stage view)"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>
                <span>Pan (V)</span>
              </button>

              <!-- Tilt / Orbit Stage Tool (C) -->
              <button
                type="button"
                data-tool="orbit"
                class="v3d-tool-btn px-2 py-1 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  s.toolMode === 'orbit'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }"
                title="Tilt & Orbit Stage Interface [C] (Drag in 3D viewport to tilt and orbit view)"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><ellipse cx="12" cy="12" rx="9" ry="5"/></svg>
                <span>Tilt/Orbit (C)</span>
              </button>

              <span class="w-px h-4 bg-slate-700 mx-0.5"></span>

              <!-- Direct Pan Stage Nudge Controls -->
              <div class="flex items-center" title="Nudge Stage Pan: Left, Up, Down, Right">
                <button type="button" id="v3d-stage-pan-left" class="px-1.5 py-1 text-xs font-mono font-bold text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer" title="Pan Stage Left">◄</button>
                <button type="button" id="v3d-stage-pan-up" class="px-1.5 py-1 text-xs font-mono font-bold text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer" title="Pan Stage Up">▲</button>
                <button type="button" id="v3d-stage-pan-down" class="px-1.5 py-1 text-xs font-mono font-bold text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer" title="Pan Stage Down">▼</button>
                <button type="button" id="v3d-stage-pan-right" class="px-1.5 py-1 text-xs font-mono font-bold text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer" title="Pan Stage Right">►</button>
              </div>

              <span class="w-px h-4 bg-slate-700 mx-0.5"></span>

              <!-- Direct Tilt Stage Nudge Controls -->
              <div class="flex items-center" title="Nudge Stage Tilt: Up or Down">
                <button type="button" id="v3d-stage-tilt-up" class="px-1.5 py-1 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer" title="Tilt Stage Up">Tilt ▲</button>
                <button type="button" id="v3d-stage-tilt-down" class="px-1.5 py-1 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer" title="Tilt Stage Down">Tilt ▼</button>
              </div>

              <span class="w-px h-4 bg-slate-700 mx-0.5"></span>

              <!-- Center Stage View -->
              <button type="button" id="v3d-stage-center" class="px-2 py-1 text-xs font-bold text-amber-300 hover:text-amber-200 hover:bg-amber-950/50 border border-amber-500/30 cursor-pointer" title="Re-center Stage View">
                ⟲ Center
              </button>
            </div>

            <!-- Camera View Presets -->
            <div class="flex items-center bg-[#070d18] border border-slate-700 p-0.5">
              ${[
                { id: 'persp', label: '3D' },
                { id: 'front', label: 'Front' },
                { id: 'left', label: 'Left' },
                { id: 'right', label: 'Right' },
                { id: 'top', label: 'Top' },
                { id: 'back', label: 'Rear' }
              ].map((v) => `
                <button
                  type="button"
                  data-view="${v.id}"
                  class="v3d-cam-preset px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    (s.cameraPreset || 'persp') === v.id
                      ? 'bg-sky-500/20 text-sky-300 font-black border-b-2 border-sky-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }"
                  title="${v.label} camera viewport"
                >${v.label}</button>
              `).join('')}
            </div>

            <!-- Surface Mode -->
            <select id="v3d-surface-mode-select" class="bg-[#070d18] border border-slate-700 text-xs font-bold text-sky-300 px-2 py-1 outline-none cursor-pointer">
              <option value="pattern" ${s.surfaceMode === 'pattern' ? 'selected' : ''}>🎨 Test Pattern</option>
              <option value="data" ${s.surfaceMode === 'data' ? 'selected' : ''}>🔌 Signal Patching</option>
              <option value="power" ${s.surfaceMode === 'power' ? 'selected' : ''}>⚡ Power Circuits</option>
              <option value="frame" ${s.surfaceMode === 'frame' ? 'selected' : ''}>🔲 Cabinet Frames</option>
            </select>

            <!-- Quick Add Stage Deck Button -->
            <button
              type="button"
              id="v3d-top-add-stage-btn"
              class="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              title="Add a modular stage deck platform centered beneath the LED wall"
            >
              <svg class="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="14" width="20" height="8" rx="1"/><path d="M6 14V6l6-3 6 3v8"/></svg>
              <span>+ Stage Deck</span>
            </button>

            <!-- Snapshot PNG -->
            <button
              type="button"
              id="v3d-snapshot-btn"
              class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="Capture PNG snapshot of the 3D scene"
            >
              <svg class="w-3.5 h-3.5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <span>Snapshot</span>
            </button>
          </div>
        </header>

        <!-- Main Body: Viewport + Inspector Sidebar -->
        <div class="flex-1 flex overflow-hidden relative">

          <!-- 3D WebGL Viewport -->
          <main class="flex-1 relative overflow-hidden bg-gradient-to-b from-[#060a12] to-[#0c1526]">
            <canvas id="view3d-canvas" class="w-full h-full block cursor-default"></canvas>

            <!-- Viewport HUD Overlay -->
            <div class="absolute top-3 left-3 pointer-events-none flex flex-col gap-1 text-[11px] font-mono text-slate-400 bg-[#070d18]/90 border border-slate-800 p-2.5 shadow-xl backdrop-blur-sm z-10">
              <div class="flex items-center gap-2">
                <span class="text-amber-400 font-black tracking-wider">3D TRANSFORM GIZMO</span>
                <span id="v3d-gpu-badge" class="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 flex items-center gap-1.5 font-mono">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span id="v3d-gpu-name">NVIDIA Dedicated GPU</span>
                </span>
              </div>
              <div class="text-[10px] text-slate-300">
                <span class="text-amber-300 font-bold">W</span> Move Gizmo | <span class="text-amber-300 font-bold">E</span> Rotate Gizmo | <span class="text-amber-300 font-bold">R</span> Scale | <span class="text-amber-300 font-bold">Q</span> Select
              </div>
              <div class="text-[10px] text-slate-400">
                LMB: Orbit / Gizmo | RMB / Shift: Pan Camera | Wheel: Zoom
              </div>
              <div id="v3d-hud-stats" class="text-[10px] text-sky-400 pt-0.5 border-t border-slate-800/80">
                View: ${(s.cameraPreset || '3D').toUpperCase()} · Hardware Accelerated 60 FPS
              </div>
            </div>

            <!-- Live Gap Dimension Floating Status Badge (Bottom Left) -->
            ${nearestInfo ? `
              <div id="v3d-gap-hud-badge" class="absolute bottom-3 left-3 pointer-events-none flex items-center gap-2.5 bg-[#070d18]/95 border ${Math.abs(nearestInfo.gapX) <= 0.02 ? 'border-emerald-400 shadow-emerald-500/30' : 'border-amber-400 shadow-amber-500/20'} px-3.5 py-2 shadow-2xl backdrop-blur-sm z-10">
                <span class="w-2.5 h-2.5 ${Math.abs(nearestInfo.gapX) <= 0.02 ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse"></span>
                <div class="text-xs">
                  <span class="text-slate-400 font-medium">To ${escapeHtml(nearestInfo.target.map.name || 'Adjacent Screen')}:</span>
                  <strong class="font-mono ${Math.abs(nearestInfo.gapX) <= 0.02 ? 'text-emerald-300' : 'text-amber-300'} font-bold ml-1 text-sm">
                    ${Math.abs(nearestInfo.gapX) <= 0.02 ? 'FLUSH (0.00 m)' : `${nearestInfo.gapX > 0 ? `Gap: ${nearestInfo.gapX.toFixed(2)} m` : `Overlap: ${Math.abs(nearestInfo.gapX).toFixed(2)} m`}`}
                  </strong>
                  <span class="text-[10px] text-slate-400 ml-2 font-mono">ΔY: ${nearestInfo.deltaTrim.toFixed(2)}m · ΔZ: ${nearestInfo.deltaZ.toFixed(2)}m</span>
                </div>
              </div>
            ` : (selectedEntry ? `
              <div class="absolute bottom-3 left-3 pointer-events-none flex items-center gap-2 bg-[#070d18]/95 border border-sky-500/40 px-3 py-1.5 shadow-xl backdrop-blur-sm z-10">
                <span class="w-2.5 h-2.5 bg-sky-400 animate-pulse"></span>
                <span class="text-xs font-bold text-white">${escapeHtml(selectedEntry.map.name || 'Screen')}</span>
                <span class="text-[11px] font-mono text-sky-300">${selectedEntry.widthM}×${selectedEntry.heightM}m</span>
                <span class="text-[11px] text-slate-400">· Pos: <strong class="text-white font-mono font-bold">X:${(Number(selTf.x)||0).toFixed(2)} Y:${(Number(selTf.trimHeightM)||0).toFixed(2)} Z:${(Number(selTf.z)||0).toFixed(2)}</strong></span>
              </div>
            ` : '')}
          </main>

          <!-- Right: Inspector Sidebar -->
          <aside class="w-88 bg-[#0a101d] border-l border-slate-800 flex flex-col shrink-0 z-10">
            
            <!-- Inspector Tabs -->
            <div class="grid grid-cols-3 gap-0 bg-[#070d18] border-b border-slate-800 shrink-0">
              ${[
                { id: 'wall', label: '🏢 1. LED Wall' },
                { id: 'stage', label: `🎭 2. Staging ${s.stageObjects.length ? `(${s.stageObjects.length})` : ''}` },
                { id: 'scene', label: '🌐 3. Scene' }
              ].map((tab) => `
                <button
                  type="button"
                  data-insp-tab="${tab.id}"
                  class="v3d-insp-tab py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                    s.inspectorTab === tab.id
                      ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }"
                >${tab.label}</button>
              `).join('')}
            </div>

            <!-- Inspector Scrollable Content -->
            <div class="flex-1 overflow-y-auto p-3.5 space-y-3.5">

              <!-- TAB 1: LED WALL PROPERTIES, CONSOLIDATED 3D SCREEN MANAGER & SNAPPING -->
              ${s.inspectorTab === 'wall' ? (selectedEntry ? `
                
                <!-- CONSOLIDATED ACTIVE 3D SCREEN DROPDOWN, ADD & REMOVE (User Requested Only Here) -->
                <div class="bg-[#0f192c] border border-slate-800 p-3 space-y-2.5">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <svg class="w-3.5 h-3.5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14"/><path d="M8 21h8M12 17v4"/></svg>
                      Active 3D Screen
                    </span>
                    <span class="px-2 py-0.5 bg-sky-500/20 border border-sky-500/40 text-[10px] font-mono font-bold text-sky-300">${escapeHtml(selectedEntry.brand)} · ${escapeHtml(selectedEntry.model)}</span>
                  </div>

                  <!-- Select Active Screen Dropdown + Remove Screen Button -->
                  <div class="space-y-1">
                    <label class="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Switch Current 3D Screen</label>
                    <div class="flex items-center gap-1.5">
                      <select id="v3d-active-screen-dropdown" class="flex-1 bg-[#070d18] border border-slate-700 px-2.5 py-1.5 text-xs text-white font-bold outline-none cursor-pointer focus:border-amber-400">
                        ${activeComposeMaps.map((m) => {
                          const calcs = (typeof calculateLayout === 'function' ? calculateLayout(m) : null) || {};
                          const wM = ((Number(calcs.screenWidthMm || 0) || 4000) / 1000).toFixed(1);
                          const hM = ((Number(calcs.screenHeightMm || 0) || 2500) / 1000).toFixed(1);
                          return `
                            <option value="${escapeHtml(m.id)}" ${String(m.id) === String(s.selectedMapId) ? 'selected' : ''}>
                              ${escapeHtml(m.name || 'Screen')} (${wM}×${hM}m)
                            </option>
                          `;
                        }).join('')}
                      </select>

                      <button
                        type="button"
                        id="v3d-remove-selected-screen-btn"
                        class="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                        title="Remove this screen from the 3D scene"
                      >
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>

                  <!-- Add Another Project Screen into 3D Scene Dropdown -->
                  <div class="pt-2 border-t border-slate-800/80">
                    ${availableToAdd.length > 0 ? `
                      <div class="space-y-1">
                        <label class="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Add Project Screen to 3D Scene</label>
                        <div class="flex items-center gap-1.5">
                          <select id="v3d-add-screen-select" class="flex-1 bg-[#070d18] border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200 font-medium outline-none cursor-pointer focus:border-emerald-400">
                            <option value="" disabled selected>-- Choose screen to add --</option>
                            ${availableToAdd.map((m) => {
                              const calcs = (typeof calculateLayout === 'function' ? calculateLayout(m) : null) || {};
                              const wM = ((Number(calcs.screenWidthMm || 0) || 4000) / 1000).toFixed(1);
                              const hM = ((Number(calcs.screenHeightMm || 0) || 2500) / 1000).toFixed(1);
                              return `
                                <option value="${escapeHtml(m.id)}">
                                  ${escapeHtml(m.name || 'Screen')} (${wM}×${hM}m)
                                </option>
                              `;
                            }).join('')}
                          </select>
                          <button
                            type="button"
                            id="v3d-confirm-add-screen-btn"
                            class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold border border-emerald-400 shadow-sm cursor-pointer transition-all flex items-center gap-1"
                            title="Add chosen screen into 3D scene"
                          >
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    ` : `
                      <div class="text-[11px] text-slate-500 py-1 flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>All project screens placed in 3D scene</span>
                      </div>
                    `}
                  </div>
                </div>

                <!-- WALL-TO-WALL GAP DIMENSIONS & SNAPPING OPTIONS (Direct User Request) -->
                <div class="bg-[#0f192c] border border-slate-800 p-3 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <svg class="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16M4 12l4-4M4 12l4 4M20 12l-4-4M20 12l-4 4"/></svg>
                      Wall Gap & Snapping
                    </span>
                    <span class="text-[10px] text-slate-400 font-mono">
                      ${nearestInfo ? `Target: ${escapeHtml(nearestInfo.target.map.name || 'Screen')}` : 'Single Screen'}
                    </span>
                  </div>

                  ${nearestInfo ? `
                    <!-- Live Gap Dimension Readout -->
                    <div class="bg-[#08101f] border border-slate-800 p-2.5 space-y-2">
                      <div class="flex items-center justify-between">
                        <span class="text-[11px] text-slate-300 font-bold">Edge-to-Edge Gap</span>
                        <span id="v3d-live-gap-val" class="text-xs font-mono font-black ${Math.abs(nearestInfo.gapX) <= 0.02 ? 'text-emerald-300' : 'text-amber-300'}">
                          ${Math.abs(nearestInfo.gapX) <= 0.02 ? '0.00 m (Flush Seam)' : `${nearestInfo.gapX > 0 ? `${nearestInfo.gapX.toFixed(2)} m (Gap)` : `${Math.abs(nearestInfo.gapX).toFixed(2)} m (Overlap)`}`}
                        </span>
                      </div>
                      <div class="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/80">
                        <div>Trim Δ: <strong class="text-slate-200">${nearestInfo.deltaTrim.toFixed(2)} m</strong></div>
                        <div>Depth Δ: <strong class="text-slate-200">${nearestInfo.deltaZ.toFixed(2)} m</strong></div>
                      </div>
                    </div>

                    <!-- Instant Snap Actions -->
                    <div class="space-y-1.5">
                      <span class="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Instant Snapping Actions</span>
                      <div class="grid grid-cols-2 gap-1.5">
                        <button type="button" id="v3d-snap-flush-left" class="py-1.5 px-2 bg-[#08101f] hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-sky-300 flex items-center justify-between cursor-pointer">
                          <span>⇥ Snap Left Edge</span>
                          <span class="text-[9px] font-mono text-slate-400">0.00m</span>
                        </button>
                        <button type="button" id="v3d-snap-flush-right" class="py-1.5 px-2 bg-[#08101f] hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-sky-300 flex items-center justify-between cursor-pointer">
                          <span>Snap Right Edge ⇤</span>
                          <span class="text-[9px] font-mono text-slate-400">0.00m</span>
                        </button>
                      </div>
                      <div class="grid grid-cols-2 gap-1.5">
                        <button type="button" id="v3d-align-trim-btn" class="py-1.5 px-2 bg-[#08101f] hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-emerald-300 flex items-center justify-between cursor-pointer">
                          <span>Align Trim Height</span>
                          <span class="text-[9px] font-mono text-slate-400">Y Match</span>
                        </button>
                        <button type="button" id="v3d-align-depth-btn" class="py-1.5 px-2 bg-[#08101f] hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-amber-300 flex items-center justify-between cursor-pointer">
                          <span>Align Depth (Z)</span>
                          <span class="text-[9px] font-mono text-slate-400">Coplanar</span>
                        </button>
                      </div>
                    </div>

                    <!-- Magnetic Auto-Snap Controls -->
                    <div class="pt-2 border-t border-slate-800/80 space-y-2">
                      <label class="flex items-center justify-between text-xs text-slate-300 bg-[#08101f] border border-slate-800 px-2.5 py-1.5 cursor-pointer">
                        <span>Magnetic Auto-Snap while Moving</span>
                        <input type="checkbox" id="v3d-toggle-autosnap" ${s.mapAutoSnap ? 'checked' : ''} class="w-4 h-4 accent-amber-400 cursor-pointer" />
                      </label>
                      <div class="flex items-center justify-between text-xs">
                        <span class="text-slate-400">Snap Gap Preset</span>
                        <div class="flex items-center gap-1">
                          ${[0.0, 0.05, 0.10, 0.50].map((gp) => `
                            <button type="button" data-snap-gap="${gp}" class="v3d-snap-gap-btn px-2 py-0.5 text-xs font-mono border cursor-pointer ${Number(s.mapSnapGap) === gp ? 'bg-amber-400 text-slate-950 font-black' : 'bg-[#08101f] border-slate-800 text-slate-400'}">
                              ${gp === 0 ? 'Flush' : `${gp}m`}
                            </button>
                          `).join('')}
                        </div>
                      </div>
                    </div>
                  ` : `
                    <div class="text-xs text-slate-400 bg-[#08101f] border border-dashed border-slate-800 p-2.5 text-center">
                      Only 1 screen in scene. Add another screen to see live gap dimensions and enable magnetic snapping.
                    </div>
                  `}
                </div>

                <!-- 3D POSITION & TRANSFORM GIZMO SECTION -->
                <div class="bg-[#0f192c] border border-slate-800 p-3 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <svg class="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>
                      3D Transform & Coordinates
                    </span>
                    <button type="button" id="v3d-reset-pos-btn" class="text-[10px] text-sky-400 hover:text-sky-300 font-semibold underline cursor-pointer">Reset (0,0,0)</button>
                  </div>

                  <!-- Coordinates & Numeric Step Inputs -->
                  <div class="space-y-2.5">
                    <!-- X Position (Horizontal) -->
                    <div>
                      <div class="flex items-center justify-between text-xs mb-1">
                        <span class="text-slate-300 font-semibold flex items-center gap-1"><span class="text-rose-400 font-bold">X</span> Horizontal (Red Arrow)</span>
                        <span id="v3d-lbl-x" class="font-mono text-rose-300 font-bold text-xs">${(Number(selTf.x) || 0).toFixed(2)} m</span>
                      </div>
                      <div class="flex items-center gap-1">
                        <button type="button" class="v3d-bump-btn px-2 py-1 bg-[#08101f] hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 cursor-pointer" data-field="x" data-delta="-1.0">-1m</button>
                        <button type="button" class="v3d-bump-btn px-1.5 py-1 bg-[#08101f] hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 cursor-pointer" data-field="x" data-delta="-0.1">-0.1</button>
                        <input type="number" step="0.1" value="${(Number(selTf.x) || 0).toFixed(2)}" data-field="x" class="v3d-coord-input flex-1 bg-[#08101f] border border-slate-700 px-2 py-1 text-xs text-white font-mono text-center outline-none focus:border-amber-400" />
                        <button type="button" class="v3d-bump-btn px-1.5 py-1 bg-[#08101f] hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 cursor-pointer" data-field="x" data-delta="0.1">+0.1</button>
                        <button type="button" class="v3d-bump-btn px-2 py-1 bg-[#08101f] hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 cursor-pointer" data-field="x" data-delta="1.0">+1m</button>
                      </div>
                    </div>

                    <!-- Trim Height / Elevation Y -->
                    <div>
                      <div class="flex items-center justify-between text-xs mb-1">
                        <span class="text-slate-300 font-semibold flex items-center gap-1"><span class="text-emerald-400 font-bold">Y</span> Elevation / Trim (Green Arrow)</span>
                        <span id="v3d-lbl-y" class="font-mono text-emerald-300 font-bold text-xs">${(Number(selTf.trimHeightM) || 0).toFixed(2)} m</span>
                      </div>
                      <div class="flex items-center gap-1">
                        <button type="button" class="v3d-bump-btn px-2 py-1 bg-[#08101f] hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 cursor-pointer" data-field="trimHeightM" data-delta="-0.5">-0.5</button>
                        <button type="button" class="v3d-bump-btn px-1.5 py-1 bg-[#08101f] hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 cursor-pointer" data-field="trimHeightM" data-delta="-0.1">-0.1</button>
                        <input type="number" step="0.1" min="0" max="25" value="${(Number(selTf.trimHeightM) || 0).toFixed(2)}" data-field="trimHeightM" class="v3d-coord-input flex-1 bg-[#08101f] border border-slate-700 px-2 py-1 text-xs text-emerald-300 font-mono text-center outline-none focus:border-emerald-400" />
                        <button type="button" class="v3d-bump-btn px-1.5 py-1 bg-[#08101f] hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 cursor-pointer" data-field="trimHeightM" data-delta="0.1">+0.1</button>
                        <button type="button" class="v3d-bump-btn px-2 py-1 bg-[#08101f] hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 cursor-pointer" data-field="trimHeightM" data-delta="0.5">+0.5</button>
                      </div>
                    </div>

                    <!-- Z Position (Depth) -->
                    <div>
                      <div class="flex items-center justify-between text-xs mb-1">
                        <span class="text-slate-300 font-semibold flex items-center gap-1"><span class="text-blue-400 font-bold">Z</span> Depth (Blue Arrow)</span>
                        <span id="v3d-lbl-z" class="font-mono text-blue-300 font-bold text-xs">${(Number(selTf.z) || 0).toFixed(2)} m</span>
                      </div>
                      <div class="flex items-center gap-1">
                        <button type="button" class="v3d-bump-btn px-2 py-1 bg-[#08101f] hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 cursor-pointer" data-field="z" data-delta="-1.0">-1m</button>
                        <button type="button" class="v3d-bump-btn px-1.5 py-1 bg-[#08101f] hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 cursor-pointer" data-field="z" data-delta="-0.1">-0.1</button>
                        <input type="number" step="0.1" value="${(Number(selTf.z) || 0).toFixed(2)}" data-field="z" class="v3d-coord-input flex-1 bg-[#08101f] border border-slate-700 px-2 py-1 text-xs text-white font-mono text-center outline-none focus:border-amber-400" />
                        <button type="button" class="v3d-bump-btn px-1.5 py-1 bg-[#08101f] hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 cursor-pointer" data-field="z" data-delta="0.1">+0.1</button>
                        <button type="button" class="v3d-bump-btn px-2 py-1 bg-[#08101f] hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 cursor-pointer" data-field="z" data-delta="1.0">+1m</button>
                      </div>
                    </div>

                    <!-- Yaw Heading Rotation -->
                    <div>
                      <div class="flex items-center justify-between text-xs mb-1">
                        <span class="text-slate-300 font-semibold">Heading / Yaw (Green Ring)</span>
                        <span id="v3d-lbl-yaw" class="font-mono text-sky-300 font-bold text-xs">${Math.round(Number(selTf.rotY) || 0)}°</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <input type="range" min="-180" max="180" step="1" value="${Math.round(Number(selTf.rotY) || 0)}" data-field="rotY" class="v3d-range-input flex-1 accent-amber-400 cursor-pointer" />
                        <input type="number" step="1" min="-180" max="180" value="${Math.round(Number(selTf.rotY) || 0)}" data-field="rotY" class="v3d-coord-input w-16 bg-[#08101f] border border-slate-700 px-1.5 py-1 text-xs text-sky-300 font-mono text-center outline-none" />
                      </div>
                    </div>

                    <!-- Tilt Pitch -->
                    <div>
                      <div class="flex items-center justify-between text-xs mb-1">
                        <span class="text-slate-300 font-semibold">Down / Up Tilt (Red Ring)</span>
                        <span id="v3d-lbl-pitch" class="font-mono text-amber-300 font-bold text-xs">${Math.round(Number(selTf.rotX) || 0)}°</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <input type="range" min="-30" max="30" step="1" value="${Math.round(Number(selTf.rotX) || 0)}" data-field="rotX" class="v3d-range-input flex-1 accent-amber-400 cursor-pointer" />
                        <input type="number" step="1" min="-30" max="30" value="${Math.round(Number(selTf.rotX) || 0)}" data-field="rotX" class="v3d-coord-input w-16 bg-[#08101f] border border-slate-700 px-1.5 py-1 text-xs text-amber-300 font-mono text-center outline-none" />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- WALL SHAPE, CURVATURE (Mathematically Exact Arc) -->
                <div class="bg-[#0f192c] border border-slate-800 p-3 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-white uppercase tracking-wider">Wall Shape & Curvature</span>
                    <span class="text-[10px] font-mono text-amber-400 font-bold">${selTf.wallShape === 'l-corner' ? `90° Corner (Col ${selTf.cornerCol})` : `${Number(selTf.curveDeg) || 0}° Arc`}</span>
                  </div>

                  <div class="grid grid-cols-3 gap-1 bg-[#070d18] p-1 border border-slate-800">
                    ${[
                      { id: 'flat', label: 'Flat Wall' },
                      { id: 'curved', label: 'Curved Arc' },
                      { id: 'l-corner', label: '90° Corner' }
                    ].map((sh) => `
                      <button
                        type="button"
                        data-wall-shape="${sh.id}"
                        class="v3d-wall-shape-btn py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                          selTf.wallShape === sh.id
                            ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }"
                      >${sh.label}</button>
                    `).join('')}
                  </div>

                  ${selTf.wallShape === 'curved' ? `
                    <div class="space-y-2 pt-1">
                      <div class="flex items-center justify-between text-xs">
                        <span class="text-slate-400">Curve Angle (${Number(selTf.curveDeg) < 0 ? 'Concave Wrap' : (Number(selTf.curveDeg) > 0 ? 'Convex Arch' : 'Flat')})</span>
                        <span id="v3d-curve-val" class="font-mono font-bold text-amber-300">${Number(selTf.curveDeg) || 0}°</span>
                      </div>
                      <input
                        id="v3d-curve-slider"
                        type="range"
                        min="-90"
                        max="90"
                        step="5"
                        value="${Number(selTf.curveDeg) || 0}"
                        class="w-full accent-amber-400 cursor-pointer"
                      />
                      <div class="grid grid-cols-5 gap-1">
                        ${[-45, -20, 0, 20, 45].map((ang) => `
                          <button type="button" data-curve-preset="${ang}" class="v3d-curve-preset py-1 bg-[#070d18] hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-300 cursor-pointer">${ang > 0 ? `+${ang}°` : `${ang}°`}</button>
                        `).join('')}
                      </div>
                    </div>
                  ` : ''}

                  ${selTf.wallShape === 'l-corner' ? `
                    <div class="space-y-2 pt-1">
                      <div class="flex items-center justify-between text-xs">
                        <span class="text-slate-400">Fold After Column (1 – ${Math.max(1, selectedEntry.cols - 1)})</span>
                        <span class="font-mono font-bold text-sky-300">Col ${selTf.cornerCol}</span>
                      </div>
                      <input
                        id="v3d-corner-col"
                        type="range"
                        min="1"
                        max="${Math.max(1, selectedEntry.cols - 1)}"
                        step="1"
                        value="${Math.min(Math.max(1, Number(selTf.cornerCol) || Math.floor(selectedEntry.cols / 2)), Math.max(1, selectedEntry.cols - 1))}"
                        class="w-full accent-amber-400 cursor-pointer"
                      />
                      <div class="grid grid-cols-2 gap-1.5">
                        <button type="button" data-corner-ang="-90" class="v3d-corner-ang py-1.5 text-[11px] font-bold border cursor-pointer ${Number(selTf.cornerAngleDeg) < 0 ? 'bg-amber-400 text-slate-950 font-black' : 'bg-[#070d18] border-slate-800 text-slate-400'}">↰ Fold Forward (-90°)</button>
                        <button type="button" data-corner-ang="90" class="v3d-corner-ang py-1.5 text-[11px] font-bold border cursor-pointer ${Number(selTf.cornerAngleDeg) >= 0 ? 'bg-amber-400 text-slate-950 font-black' : 'bg-[#070d18] border-slate-800 text-slate-400'}">↱ Fold Back (+90°)</button>
                      </div>
                    </div>
                  ` : ''}
                </div>

                <!-- Mounting Mode -->
                <div class="bg-[#0f192c] border border-slate-800 p-3 space-y-2.5">
                  <span class="text-xs font-bold text-white uppercase tracking-wider block">Mounting Structure</span>
                  <div class="grid grid-cols-3 gap-1 bg-[#070d18] p-1 border border-slate-800">
                    ${[
                      { id: 'flown', label: '⛓️ Flown Truss' },
                      { id: 'ground', label: '🏗️ Ground Stack' },
                      { id: 'wall', label: '🧱 Clean Wall' }
                    ].map((mm) => `
                      <button
                        type="button"
                        data-mount-mode="${mm.id}"
                        class="v3d-mount-btn py-1.5 text-[10px] font-bold transition-all cursor-pointer ${
                          selTf.mountMode === mm.id
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'text-slate-400 hover:text-white'
                        }"
                      >${mm.label}</button>
                    `).join('')}
                  </div>
                </div>

                <!-- MODULAR STAGE DECK PLATFORM SECTION (Tab 1 Direct Access) -->
                <div class="bg-[#0f192c] border border-slate-800 p-3 space-y-2.5">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <svg class="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="14" width="20" height="8" rx="1"/><path d="M6 14V6l6-3 6 3v8"/></svg>
                      Modular Stage Platform
                    </span>
                    <span class="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-mono font-bold">
                      ${s.stageObjects.length} ${s.stageObjects.length === 1 ? 'Deck' : 'Decks'}
                    </span>
                  </div>

                  ${s.stageObjects.length > 0 ? `
                    <div class="space-y-2">
                      ${s.stageObjects.map((deck) => `
                        <div class="bg-[#070d18] border border-slate-700/80 p-2 text-xs flex items-center justify-between">
                          <div>
                            <strong class="text-white">${escapeHtml(deck.name || 'Stage Deck')}</strong>
                            <div class="text-[10px] text-slate-400 font-mono">${Number(deck.width || 8).toFixed(1)}m × ${Number(deck.depth || 4).toFixed(1)}m · H: ${Number(deck.height || 1).toFixed(1)}m</div>
                          </div>
                          <div class="flex items-center gap-1">
                            <button type="button" data-stageid="${escapeHtml(deck.id)}" class="v3d-snap-stage-btn px-2 py-1 bg-sky-500/20 text-sky-300 text-[10px] font-bold hover:bg-sky-500/30 cursor-pointer">Center</button>
                            <button type="button" data-stageid="${escapeHtml(deck.id)}" class="v3d-delete-stage-btn px-2 py-1 bg-rose-500/20 text-rose-300 text-[10px] font-bold hover:bg-rose-500/30 cursor-pointer">Remove</button>
                          </div>
                        </div>
                      `).join('')}
                      <div class="flex items-center gap-1.5 pt-1">
                        <button type="button" id="v3d-tab1-add-stage-btn" class="flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm cursor-pointer flex items-center justify-center gap-1">
                          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                          <span>+ Add Another Deck</span>
                        </button>
                        <button type="button" data-goto-tab="stage" class="v3d-switch-to-stage-tab px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 cursor-pointer">
                          More Controls →
                        </button>
                      </div>
                    </div>
                  ` : `
                    <div class="space-y-2">
                      <p class="text-xs text-slate-400">Place an aluminum framed modular stage deck directly beneath your LED screens:</p>
                      <div class="grid grid-cols-2 gap-1.5">
                        <button type="button" id="v3d-tab1-add-stage-btn" class="py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-sm cursor-pointer flex items-center justify-center gap-1">
                          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                          <span>+ Auto-Fit Deck</span>
                        </button>
                        <button type="button" id="v3d-tab1-add-stage-std-btn" class="py-2 bg-[#08101f] hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold cursor-pointer flex items-center justify-center gap-1">
                          <span>+ 8×4m Platform</span>
                        </button>
                      </div>
                    </div>
                  `}
              ` : `
                <!-- EMPTY STATE WHEN NO SCREENS IN 3D SCENE -->
                <div class="bg-[#0f192c] border border-slate-800 p-4 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <svg class="w-3.5 h-3.5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14"/><path d="M8 21h8M12 17v4"/></svg>
                      Active 3D Screen
                    </span>
                    <span class="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300">0 in 3D Scene</span>
                  </div>

                  <p class="text-xs text-slate-400 leading-relaxed">
                    No LED wall is currently placed in the 3D scene. Choose any screen from your project below to bring it into 3D space:
                  </p>

                  <div class="pt-2 border-t border-slate-800/80">
                    ${availableToAdd.length > 0 ? `
                      <div class="space-y-1.5">
                        <label class="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Add Project Screen to 3D Scene</label>
                        <div class="flex items-center gap-1.5">
                          <select id="v3d-add-screen-select" class="flex-1 bg-[#070d18] border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200 font-medium outline-none cursor-pointer focus:border-emerald-400">
                            <option value="" disabled selected>-- Choose screen to add --</option>
                            ${availableToAdd.map((m) => {
                              const calcs = (typeof calculateLayout === 'function' ? calculateLayout(m) : null) || {};
                              const wM = ((Number(calcs.screenWidthMm || 0) || 4000) / 1000).toFixed(1);
                              const hM = ((Number(calcs.screenHeightMm || 0) || 2500) / 1000).toFixed(1);
                              return `
                                <option value="${escapeHtml(m.id)}">
                                  ${escapeHtml(m.name || 'Screen')} (${wM}×${hM}m)
                                </option>
                              `;
                            }).join('')}
                          </select>
                          <button
                            type="button"
                            id="v3d-confirm-add-screen-btn"
                            class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold border border-emerald-400 shadow-sm cursor-pointer transition-all flex items-center gap-1"
                            title="Add chosen screen into 3D scene"
                          >
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    ` : `
                      <div class="text-[11px] text-slate-500 py-1">
                        No screens found in this project. Create a screen in Output Maps first.
                      </div>
                    `}
                  </div>
                </div>
              `) : ''}

              <!-- TAB 2: STAGING & RIGGING -->
              ${s.inspectorTab === 'stage' ? `
                <div class="bg-[#0f192c] border border-slate-800 p-3 space-y-3">
                  <div class="flex items-center justify-between">
                    <div>
                      <span class="text-xs font-bold text-white uppercase tracking-wider block">Modular Stage Decks</span>
                      <span class="text-[10px] text-slate-400">Aluminum framed platforms with skirting</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <button type="button" id="v3d-add-stage-btn" class="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-sm cursor-pointer">+ Auto-Fit Deck</button>
                      <button type="button" id="v3d-add-stage-std-btn" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 cursor-pointer">+ 8×4m</button>
                    </div>
                  </div>

                  <div class="space-y-2.5">
                    ${s.stageObjects.length ? s.stageObjects.map((obj) => {
                      const isSel = String(obj.id) === String(s.selectedStageObjectId);
                      return `
                        <div class="v3d-stage-card p-2.5 border ${isSel ? 'bg-amber-500/10 border-amber-500/50' : 'bg-[#08101f] border-slate-800'}" data-stageid="${escapeHtml(obj.id)}">
                          <div class="flex items-center justify-between mb-2">
                            <span class="text-xs font-bold text-white">${escapeHtml(obj.name || 'Stage Platform')}</span>
                            <div class="flex items-center gap-1.5">
                              <input type="color" value="${obj.color || '#1e293b'}" data-stageid="${escapeHtml(obj.id)}" class="v3d-stage-color w-5 h-5 bg-transparent border-0 cursor-pointer" title="Deck surface color" />
                              <button type="button" data-stageid="${escapeHtml(obj.id)}" class="v3d-delete-stage-btn px-1.5 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-bold hover:bg-rose-500/30 cursor-pointer">Delete</button>
                            </div>
                          </div>
                          <div class="grid grid-cols-3 gap-1.5 mb-2">
                            <label class="text-[10px] text-slate-400">Width (m)
                              <input type="number" step="0.5" value="${Number(obj.width || 8).toFixed(1)}" data-stageid="${escapeHtml(obj.id)}" data-field="width" class="v3d-stage-input mt-0.5 w-full bg-[#070d18] border border-slate-700 px-2 py-1 text-xs text-white font-mono" />
                            </label>
                            <label class="text-[10px] text-slate-400">Depth (m)
                              <input type="number" step="0.5" value="${Number(obj.depth || 4).toFixed(1)}" data-stageid="${escapeHtml(obj.id)}" data-field="depth" class="v3d-stage-input mt-0.5 w-full bg-[#070d18] border border-slate-700 px-2 py-1 text-xs text-white font-mono" />
                            </label>
                            <label class="text-[10px] text-slate-400">Height (m)
                              <input type="number" step="0.1" value="${Number(obj.height || 1).toFixed(1)}" data-stageid="${escapeHtml(obj.id)}" data-field="height" class="v3d-stage-input mt-0.5 w-full bg-[#070d18] border border-slate-700 px-2 py-1 text-xs text-amber-300 font-mono" />
                            </label>
                          </div>
                          <div class="grid grid-cols-2 gap-1.5 mb-2">
                            <label class="text-[10px] text-slate-400">X Position (m)
                              <input type="number" step="0.2" value="${(Number(obj.x) || 0).toFixed(1)}" data-stageid="${escapeHtml(obj.id)}" data-field="x" class="v3d-stage-input mt-0.5 w-full bg-[#070d18] border border-slate-700 px-2 py-1 text-xs text-white font-mono" />
                            </label>
                            <label class="text-[10px] text-slate-400">Z Position (m)
                              <input type="number" step="0.2" value="${(Number(obj.z) || 0).toFixed(1)}" data-stageid="${escapeHtml(obj.id)}" data-field="z" class="v3d-stage-input mt-0.5 w-full bg-[#070d18] border border-slate-700 px-2 py-1 text-xs text-white font-mono" />
                            </label>
                          </div>
                          <div class="grid grid-cols-2 gap-1.5">
                            <button type="button" data-stageid="${escapeHtml(obj.id)}" class="v3d-snap-stage-btn py-1 bg-sky-500/15 border border-sky-500/40 hover:bg-sky-500/25 text-[10px] font-bold text-sky-300 cursor-pointer">Center Below Screen</button>
                            <button type="button" data-stageid="${escapeHtml(obj.id)}" class="v3d-match-stage-btn py-1 bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-[10px] font-bold text-amber-300 cursor-pointer">Match Screen Width</button>
                          </div>
                        </div>
                      `;
                    }).join('') : `
                      <div class="text-xs text-slate-400 bg-[#08101f] border border-dashed border-slate-800 p-2.5 text-center">
                        No stage decks placed yet. Click <strong>+ Add Deck</strong> to place a modular stage platform under your screens.
                      </div>
                    `}
                  </div>
                </div>

                <div class="bg-[#0f192c] border border-slate-800 p-3 space-y-2.5">
                  <span class="text-xs font-bold text-white uppercase tracking-wider block">Rigging & Overlays</span>
                  ${[
                    { id: 'showRigging', label: '⛓️ 3D Truss Rigging & Rear Support', val: s.showRigging },
                    { id: 'showHuman', label: '👤 1.80m Human Scale Reference', val: s.showHuman },
                    { id: 'showDimensions', label: '📐 Screen & Trim Height Dimensions', val: s.showDimensions },
                    { id: 'showReflection', label: '✨ Stage Surface Gloss Reflection', val: s.showReflection },
                    { id: 'showLabels', label: '🏷️ Screen Spec Floating Badges', val: s.showLabels }
                  ].map((opt) => `
                    <label class="flex items-center justify-between text-xs text-slate-300 bg-[#08101f] border border-slate-800/80 px-3 py-2 cursor-pointer">
                      <span>${opt.label}</span>
                      <input type="checkbox" data-scene-flag="${opt.id}" ${opt.val ? 'checked' : ''} class="v3d-scene-flag w-4 h-4 accent-amber-400 cursor-pointer" />
                    </label>
                  `).join('')}
                </div>
              ` : ''}

              <!-- TAB 3: SCENE & ENVIRONMENT -->
              ${s.inspectorTab === 'scene' ? `
                <div class="bg-[#0f192c] border border-slate-800 p-3 space-y-3">
                  <span class="text-xs font-bold text-white uppercase tracking-wider block">Environment Theme</span>
                  <div class="grid grid-cols-2 gap-1.5">
                    ${[
                      { name: 'Dark Stage', top: '#060a12', bot: '#0d1527', min: '#1e293b', maj: '#334155' },
                      { name: 'Studio Slate', top: '#0f172a', bot: '#1e293b', min: '#334155', maj: '#475569' },
                      { name: 'CAD Blueprint', top: '#041427', bot: '#092342', min: '#0d3b66', maj: '#1d5e99' },
                      { name: 'Pitch Black', top: '#000000', bot: '#05070a', min: '#111827', maj: '#1f2937' }
                    ].map((th) => `
                      <button
                        type="button"
                        data-theme-top="${th.top}"
                        data-theme-bot="${th.bot}"
                        data-theme-min="${th.min}"
                        data-theme-maj="${th.maj}"
                        class="v3d-theme-btn p-2 border border-slate-800 hover:border-amber-400 text-left bg-[#08101f] cursor-pointer"
                      >
                        <div class="h-4 w-full mb-1.5 border border-slate-700/60" style="background: linear-gradient(180deg, ${th.top}, ${th.bot});"></div>
                        <span class="text-[11px] font-bold text-slate-200 block">${th.name}</span>
                      </button>
                    `).join('')}
                  </div>
                </div>

                <div class="bg-[#0f192c] border border-slate-800 p-3 space-y-2.5">
                  <span class="text-xs font-bold text-white uppercase tracking-wider block">Floor Grid</span>
                  <label class="flex items-center justify-between text-xs text-slate-300 bg-[#08101f] border border-slate-800/80 px-3 py-2 cursor-pointer">
                    <span>Show Ground Grid</span>
                    <input type="checkbox" id="v3d-toggle-grid" ${s.showGrid ? 'checked' : ''} class="w-4 h-4 accent-amber-400 cursor-pointer" />
                  </label>
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-slate-400">Grid Spacing</span>
                    <div class="flex items-center gap-1">
                      ${[0.5, 1.0, 2.0].map((sz) => `
                        <button type="button" data-grid-size="${sz}" class="v3d-grid-size-btn px-2 py-1 text-xs font-mono border cursor-pointer ${Number(s.gridSizeM) === sz ? 'bg-amber-400 text-slate-950 font-black' : 'bg-[#08101f] border-slate-800 text-slate-400'}">${sz}m</button>
                      `).join('')}
                    </div>
                  </div>
                </div>
              ` : ''}

            </div>
          </aside>
        </div>
      </div>
    `;

    // ──────────────────────────────────────────────────────────────────────────
    // 4. THREE.JS & 3D TRANSFORM GIZMO INITIALIZATION
    // ──────────────────────────────────────────────────────────────────────────
    const canvas = document.getElementById('view3d-canvas');
    if (!canvas) return;

    if (typeof window.THREE === 'undefined') {
      console.error('Three.js is not loaded.');
      return;
    }
    const THREE = window.THREE;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });

    // Query unmasked GPU device info from WebGL (detect dedicated NVIDIA RTX)
    try {
      const gl = renderer.getContext();
      const dbg = gl ? gl.getExtension('WEBGL_debug_renderer_info') : null;
      if (dbg) {
        const rawRenderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '';
        let detectedGpu = 'NVIDIA Dedicated GPU';
        const mAngle = rawRenderer.match(/ANGLE \([^,]+,\s*([^,]+?)(?:\s+\(0x|\s+Direct3D|\s*,|\))/i);
        if (mAngle && mAngle[1]) {
          detectedGpu = mAngle[1].trim();
        } else if (rawRenderer.includes('GeForce') || rawRenderer.includes('NVIDIA') || rawRenderer.includes('RTX') || rawRenderer.includes('GTX')) {
          const m = rawRenderer.match(/(?:NVIDIA\s+)?(?:GeForce\s+)?(?:RTX|GTX|Quadro)\s+[A-Za-z0-9\s]+/i);
          if (m) detectedGpu = m[0].trim();
        }
        const gpuNameEl = container.querySelector('#v3d-gpu-name');
        if (gpuNameEl && detectedGpu) {
          gpuNameEl.textContent = detectedGpu;
        }
      }
    } catch (_) {}
    // Force high-DPI supersampling (2x resolution) for pin-sharp render quality when zoomed out
    renderer.setPixelRatio(Math.max(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(s.backgroundTopColor);
    scene.fog = new THREE.FogExp2(s.backgroundTopColor, 0.012);

    // Optimized near/far clipping for sharp depth buffer precision (eliminates Z-fighting when zoomed out)
    const camera = new THREE.PerspectiveCamera(45, 1, 0.3, 400);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight1.position.set(12, 22, 16);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x94b3e8, 0.45);
    dirLight2.position.set(-14, 12, -12);
    scene.add(dirLight2);

    // Solid Stage Floor Ground Plane (prevents moiré / flickering at distance)
    const floorGeo = new THREE.PlaneGeometry(160, 160);
    const floorMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(s.backgroundTopColor || '#060a12'),
      roughness: 0.85,
      metalness: 0.1
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.002;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Ground Grid Helper with transparency and depthWrite=false to prevent aliasing when zoomed out
    let gridHelper = null;
    const updateGrid = () => {
      if (gridHelper) scene.remove(gridHelper);
      if (!s.showGrid) return;
      const size = 60;
      const divisions = Math.round(size / Math.max(0.5, Number(s.gridSizeM) || 1));
      gridHelper = new THREE.GridHelper(size, divisions, new THREE.Color(s.gridMajorColor), new THREE.Color(s.gridMinorColor));
      gridHelper.position.y = 0.001;
      gridHelper.material.transparent = true;
      gridHelper.material.opacity = 0.6;
      gridHelper.material.depthWrite = false;
      scene.add(gridHelper);
    };
    updateGrid();

    // ──────────────────────────────────────────────────────────────────────────
    // 5. TEXTURE GENERATION FOR SCREENS
    // ──────────────────────────────────────────────────────────────────────────
    const buildScreenTexture = (entry) => {
      const texCanvas = document.createElement('canvas');
      if (s.surfaceMode === 'pattern') {
        const fixedScale = Math.max(0.2, Math.min(1.0, 2048 / Math.max(1, entry.resW)));
        if (typeof drawVisualizerCanvas === 'function') {
          drawVisualizerCanvas(texCanvas, entry.map, { fixedScale, suppressDetails: false });
        }
      } else {
        const cabPx = Math.max(48, Math.min(96, Math.floor(1920 / Math.max(entry.cols, entry.rows))));
        texCanvas.width = entry.cols * cabPx;
        texCanvas.height = entry.rows * cabPx;
        const tctx = texCanvas.getContext('2d');
        tctx.fillStyle = '#070e1b';
        tctx.fillRect(0, 0, texCanvas.width, texCanvas.height);

        for (let c = 0; c < entry.cols; c++) {
          for (let r = 0; r < entry.rows; r++) {
            const x = c * cabPx;
            const y = r * cabPx;
            tctx.fillStyle = '#0c1628';
            tctx.fillRect(x + 2, y + 2, cabPx - 4, cabPx - 4);
            tctx.strokeStyle = '#38bdf8';
            tctx.lineWidth = 1.2;
            tctx.strokeRect(x + 2, y + 2, cabPx - 4, cabPx - 4);
            tctx.fillStyle = '#94a3b8';
            tctx.font = `bold ${Math.max(9, Math.round(cabPx * 0.16))}px monospace`;
            tctx.fillText(`${c + 1},${r + 1}`, x + 5, y + 14);
          }
        }
      }

      const tex = new THREE.CanvasTexture(texCanvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return tex;
    };

    // ──────────────────────────────────────────────────────────────────────────
    // 6. RIGGING, STAGING & HUMAN SCALE GENERATORS
    // ──────────────────────────────────────────────────────────────────────────
    const createBoxTrussMesh = (length) => {
      const trussGroup = new THREE.Group();
      const chordRadius = 0.024;
      const trussW = 0.29;
      const trussH = 0.29;
      const chordMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.82, roughness: 0.28 });
      const braceMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.75, roughness: 0.35 });

      const chordGeo = new THREE.CylinderGeometry(chordRadius, chordRadius, length, 10);
      chordGeo.rotateZ(Math.PI / 2);

      [
        [0, trussH / 2, trussW / 2],
        [0, trussH / 2, -trussW / 2],
        [0, -trussH / 2, trussW / 2],
        [0, -trussH / 2, -trussW / 2]
      ].forEach(([x, y, z]) => {
        const chord = new THREE.Mesh(chordGeo, chordMat);
        chord.position.set(x, y, z);
        trussGroup.add(chord);
      });

      const numBays = Math.max(1, Math.round(length / 0.5));
      const bayLen = length / numBays;
      const braceRadius = 0.009;

      for (let i = 0; i < numBays; i++) {
        const xStart = -length / 2 + i * bayLen;
        const xEnd = xStart + bayLen;

        const addBrace = (p1, p2) => {
          const v1 = new THREE.Vector3(...p1);
          const v2 = new THREE.Vector3(...p2);
          const dist = v1.distanceTo(v2);
          const bGeo = new THREE.CylinderGeometry(braceRadius, braceRadius, dist, 6);
          const bMesh = new THREE.Mesh(bGeo, braceMat);
          const mid = v1.clone().add(v2).multiplyScalar(0.5);
          bMesh.position.copy(mid);
          bMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v2.clone().sub(v1).normalize());
          trussGroup.add(bMesh);
        };

        addBrace([xStart, -trussH / 2, trussW / 2], [xEnd, trussH / 2, trussW / 2]);
        addBrace([xStart, trussH / 2, trussW / 2], [xEnd, trussH / 2, -trussW / 2]);
        addBrace([xStart, trussH / 2, -trussW / 2], [xEnd, -trussH / 2, -trussW / 2]);
        addBrace([xStart, -trussH / 2, -trussW / 2], [xEnd, -trussH / 2, trussW / 2]);
      }

      return trussGroup;
    };

    const createHoistMesh = () => {
      const hoistGroup = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.6 });
      const accentMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.5 });
      const chainMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3, metalness: 0.85 });

      const bodyGeo = new THREE.BoxGeometry(0.32, 0.22, 0.22);
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      hoistGroup.add(bodyMesh);

      const capGeo = new THREE.BoxGeometry(0.04, 0.2, 0.2);
      const capL = new THREE.Mesh(capGeo, accentMat);
      capL.position.x = -0.17;
      hoistGroup.add(capL);
      const capR = new THREE.Mesh(capGeo, accentMat);
      capR.position.x = 0.17;
      hoistGroup.add(capR);

      const bagGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.28, 10);
      const bagMesh = new THREE.Mesh(bagGeo, bodyMat);
      bagMesh.position.set(0, -0.22, 0);
      hoistGroup.add(bagMesh);

      const chainGeo = new THREE.CylinderGeometry(0.008, 0.008, 8, 6);
      const chainMesh = new THREE.Mesh(chainGeo, chainMat);
      chainMesh.position.set(0, 4.1, 0);
      hoistGroup.add(chainMesh);

      return hoistGroup;
    };

    const createGroundSupportMesh = (wallH, trimH) => {
      const gsGroup = new THREE.Group();
      const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.3 });
      const mastMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.28 });

      const totalH = wallH + trimH;
      const mastZ = -0.16; // Strictly BEHIND LED rear face!

      const baseGeo = new THREE.BoxGeometry(0.24, 0.05, 1.4);
      const baseMesh = new THREE.Mesh(baseGeo, steelMat);
      baseMesh.position.set(0, 0.025, mastZ - 0.55);
      gsGroup.add(baseMesh);

      const mastGeo = new THREE.CylinderGeometry(0.022, 0.022, totalH, 8);
      const leftCol = new THREE.Mesh(mastGeo, mastMat);
      leftCol.position.set(-0.1, totalH / 2, mastZ);
      gsGroup.add(leftCol);

      const rightCol = new THREE.Mesh(mastGeo, mastMat);
      rightCol.position.set(0.1, totalH / 2, mastZ);
      gsGroup.add(rightCol);

      const footZ = mastZ - 1.15;
      const braceTopY = totalH * 0.72;
      const braceLen = Math.hypot(braceTopY, 1.15);
      const braceGeo = new THREE.CylinderGeometry(0.018, 0.018, braceLen, 8);
      const braceMesh = new THREE.Mesh(braceGeo, steelMat);
      braceMesh.position.set(0, braceTopY / 2, (mastZ + footZ) / 2);
      braceMesh.rotation.x = -Math.atan2(1.15, braceTopY);
      gsGroup.add(braceMesh);

      return gsGroup;
    };

    const createStageDeckMesh = (obj) => {
      const deckGroup = new THREE.Group();
      const w = Math.max(0.5, Number(obj.width) || 8);
      const d = Math.max(0.5, Number(obj.depth) || 4);
      const h = Math.max(0.1, Number(obj.height) || 1.0);
      const col = obj.color || '#1e293b';

      const topMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(col), roughness: 0.65, metalness: 0.1 });
      const alumMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.25 });
      const skirtMat = new THREE.MeshStandardMaterial({ color: 0x0a0e17, roughness: 0.95, metalness: 0.05 });

      const topGeo = new THREE.BoxGeometry(w, 0.04, d);
      const topMesh = new THREE.Mesh(topGeo, topMat);
      topMesh.position.set(0, h - 0.02, 0);
      deckGroup.add(topMesh);

      const frameHeight = 0.09;
      const fbGeo = new THREE.BoxGeometry(w, frameHeight, 0.03);
      const frontFrame = new THREE.Mesh(fbGeo, alumMat);
      frontFrame.position.set(0, h - frameHeight / 2, d / 2 - 0.015);
      deckGroup.add(frontFrame);

      const backFrame = new THREE.Mesh(fbGeo, alumMat);
      backFrame.position.set(0, h - frameHeight / 2, -d / 2 + 0.015);
      deckGroup.add(backFrame);

      const lrGeo = new THREE.BoxGeometry(0.03, frameHeight, d - 0.06);
      const leftFrame = new THREE.Mesh(lrGeo, alumMat);
      leftFrame.position.set(-w / 2 + 0.015, h - frameHeight / 2, 0);
      deckGroup.add(leftFrame);

      const rightFrame = new THREE.Mesh(lrGeo, alumMat);
      rightFrame.position.set(w / 2 - 0.015, h - frameHeight / 2, 0);
      deckGroup.add(rightFrame);

      const legH = h - frameHeight;
      if (legH > 0.05) {
        const legGeo = new THREE.CylinderGeometry(0.032, 0.032, legH, 12);
        const footGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.015, 12);

        [[-w / 2 + 0.12, -d / 2 + 0.12], [w / 2 - 0.12, -d / 2 + 0.12], [-w / 2 + 0.12, d / 2 - 0.12], [w / 2 - 0.12, d / 2 - 0.12]].forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(legGeo, alumMat);
          leg.position.set(lx, legH / 2, lz);
          deckGroup.add(leg);
          const foot = new THREE.Mesh(footGeo, alumMat);
          foot.position.set(lx, 0.008, lz);
          deckGroup.add(foot);
        });

        const skirtGeo = new THREE.PlaneGeometry(w, legH);
        const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
        skirtMesh.position.set(0, legH / 2, d / 2 + 0.005);
        deckGroup.add(skirtMesh);
      }

      deckGroup.position.set(Number(obj.x) || 0, 0, Number(obj.z) || 0);
      return deckGroup;
    };

    const createHumanFigureMesh = () => {
      const figure = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.3, roughness: 0.6, transparent: true, opacity: 0.85 });

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), mat);
      head.position.y = 1.70;
      figure.add(head);

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.60, 0.18), mat);
      torso.position.y = 1.25;
      figure.add(torso);

      const legGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.88, 10);
      const legL = new THREE.Mesh(legGeo, mat);
      legL.position.set(-0.11, 0.44, 0);
      figure.add(legL);
      const legR = new THREE.Mesh(legGeo, mat);
      legR.position.set(0.11, 0.44, 0);
      figure.add(legR);

      return figure;
    };

    // ──────────────────────────────────────────────────────────────────────────
    // 7. ASSEMBLE 3D SCENE & MATHEMATICALLY EXACT CURVED WALL GEOMETRY
    // ──────────────────────────────────────────────────────────────────────────
    const screenMeshesGroup = new THREE.Group();
    scene.add(screenMeshesGroup);

    const riggingGroup = new THREE.Group();
    scene.add(riggingGroup);

    const stagingGroup = new THREE.Group();
    scene.add(stagingGroup);

    const dimensionGroup = new THREE.Group();
    scene.add(dimensionGroup);

    s.stageObjects.forEach((obj) => stagingGroup.add(createStageDeckMesh(obj)));

    const screenClickTargets = [];
    const panelDepth = 0.08;
    let selectedWallGroup = null;

    mapRenderData.forEach((entry) => {
      const { widthM, heightM, cols, rows, transform: tf, id } = entry;
      const isSelected = String(id) === String(s.selectedMapId);
      const texture = buildScreenTexture(entry);

      const screenWallGroup = new THREE.Group();
      screenWallGroup.userData = { mapId: id };

      const colW = widthM / cols;
      const shape = tf.wallShape || 'flat';
      const curveDeg = shape === 'curved' ? (Number(tf.curveDeg) || 0) : 0;
      const cornerCol = Math.max(1, Math.min(cols - 1, Number(tf.cornerCol) || Math.floor(cols / 2)));
      const cornerAngleDeg = Number(tf.cornerAngleDeg) || 90;

      const chassisMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0x1e293b : 0x0f172a,
        metalness: 0.8,
        roughness: 0.35
      });

      const frontMat = new THREE.MeshStandardMaterial({
        map: texture,
        emissive: new THREE.Color(0xffffff),
        emissiveMap: texture,
        emissiveIntensity: 0.92,
        roughness: 0.45,
        metalness: 0.05,
        depthWrite: true,
        depthTest: true
      });

      // EXACT CURVED GEOMETRY (Seamless, Zero Gaps, Correct Normal Facing)
      const isCurved = shape === 'curved' && Math.abs(curveDeg) >= 1;
      const absCurveRad = THREE.MathUtils.degToRad(Math.abs(curveDeg));
      const radius = widthM / absCurveRad;
      const angleStep = absCurveRad / cols;

      for (let c = 0; c < cols; c++) {
        const colGroup = new THREE.Group();
        const u0 = c / cols;
        const u1 = (c + 1) / cols;

        const frontGeo = new THREE.PlaneGeometry(colW, heightM);
        const uvs = frontGeo.attributes.uv;
        uvs.setXY(0, u0, 1);
        uvs.setXY(1, u1, 1);
        uvs.setXY(2, u0, 0);
        uvs.setXY(3, u1, 0);
        uvs.needsUpdate = true;

        const frontMesh = new THREE.Mesh(frontGeo, frontMat);
        frontMesh.position.z = panelDepth / 2 + 0.001;
        colGroup.add(frontMesh);
        screenClickTargets.push(frontMesh);
        frontMesh.userData = { mapId: id };

        const chassisGeo = new THREE.BoxGeometry(colW, heightM, panelDepth);
        const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
        colGroup.add(chassisMesh);

        if (isSelected) {
          const edgeGeo = new THREE.EdgesGeometry(chassisGeo);
          const edgeMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
          const outline = new THREE.LineSegments(edgeGeo, edgeMat);
          colGroup.add(outline);
        }

        if (isCurved) {
          const k = c - (cols - 1) / 2;
          const alpha = k * angleStep;

          colGroup.position.x = radius * Math.sin(alpha);
          colGroup.position.z = (curveDeg < 0 ? 1 : -1) * radius * (1 - Math.cos(alpha));
          colGroup.rotation.y = (curveDeg < 0 ? -1 : 1) * alpha;
        } else if (shape === 'l-corner' && c >= cornerCol) {
          const foldRad = THREE.MathUtils.degToRad(cornerAngleDeg);
          const pivotX = (cornerCol - cols / 2) * colW;
          const offsetAlongWing = (c - cornerCol + 0.5) * colW;

          colGroup.position.x = pivotX + Math.cos(foldRad) * offsetAlongWing;
          colGroup.position.z = Math.sin(foldRad) * offsetAlongWing;
          colGroup.rotation.y = -foldRad;
        } else {
          colGroup.position.x = (c - (cols - 1) / 2) * colW;
          colGroup.position.z = 0;
        }

        screenWallGroup.add(colGroup);
      }

      const posX = Number(tf.x) || 0;
      const trimH = Number(tf.trimHeightM) || 1.0;
      const posY = trimH + heightM / 2 + (Number(tf.y) || 0);
      const posZ = Number(tf.z) || 0;
      const rotYRad = THREE.MathUtils.degToRad(Number(tf.rotY) || 0);
      const rotXRad = THREE.MathUtils.degToRad(Number(tf.rotX) || 0);

      screenWallGroup.position.set(posX, posY, posZ);
      screenWallGroup.rotation.y = rotYRad;
      screenWallGroup.rotation.x = rotXRad;
      screenWallGroup.scale.setScalar(Number(tf.scale) || 1);

      screenMeshesGroup.add(screenWallGroup);

      if (isSelected) {
        selectedWallGroup = screenWallGroup;
      }

      // Build Rigging & Ground Support
      if (s.showRigging) {
        const mount = tf.mountMode || 'flown';
        if (mount === 'flown') {
          const trussMesh = createBoxTrussMesh(widthM + 0.6);
          trussMesh.position.set(posX, posY + heightM / 2 + 0.42, posZ);
          trussMesh.rotation.y = rotYRad;
          trussMesh.rotation.x = rotXRad;
          riggingGroup.add(trussMesh);

          const numHoists = Math.max(2, Math.round(widthM / 4));
          for (let h = 0; h < numHoists; h++) {
            const hoistX = -widthM / 2 + 0.5 + h * ((widthM - 1.0) / Math.max(1, numHoists - 1));
            const hoist = createHoistMesh();
            hoist.position.set(posX + hoistX * Math.cos(rotYRad), posY + heightM / 2 + 0.72, posZ - hoistX * Math.sin(rotYRad));
            riggingGroup.add(hoist);
          }
        } else if (mount === 'ground') {
          const numMasts = Math.max(2, Math.round(widthM / 2));
          for (let mIdx = 0; mIdx < numMasts; mIdx++) {
            const mastX = -widthM / 2 + 0.4 + mIdx * ((widthM - 0.8) / Math.max(1, numMasts - 1));
            const gs = createGroundSupportMesh(heightM, trimH);
            gs.position.set(posX + mastX * Math.cos(rotYRad), 0, posZ - mastX * Math.sin(rotYRad));
            gs.rotation.y = rotYRad;
            riggingGroup.add(gs);
          }
        }
      }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 8. 3D VISUAL GAP DIMENSION LINE & FLOATING BADGE IN VIEWPORT
    // ──────────────────────────────────────────────────────────────────────────
    const updateDimensionLineIn3D = (gapInfo) => {
      while (dimensionGroup.children.length > 0) {
        const child = dimensionGroup.children[0];
        dimensionGroup.remove(child);
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      }

      if (!gapInfo || !s.showDimensions) return;

      const p1 = gapInfo.edgePointSource;
      const p2 = gapInfo.edgePointTarget;
      const isSnap = Math.abs(gapInfo.gapX) <= 0.02;
      const lineColor = isSnap ? 0x10b981 : 0xf59e0b;

      // 3D Dimension Line with Perpendicular End Ticks
      const points = [
        new THREE.Vector3(p1.x, p1.y, p1.z),
        new THREE.Vector3(p2.x, p2.y, p2.z),
        // Source Edge Tick
        new THREE.Vector3(p1.x, p1.y - 0.25, p1.z),
        new THREE.Vector3(p1.x, p1.y + 0.25, p1.z),
        // Target Edge Tick
        new THREE.Vector3(p2.x, p2.y - 0.25, p2.z),
        new THREE.Vector3(p2.x, p2.y + 0.25, p2.z)
      ];

      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: lineColor,
        linewidth: 3,
        depthTest: false
      });
      const lineSegments = new THREE.LineSegments(lineGeo, lineMat);
      lineSegments.renderOrder = 999;
      dimensionGroup.add(lineSegments);

      // Floating 3D Text Badge Sprite above the gap
      const badgeCanvas = document.createElement('canvas');
      badgeCanvas.width = 300;
      badgeCanvas.height = 70;
      const bctx = badgeCanvas.getContext('2d');
      bctx.fillStyle = isSnap ? 'rgba(16, 185, 129, 0.95)' : 'rgba(15, 23, 42, 0.92)';
      bctx.strokeStyle = isSnap ? '#34d399' : '#f59e0b';
      bctx.lineWidth = 4;
      bctx.fillRect(4, 4, 292, 62);
      bctx.strokeRect(4, 4, 292, 62);

      bctx.fillStyle = '#ffffff';
      bctx.font = 'bold 24px monospace';
      bctx.textAlign = 'center';
      bctx.textBaseline = 'middle';

      const labelText = isSnap
        ? 'FLUSH: 0.00 m'
        : (gapInfo.gapX > 0 ? `GAP: ${gapInfo.gapX.toFixed(2)} m` : `OVERLAP: ${Math.abs(gapInfo.gapX).toFixed(2)} m`);
      bctx.fillText(labelText, 150, 35);

      const badgeTex = new THREE.CanvasTexture(badgeCanvas);
      const spriteMat = new THREE.SpriteMaterial({ map: badgeTex, depthTest: false });
      const badgeSprite = new THREE.Sprite(spriteMat);
      badgeSprite.scale.set(1.4, 0.35, 1);
      badgeSprite.position.set((p1.x + p2.x) / 2, Math.max(p1.y, p2.y) + 0.45, (p1.z + p2.z) / 2);
      badgeSprite.renderOrder = 1000;
      dimensionGroup.add(badgeSprite);
    };

    updateDimensionLineIn3D(nearestInfo);

    // Human Reference
    if (s.showHuman) {
      const human = createHumanFigureMesh();
      const firstWall = mapRenderData[0];
      const humanX = firstWall ? (Number(firstWall.transform.x) || 0) - firstWall.widthM / 2 - 1.2 : -4;
      const humanZ = firstWall ? (Number(firstWall.transform.z) || 0) + 1.2 : 1;
      human.position.set(humanX, 0, humanZ);
      scene.add(human);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 9. 3D TRANSFORM GIZMO & MAGNETIC SNAPPING
    // ──────────────────────────────────────────────────────────────────────────
    let transformControls = null;
    let isGizmoDragging = false;
    let controls = null;

    if (typeof THREE.TransformControls !== 'undefined') {
      transformControls = new THREE.TransformControls(camera, renderer.domElement);
      transformControls.size = 0.95;
      transformControls.setSpace(s.gizmoSpace || 'world');

      scene.add(transformControls.getHelper ? transformControls.getHelper() : transformControls);

      if (selectedWallGroup && ['translate', 'rotate', 'scale'].includes(s.toolMode)) {
        transformControls.setMode(s.toolMode);
        transformControls.attach(selectedWallGroup);
      } else {
        transformControls.detach();
      }

      transformControls.addEventListener('dragging-changed', (event) => {
        isGizmoDragging = event.value;
        if (controls) controls.enabled = !event.value;
        if (!event.value) {
          pushHistory();
          persistProjects();
          renderView3DPro(container, activeMap, activeProject, helpers);
        }
      });

      // Synchronize live 3D transformation with Inspector controls + MAGNETIC AUTO-SNAP
      transformControls.addEventListener('objectChange', () => {
        if (!selectedEntry || !selectedWallGroup) return;
        const tf = selectedEntry.transform;

        // Current proposed position from gizmo
        let curX = selectedWallGroup.position.x;
        let curZ = selectedWallGroup.position.z;
        const wallH = selectedEntry.heightM;
        let curTrimH = Math.max(0, selectedWallGroup.position.y - wallH / 2);

        // MAGNETIC AUTO-SNAP TO NEAREST WALL (if enabled)
        if (s.mapAutoSnap && mapRenderData.length >= 2) {
          const snapRange = Math.max(0.05, Number(s.mapAutoSnapRange) || 0.30);
          const snapGap = Math.max(0, Number(s.mapSnapGap) || 0.0);
          const sW = selectedEntry.widthM * (Number(tf.scale) || 1);

          mapRenderData.forEach((other) => {
            if (other.id === selectedEntry.id) return;
            const oTf = other.transform;
            const oW = other.widthM * (Number(oTf.scale) || 1);
            const oX = Number(oTf.x) || 0;
            const oZ = Number(oTf.z) || 0;
            const oTrimH = Number(oTf.trimHeightM) || 1.0;

            // Snap Left Edge of Target (source to the left)
            const targetLeftEdgeX = oX - oW / 2 - sW / 2 - snapGap;
            if (Math.abs(curX - targetLeftEdgeX) <= snapRange) {
              curX = targetLeftEdgeX;
              selectedWallGroup.position.x = curX;
            }

            // Snap Right Edge of Target (source to the right)
            const targetRightEdgeX = oX + oW / 2 + sW / 2 + snapGap;
            if (Math.abs(curX - targetRightEdgeX) <= snapRange) {
              curX = targetRightEdgeX;
              selectedWallGroup.position.x = curX;
            }

            // Snap Trim Height (Align Bottom)
            if (Math.abs(curTrimH - oTrimH) <= 0.15) {
              curTrimH = oTrimH;
              selectedWallGroup.position.y = curTrimH + wallH / 2;
            }

            // Snap Depth (Coplanar Z)
            if (Math.abs(curZ - oZ) <= 0.15) {
              curZ = oZ;
              selectedWallGroup.position.z = curZ;
            }
          });
        }

        tf.x = curX;
        tf.z = curZ;
        tf.trimHeightM = curTrimH;
        tf.rotY = THREE.MathUtils.radToDeg(selectedWallGroup.rotation.y);
        tf.rotX = THREE.MathUtils.radToDeg(selectedWallGroup.rotation.x);
        tf.scale = selectedWallGroup.scale.x;

        // Update Inspector input elements live
        const xIn = container.querySelector('input[data-field="x"]');
        if (xIn) xIn.value = tf.x.toFixed(2);
        const yIn = container.querySelector('input[data-field="trimHeightM"]');
        if (yIn) yIn.value = tf.trimHeightM.toFixed(2);
        const zIn = container.querySelector('input[data-field="z"]');
        if (zIn) zIn.value = tf.z.toFixed(2);
        const yawIn = container.querySelector('input[data-field="rotY"]');
        if (yawIn) yawIn.value = Math.round(tf.rotY);
        const pitchIn = container.querySelector('input[data-field="rotX"]');
        if (pitchIn) pitchIn.value = Math.round(tf.rotX);

        // Update live labels
        const lblX = container.querySelector('#v3d-lbl-x');
        if (lblX) lblX.textContent = `${tf.x.toFixed(2)} m`;
        const lblY = container.querySelector('#v3d-lbl-y');
        if (lblY) lblY.textContent = `${tf.trimHeightM.toFixed(2)} m`;
        const lblZ = container.querySelector('#v3d-lbl-z');
        if (lblZ) lblZ.textContent = `${tf.z.toFixed(2)} m`;
        const lblYaw = container.querySelector('#v3d-lbl-yaw');
        if (lblYaw) lblYaw.textContent = `${Math.round(tf.rotY)}°`;
        const lblPitch = container.querySelector('#v3d-lbl-pitch');
        if (lblPitch) lblPitch.textContent = `${Math.round(tf.rotX)}°`;

        // Update Live Gap Calculation & 3D Dimension Line
        const liveGap = getNearestScreenGap(selectedEntry);
        if (liveGap) {
          updateDimensionLineIn3D(liveGap);
          const gapValEl = container.querySelector('#v3d-live-gap-val');
          if (gapValEl) {
            gapValEl.textContent = Math.abs(liveGap.gapX) <= 0.02
              ? '0.00 m (Flush Seam)'
              : (liveGap.gapX > 0 ? `${liveGap.gapX.toFixed(2)} m (Gap)` : `${Math.abs(liveGap.gapX).toFixed(2)} m (Overlap)`);
            gapValEl.className = `text-xs font-mono font-black ${Math.abs(liveGap.gapX) <= 0.02 ? 'text-emerald-300' : 'text-amber-300'}`;
          }
        }

        requestRender();
      });

      transformControls.addEventListener('change', () => {
        requestRender();
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 10. ORBITCONTROLS, CAMERA PRESETS & ON-DEMAND RENDERING
    // ──────────────────────────────────────────────────────────────────────────
    let renderRequested = true;
    let rafId = null;

    function requestRender() {
      renderRequested = true;
    }

    const renderLoop = () => {
      let needsRender = renderRequested;
      if (controls) {
        const updated = controls.update();
        if (updated) needsRender = true;
      }

      if (needsRender) {
        renderer.render(scene, camera);
        renderRequested = false;

        if (controls) {
          s.camPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
          s.camTarget = { x: controls.target.x, y: controls.target.y, z: controls.target.z };
          s.camUp = { x: camera.up.x, y: camera.up.y, z: camera.up.z };
        }

        const statsEl = document.getElementById('v3d-hud-stats');
        if (statsEl && controls) {
          const camDist = camera.position.distanceTo(controls.target);
          statsEl.textContent = `View: ${(s.cameraPreset || '3D').toUpperCase()} | Dist: ${camDist.toFixed(1)}m | Target: (${controls.target.x.toFixed(1)}, ${controls.target.y.toFixed(1)}, ${controls.target.z.toFixed(1)})`;
        }
      }
      rafId = requestAnimationFrame(renderLoop);
    };
    rafId = requestAnimationFrame(renderLoop);

    const fitCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      requestRender();
    };
    fitCanvas();
    window.addEventListener('resize', fitCanvas);

    const getActiveCenter = () => {
      const ref = selectedEntry || mapRenderData[0];
      if (!ref) return new THREE.Vector3(0, 1.8, 0);
      const tf = ref.transform;
      const cy = (Number(tf.trimHeightM) || 1.0) + ref.heightM / 2;
      const cx = Number(tf.x) || 0;
      const cz = Number(tf.z) || 0;
      return new THREE.Vector3(cx, cy, cz);
    };

    const OrbitControlsClass = THREE.OrbitControls || (typeof window !== 'undefined' ? window.OrbitControls : null);
    if (typeof OrbitControlsClass === 'function') {
      controls = new OrbitControlsClass(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.screenSpacePanning = true; // Crucial: pan along camera viewport X/Y
      controls.minDistance = 0.5;
      controls.maxDistance = 180.0;
      controls.maxPolarAngle = Math.PI - 0.005;
      controls.minPolarAngle = 0.005;

      controls.mouseButtons = {
        LEFT: s.toolMode === 'pan' ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
      };

      controls.addEventListener('change', () => {
        requestRender();
      });
    }

    // Instant 0ms tool mode switcher (avoids tearing down WebGL or re-rendering scene)
    const setToolMode = (mode) => {
      if (!['select', 'translate', 'rotate', 'scale', 'orbit', 'pan'].includes(mode)) return;
      s.toolMode = mode;

      if (transformControls) {
        if (['translate', 'rotate', 'scale'].includes(mode)) {
          if (selectedWallGroup) {
            transformControls.setMode(mode);
            transformControls.attach(selectedWallGroup);
            transformControls.visible = true;
          }
        } else {
          transformControls.detach();
          transformControls.visible = false;
        }
      }

      if (controls) {
        if (mode === 'pan') {
          controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
        } else {
          controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
        }
      }

      // Update toolbar buttons visually in 0ms (no DOM re-creation)
      container.querySelectorAll('.v3d-tool-btn').forEach((btn) => {
        const isCurrent = btn.getAttribute('data-tool') === mode;
        btn.className = `v3d-tool-btn px-2.5 py-1 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
          isCurrent
            ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`;
      });

      if (typeof persistProjects === 'function') persistProjects();
      requestRender();
    };

    const setCameraView = (view) => {
      const target = getActiveCenter();
      const refEntry = selectedEntry || mapRenderData[0];
      const refDim = refEntry ? Math.max(refEntry.widthM, refEntry.heightM) : 6;
      const frameDist = Math.max(5, Math.min(50, refDim * 1.85));

      if (controls) {
        controls.target.copy(target);
      }

      if (view === 'front') {
        // FRONT: Looking straight at the LED wall front face (+Z towards -Z)
        camera.position.set(target.x, target.y, target.z + frameDist);
        camera.up.set(0, 1, 0);
      } else if (view === 'back' || view === 'rear') {
        // REAR / BACK: Backstage looking forward at rear rigging and chassis (-Z towards +Z)
        camera.position.set(target.x, target.y, target.z - frameDist);
        camera.up.set(0, 1, 0);
      } else if (view === 'left') {
        // LEFT: Looking from stage left (-X) towards stage right (+X)
        camera.position.set(target.x - frameDist, target.y, target.z);
        camera.up.set(0, 1, 0);
      } else if (view === 'right') {
        // RIGHT: Looking from stage right (+X) towards stage left (-X)
        camera.position.set(target.x + frameDist, target.y, target.z);
        camera.up.set(0, 1, 0);
      } else if (view === 'top') {
        // TOP: Plan view from ceiling (+Y), with Up pointing upstage (-Z)
        camera.position.set(target.x, target.y + frameDist * 1.3, target.z + 0.0001);
        camera.up.set(0, 0, -1);
      } else {
        // 3D / PERSP: Elevated 3/4 isometric perspective
        camera.position.set(
          target.x + frameDist * 0.58,
          target.y + frameDist * 0.44,
          target.z + frameDist * 0.88
        );
        camera.up.set(0, 1, 0);
      }

      camera.lookAt(target);
      if (controls) {
        controls.update();
      }

      s.cameraPreset = view;

      container.querySelectorAll('.v3d-cam-preset').forEach((b) => {
        const isAct = b.getAttribute('data-view') === view;
        b.className = `v3d-cam-preset px-2 py-1 text-xs font-bold transition-all cursor-pointer ${
          isAct
            ? 'bg-sky-500/20 text-sky-300 font-black border-b-2 border-sky-400'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`;
      });

      if (typeof persistProjects === 'function') persistProjects();
      requestRender();
    };

    const nudgePan = (deltaX, deltaY) => {
      const refEntry = selectedEntry || mapRenderData[0];
      const step = refEntry ? Math.max(0.4, Math.min(4.0, Math.max(refEntry.widthM, refEntry.heightM) * 0.08)) : 0.8;
      const offset = new THREE.Vector3();
      const vRight = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
      const vUp = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
      offset.addScaledVector(vRight, deltaX * step);
      offset.addScaledVector(vUp, deltaY * step);
      camera.position.add(offset);
      if (controls) {
        controls.target.add(offset);
        controls.update();
      }
      requestRender();
    };

    const nudgeTilt = (deltaPolarRad) => {
      if (!controls) return;
      const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.phi += deltaPolarRad;
      spherical.phi = Math.max(0.01, Math.min(Math.PI - 0.01, spherical.phi));
      offset.setFromSpherical(spherical);
      camera.position.addVectors(controls.target, offset);
      camera.lookAt(controls.target);
      controls.update();
      requestRender();
    };

    const nudgeOrbit = (deltaAzimuthRad) => {
      if (!controls) return;
      const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.theta += deltaAzimuthRad;
      offset.setFromSpherical(spherical);
      camera.position.addVectors(controls.target, offset);
      camera.lookAt(controls.target);
      controls.update();
      requestRender();
    };

    const centerStage = () => {
      const target = getActiveCenter();
      if (controls) {
        controls.target.copy(target);
      }
      setCameraView(s.cameraPreset || 'persp');
    };

    // Restore saved camera position or initialize view
    if (s.camPos && s.camTarget) {
      camera.position.set(s.camPos.x, s.camPos.y, s.camPos.z);
      camera.up.set(s.camUp?.x ?? 0, s.camUp?.y ?? 1, s.camUp?.z ?? 0);
      if (controls) {
        controls.target.set(s.camTarget.x, s.camTarget.y, s.camTarget.z);
        controls.update();
      }
    } else {
      setCameraView(s.cameraPreset || 'persp');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 11. POINTER INTERACTION (OBJECT SELECTION & DRAG FILTERING)
    // ──────────────────────────────────────────────────────────────────────────
    let pointerDownPos = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const mouseCoord = new THREE.Vector2();

    const onPointerDown = (e) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e) => {
      if (isGizmoDragging) return;
      if (e.button !== 0) return;
      const dx = Math.abs(e.clientX - pointerDownPos.x);
      const dy = Math.abs(e.clientY - pointerDownPos.y);
      if (dx > 4 || dy > 4) return;

      const rect = canvas.getBoundingClientRect();
      mouseCoord.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseCoord.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseCoord, camera);
      const intersects = raycaster.intersectObjects(screenClickTargets);

      if (intersects.length > 0) {
        const hitMapId = intersects[0].object.userData.mapId;
        if (hitMapId && String(s.selectedMapId) !== String(hitMapId)) {
          s.selectedMapId = String(hitMapId);
          persistProjects();
          renderView3DPro(container, activeMap, activeProject, helpers);
        }
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // ──────────────────────────────────────────────────────────────────────────
    // 12. WIRE UI CONTROLS & LISTENERS
    // ──────────────────────────────────────────────────────────────────────────

    // Inspector Screen Dropdown Switcher
    const activeScreenDropdown = container.querySelector('#v3d-active-screen-dropdown');
    if (activeScreenDropdown) {
      activeScreenDropdown.addEventListener('change', () => {
        s.selectedMapId = activeScreenDropdown.value;
        persistProjects();
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    }

    // Inspector Remove Selected Screen Button
    const removeSelBtn = container.querySelector('#v3d-remove-selected-screen-btn');
    if (removeSelBtn && selectedEntry) {
      removeSelBtn.addEventListener('click', () => {
        pushHistory();
        s.composeMapIds = s.composeMapIds.filter((id) => id !== String(selectedEntry.id));
        s.selectedMapId = s.composeMapIds[0] || '';
        persistProjects();
        showNotification?.('Removed screen from 3D scene', 'info');
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    }

    // Inspector Add Screen to 3D Dropdown & Button
    const addScreenSelect = container.querySelector('#v3d-add-screen-select');
    const confirmAddBtn = container.querySelector('#v3d-confirm-add-screen-btn');
    if (addScreenSelect && confirmAddBtn) {
      confirmAddBtn.addEventListener('click', () => {
        const mapId = addScreenSelect.value;
        if (!mapId) {
          showNotification?.('Please choose a screen from the dropdown first', 'warning');
          return;
        }
        pushHistory();
        if (!s.composeMapIds.includes(String(mapId))) {
          s.composeMapIds.push(String(mapId));
        }
        s.selectedMapId = String(mapId);

        // Intelligent placement: Place adjacent to existing wall with 0.0m flush seam
        if (!s.mapTransforms[mapId]) {
          const lastWall = mapRenderData[mapRenderData.length - 1];
          const newMap = mapPool.find((m) => String(m.id) === String(mapId));
          const calcs = (typeof calculateLayout === 'function' ? calculateLayout(newMap) : null) || {};
          const newW = ((Number(calcs.screenWidthMm) || 4000) / 1000) || 4;

          let posX = 0;
          let trimH = 1.0;
          let posZ = 0;
          if (lastWall) {
            const lTf = lastWall.transform;
            posX = (Number(lTf.x) || 0) + lastWall.widthM / 2 + newW / 2;
            trimH = Number(lTf.trimHeightM) || 1.0;
            posZ = Number(lTf.z) || 0;
          }

          s.mapTransforms[mapId] = {
            x: posX,
            y: 0,
            z: posZ,
            rotY: 0,
            rotX: 0,
            scale: 1,
            wallShape: 'flat',
            curveDeg: 0,
            cornerCol: 5,
            cornerAngleDeg: 90,
            mountMode: 'flown',
            trimHeightM: trimH
          };
        }
        persistProjects();
        showNotification?.('Added LED screen to 3D scene', 'success');
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    }

    // Snapping Actions (Instant Snap Buttons)
    const snapLeftBtn = container.querySelector('#v3d-snap-flush-left');
    if (snapLeftBtn && nearestInfo && selectedEntry) {
      snapLeftBtn.addEventListener('click', () => {
        pushHistory();
        const snapGap = Math.max(0, Number(s.mapSnapGap) || 0.0);
        selectedEntry.transform.x = nearestInfo.targetX - nearestInfo.targetWidth / 2 - nearestInfo.sourceWidth / 2 - snapGap;
        persistProjects();
        showNotification?.('Snapped flush to left edge', 'success');
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    }

    const snapRightBtn = container.querySelector('#v3d-snap-flush-right');
    if (snapRightBtn && nearestInfo && selectedEntry) {
      snapRightBtn.addEventListener('click', () => {
        pushHistory();
        const snapGap = Math.max(0, Number(s.mapSnapGap) || 0.0);
        selectedEntry.transform.x = nearestInfo.targetX + nearestInfo.targetWidth / 2 + nearestInfo.sourceWidth / 2 + snapGap;
        persistProjects();
        showNotification?.('Snapped flush to right edge', 'success');
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    }

    const alignTrimBtn = container.querySelector('#v3d-align-trim-btn');
    if (alignTrimBtn && nearestInfo && selectedEntry) {
      alignTrimBtn.addEventListener('click', () => {
        pushHistory();
        selectedEntry.transform.trimHeightM = nearestInfo.targetTrim;
        persistProjects();
        showNotification?.('Aligned trim height with target screen', 'success');
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    }

    const alignDepthBtn = container.querySelector('#v3d-align-depth-btn');
    if (alignDepthBtn && nearestInfo && selectedEntry) {
      alignDepthBtn.addEventListener('click', () => {
        pushHistory();
        selectedEntry.transform.z = nearestInfo.targetZ;
        persistProjects();
        showNotification?.('Aligned depth with target screen', 'success');
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    }

    // Magnetic Auto-Snap Toggle
    const autoSnapToggle = container.querySelector('#v3d-toggle-autosnap');
    if (autoSnapToggle) {
      autoSnapToggle.addEventListener('change', () => {
        s.mapAutoSnap = autoSnapToggle.checked;
        persistProjects();
      });
    }

    // Snap Gap Presets
    container.querySelectorAll('.v3d-snap-gap-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        s.mapSnapGap = Number(btn.getAttribute('data-snap-gap')) || 0.0;
        persistProjects();
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    });

    // 3D Transform Tool Buttons (Q, W, E, R)
    container.querySelectorAll('.v3d-tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tool = btn.getAttribute('data-tool');
        setToolMode(tool);
      });
    });

    // Toggle Space (World / Local)
    const toggleSpaceBtn = container.querySelector('#v3d-toggle-space-btn');
    if (toggleSpaceBtn) {
      toggleSpaceBtn.addEventListener('click', () => {
        s.gizmoSpace = s.gizmoSpace === 'local' ? 'world' : 'local';
        if (transformControls) transformControls.setSpace(s.gizmoSpace);
        toggleSpaceBtn.textContent = s.gizmoSpace === 'local' ? 'LOC' : 'WLD';
        persistProjects();
        requestRender();
      });
    }

    // Stage Pan Nudge Buttons (Header)
    container.querySelector('#v3d-stage-pan-left')?.addEventListener('click', () => nudgePan(-1, 0));
    container.querySelector('#v3d-stage-pan-right')?.addEventListener('click', () => nudgePan(1, 0));
    container.querySelector('#v3d-stage-pan-up')?.addEventListener('click', () => nudgePan(0, 1));
    container.querySelector('#v3d-stage-pan-down')?.addEventListener('click', () => nudgePan(0, -1));

    // Stage Tilt Nudge Buttons (Header)
    container.querySelector('#v3d-stage-tilt-up')?.addEventListener('click', () => nudgeTilt(-0.1));
    container.querySelector('#v3d-stage-tilt-down')?.addEventListener('click', () => nudgeTilt(0.1));

    // Center Stage Button (Header)
    container.querySelector('#v3d-stage-center')?.addEventListener('click', () => centerStage());

    // Camera Preset Buttons (Front, Left, Right, Top, Rear, 3D)
    container.querySelectorAll('.v3d-cam-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        setCameraView(view);
      });
    });

    // Surface Mode Selector
    const surfSelect = container.querySelector('#v3d-surface-mode-select');
    if (surfSelect) {
      surfSelect.addEventListener('change', () => {
        s.surfaceMode = surfSelect.value;
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    }

    // Inspector Tab Switcher
    container.querySelectorAll('.v3d-insp-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        s.inspectorTab = btn.getAttribute('data-insp-tab');
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    });

    // Numeric Coordinate Step Bump Buttons
    container.querySelectorAll('.v3d-bump-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!selectedEntry) return;
        const field = btn.getAttribute('data-field');
        const delta = Number(btn.getAttribute('data-delta')) || 0;
        pushHistory();
        selectedEntry.transform[field] = (Number(selectedEntry.transform[field]) || 0) + delta;
        if (field === 'trimHeightM') selectedEntry.transform[field] = Math.max(0, selectedEntry.transform[field]);
        persistProjects();
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    });

    // Coordinate Inputs Change
    container.querySelectorAll('.v3d-coord-input').forEach((input) => {
      input.addEventListener('change', () => {
        if (!selectedEntry) return;
        const field = input.getAttribute('data-field');
        pushHistory();
        selectedEntry.transform[field] = Number(input.value) || 0;
        persistProjects();
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    });

    // Range Sliders
    container.querySelectorAll('.v3d-range-input').forEach((range) => {
      range.addEventListener('input', () => {
        if (!selectedEntry) return;
        const field = range.getAttribute('data-field');
        selectedEntry.transform[field] = Number(range.value) || 0;
        const numIn = container.querySelector(`input.v3d-coord-input[data-field="${field}"]`);
        if (numIn) numIn.value = Math.round(selectedEntry.transform[field]);

        if (selectedWallGroup) {
          if (field === 'rotY') selectedWallGroup.rotation.y = THREE.MathUtils.degToRad(selectedEntry.transform[field]);
          if (field === 'rotX') selectedWallGroup.rotation.x = THREE.MathUtils.degToRad(selectedEntry.transform[field]);
        }
        requestRender();
      });
      range.addEventListener('change', () => {
        pushHistory();
        persistProjects();
      });
    });

    // Reset Position Button
    const resetPosBtn = container.querySelector('#v3d-reset-pos-btn');
    if (resetPosBtn && selectedEntry) {
      resetPosBtn.addEventListener('click', () => {
        pushHistory();
        selectedEntry.transform.x = 0;
        selectedEntry.transform.y = 0;
        selectedEntry.transform.z = 0;
        selectedEntry.transform.rotY = 0;
        selectedEntry.transform.rotX = 0;
        selectedEntry.transform.trimHeightM = 1.0;
        persistProjects();
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    }

    // Wall Shape Selector
    container.querySelectorAll('.v3d-wall-shape-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!selectedEntry) return;
        const shape = btn.getAttribute('data-wall-shape');
        pushHistory();
        selectedEntry.transform.wallShape = shape;
        if (shape === 'curved' && !selectedEntry.transform.curveDeg) selectedEntry.transform.curveDeg = -25;
        persistProjects();
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    });

    // Curve Angle Slider
    const curveSlider = container.querySelector('#v3d-curve-slider');
    if (curveSlider && selectedEntry) {
      curveSlider.addEventListener('input', () => {
        selectedEntry.transform.curveDeg = Number(curveSlider.value) || 0;
        const lbl = container.querySelector('#v3d-curve-val');
        if (lbl) lbl.textContent = `${selectedEntry.transform.curveDeg}°`;
      });
      curveSlider.addEventListener('change', () => {
        pushHistory();
        persistProjects();
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    }

    // Curve Presets
    container.querySelectorAll('.v3d-curve-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!selectedEntry) return;
        pushHistory();
        selectedEntry.transform.curveDeg = Number(btn.getAttribute('data-curve-preset')) || 0;
        persistProjects();
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    });

    // Mounting Mode Buttons
    container.querySelectorAll('.v3d-mount-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!selectedEntry) return;
        pushHistory();
        selectedEntry.transform.mountMode = btn.getAttribute('data-mount-mode');
        persistProjects();
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    });

    // Centralized Modular Stage Deck Creator
    const addStageDeckAction = (mode = 'autofit') => {
      pushHistory();
      const firstWall = selectedEntry || mapRenderData[0];
      const wallW = firstWall ? firstWall.widthM : 8;
      const wallTrim = firstWall ? Number(firstWall.transform.trimHeightM) || 1.0 : 1.0;
      const wallX = firstWall ? Number(firstWall.transform.x) || 0 : 0;
      const wallZ = firstWall ? Number(firstWall.transform.z) || 0 : 0;

      let deckW = 8;
      let deckD = 4;
      let deckH = Math.max(0.4, Math.min(1.5, wallTrim));
      let deckX = wallX;
      let deckZ = wallZ + 1.2;

      if (mode === 'autofit') {
        deckW = Math.max(4, Math.round((wallW + 2) * 2) / 2);
        deckD = Math.max(3, Math.round((deckW * 0.5) * 2) / 2);
        deckH = Math.max(0.4, Math.min(1.5, wallTrim));
      } else if (mode === 'concert') {
        deckW = 12;
        deckD = 6;
        deckH = 1.2;
      } else {
        deckW = 8;
        deckD = 4;
        deckH = 1.0;
      }

      const newDeck = {
        id: 'stage-' + Date.now(),
        name: `Stage Deck ${s.stageObjects.length + 1}`,
        width: deckW,
        depth: deckD,
        height: deckH,
        x: deckX,
        z: deckZ,
        color: '#1e293b'
      };

      s.stageObjects.push(newDeck);
      s.selectedStageObjectId = newDeck.id;
      persistProjects();
      showNotification?.(`Added ${newDeck.name} (${deckW}×${deckD}m)`, 'success');
      renderView3DPro(container, activeMap, activeProject, helpers);
    };

    // Wire all Add Stage Deck triggers (Top toolbar, Tab 1, Tab 2)
    const topAddStageBtn = container.querySelector('#v3d-top-add-stage-btn');
    if (topAddStageBtn) topAddStageBtn.addEventListener('click', () => addStageDeckAction('autofit'));

    const tab1AddStageBtn = container.querySelector('#v3d-tab1-add-stage-btn');
    if (tab1AddStageBtn) tab1AddStageBtn.addEventListener('click', () => addStageDeckAction('autofit'));

    const tab1AddStageStdBtn = container.querySelector('#v3d-tab1-add-stage-std-btn');
    if (tab1AddStageStdBtn) tab1AddStageStdBtn.addEventListener('click', () => addStageDeckAction('std'));

    const addStageBtn = container.querySelector('#v3d-add-stage-btn');
    if (addStageBtn) addStageBtn.addEventListener('click', () => addStageDeckAction('autofit'));

    const addStageStdBtn = container.querySelector('#v3d-add-stage-std-btn');
    if (addStageStdBtn) addStageStdBtn.addEventListener('click', () => addStageDeckAction('std'));

    // Switch to Stage tab button
    const switchToStageTabBtn = container.querySelector('.v3d-switch-to-stage-tab');
    if (switchToStageTabBtn) {
      switchToStageTabBtn.addEventListener('click', () => {
        s.inspectorTab = 'stage';
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    }

    // Stage Deck Inputs
    container.querySelectorAll('.v3d-stage-input').forEach((input) => {
      input.addEventListener('change', () => {
        const id = input.getAttribute('data-stageid');
        const field = input.getAttribute('data-field');
        const deck = s.stageObjects.find((d) => String(d.id) === String(id));
        if (deck) {
          pushHistory();
          deck[field] = Number(input.value) || 0;
          persistProjects();
          renderView3DPro(container, activeMap, activeProject, helpers);
        }
      });
    });

    // Delete Stage Deck
    container.querySelectorAll('.v3d-delete-stage-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-stageid');
        pushHistory();
        s.stageObjects = s.stageObjects.filter((d) => String(d.id) !== String(id));
        persistProjects();
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    });

    // Snap Stage Below Screen
    container.querySelectorAll('.v3d-snap-stage-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-stageid');
        const deck = s.stageObjects.find((d) => String(d.id) === String(id));
        if (deck && selectedEntry) {
          pushHistory();
          deck.x = Number(selectedEntry.transform.x) || 0;
          deck.z = Number(selectedEntry.transform.z) || 0;
          persistProjects();
          renderView3DPro(container, activeMap, activeProject, helpers);
        }
      });
    });

    // Match Stage to Screen Width
    container.querySelectorAll('.v3d-match-stage-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-stageid');
        const deck = s.stageObjects.find((d) => String(d.id) === String(id));
        if (deck && selectedEntry) {
          pushHistory();
          deck.width = Math.ceil(selectedEntry.widthM + 1.0);
          persistProjects();
          renderView3DPro(container, activeMap, activeProject, helpers);
        }
      });
    });

    // Rigging & Overlays Toggles
    container.querySelectorAll('.v3d-scene-flag').forEach((chk) => {
      chk.addEventListener('change', () => {
        s[chk.getAttribute('data-scene-flag')] = chk.checked;
        persistProjects();
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    });

    // Environment Themes
    container.querySelectorAll('.v3d-theme-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        s.backgroundTopColor = btn.getAttribute('data-theme-top');
        s.backgroundBottomColor = btn.getAttribute('data-theme-bot');
        s.gridMinorColor = btn.getAttribute('data-theme-min');
        s.gridMajorColor = btn.getAttribute('data-theme-maj');
        persistProjects();
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    });

    // Grid Toggle
    const gridToggle = container.querySelector('#v3d-toggle-grid');
    if (gridToggle) {
      gridToggle.addEventListener('change', () => {
        s.showGrid = gridToggle.checked;
        persistProjects();
        updateGrid();
        requestRender();
      });
    }

    // Grid Size Presets
    container.querySelectorAll('.v3d-grid-size-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        s.gridSizeM = Number(btn.getAttribute('data-grid-size')) || 1.0;
        persistProjects();
        updateGrid();
        requestRender();
      });
    });

    // Snapshot PNG
    const snapBtn = container.querySelector('#v3d-snapshot-btn');
    if (snapBtn) {
      snapBtn.addEventListener('click', () => {
        renderer.render(scene, camera);
        const dataUrl = renderer.domElement.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `3d-scene-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showNotification?.('Snapshot image downloaded', 'success');
      });
    }

    // Keyboard Shortcuts (W, E, R, Q, C, V)
    const keyHandler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          const snap = history.redo.pop();
          if (snap) { history.undo.push(captureSceneSnapshot()); restoreSnapshot(snap); }
        } else {
          const snap = history.undo.pop();
          if (snap) { history.undo.push(captureSceneSnapshot()); restoreSnapshot(snap); }
        }
      } else if (e.key === 'w' || e.key === 'W') {
        setToolMode('translate');
      } else if (e.key === 'e' || e.key === 'E') {
        setToolMode('rotate');
      } else if (e.key === 'r' || e.key === 'R') {
        setToolMode('scale');
      } else if (e.key === 'q' || e.key === 'Q') {
        setToolMode('select');
      } else if (e.key === 'c' || e.key === 'C') {
        setToolMode('orbit');
      } else if (e.key === 'v' || e.key === 'V') {
        setToolMode('pan');
      } else if (e.key === '1') {
        setCameraView('front');
      } else if (e.key === '2') {
        setCameraView('back');
      } else if (e.key === '3') {
        setCameraView('left');
      } else if (e.key === '4') {
        setCameraView('right');
      } else if (e.key === '5') {
        setCameraView('top');
      } else if (e.key === '0' || e.key === '`') {
        setCameraView('persp');
      } else if (e.key === 'Home') {
        centerStage();
      }
    };
    window.addEventListener('keydown', keyHandler);

    // ──────────────────────────────────────────────────────────────────────────
    // 13. LIFECYCLE DISPOSAL
    // ──────────────────────────────────────────────────────────────────────────
    window.__view3dProRuntime = {
      dispose: () => {
        if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener('resize', fitCanvas);
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('keydown', keyHandler);
        if (controls) {
          try {
            controls.dispose();
          } catch (_) {}
        }
        if (transformControls) {
          try {
            transformControls.detach();
            transformControls.dispose();
          } catch (_) {}
        }
        try {
          renderer.dispose();
          renderer.forceContextLoss();
        } catch (_) {}
      }
    };

    return window.__view3dProRuntime;
  }

  window.View3DPro = {
    render: renderView3DPro
  };
})();

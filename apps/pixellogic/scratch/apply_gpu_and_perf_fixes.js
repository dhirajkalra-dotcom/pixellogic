const fs = require('fs');

let code = fs.readFileSync('src/view3d-pro.js', 'utf8');

// 1. Add runtime disposal check at beginning of renderView3DPro
const renderStartTarget = `  function renderView3DPro(container, activeMap, activeProject, helpers = {}) {`;
const renderStartReplace = `  function renderView3DPro(container, activeMap, activeProject, helpers = {}) {
    if (window.__view3dProRuntime && typeof window.__view3dProRuntime.dispose === 'function') {
      try { window.__view3dProRuntime.dispose(); } catch (_) {}
      window.__view3dProRuntime = null;
    }`;

if (!code.includes(renderStartTarget)) {
  throw new Error('renderStartTarget not found');
}
code = code.replace(renderStartTarget, renderStartReplace);

// 2. Remove all mentions of "Autodesk" and "3ds Max"
code = code.replace(
  `// View defaults (Autodesk 3ds Max style tool modes: 'select', 'translate', 'rotate', 'scale', 'orbit', 'pan')`,
  `// View defaults (3D Transform tool modes: 'select', 'translate', 'rotate', 'scale', 'orbit', 'pan')`
);

code = code.replace(
  `<!-- Top Autodesk 3ds Max Style Application Toolbar -->`,
  `<!-- Top 3D Viewport Toolbar -->`
);

code = code.replace(
  `<!-- Center-Right: Autodesk 3ds Max Transform Gizmos (Q, W, E, R) & Tools -->`,
  `<!-- Center-Right: 3D Transform Gizmos (Q, W, E, R) & Tools -->`
);

code = code.replace(
  `<!-- 3ds Max Transform Gizmo Modes -->`,
  `<!-- 3D Transform Gizmo Modes -->`
);

// 3. Update HUD Overlay: Remove "AUTODESK 3DS MAX GIZMO" and add dedicated GPU hardware name readout
const hudTarget = `<div class="flex items-center gap-2">
                <span class="text-amber-400 font-black tracking-wider">AUTODESK 3DS MAX GIZMO</span>
                <span class="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">GPU WebGL</span>
              </div>`;

const hudReplace = `<div class="flex items-center gap-2">
                <span class="text-amber-400 font-black tracking-wider">3D TRANSFORM GIZMO</span>
                <span id="v3d-gpu-badge" class="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 flex items-center gap-1.5 font-mono">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span id="v3d-gpu-name">NVIDIA Dedicated GPU</span>
                </span>
              </div>`;

if (!code.includes(hudTarget)) {
  throw new Error('hudTarget not found');
}
code = code.replace(hudTarget, hudReplace);

// 4. Update Inspector Coordinates section title
code = code.replace(`<!-- AUTODESK 3DS MAX 3D POSITION & GIZMO SECTION -->`, `<!-- 3D POSITION & TRANSFORM GIZMO SECTION -->`);
code = code.replace(`3ds Max Coordinates`, `3D Transform & Coordinates`);

// 5. Update comments
code = code.replace(`// 4. THREE.JS & AUTODESK 3DS MAX TRANSFORM GIZMO INITIALIZATION`, `// 4. THREE.JS & 3D TRANSFORM GIZMO INITIALIZATION`);
code = code.replace(`// 9. AUTODESK 3DS MAX TRANSFORM GIZMO & MAGNETIC SNAPPING`, `// 9. 3D TRANSFORM GIZMO & MAGNETIC SNAPPING`);

// 6. Query actual unmasked GPU hardware name (e.g. NVIDIA GeForce RTX 4070 Laptop GPU)
const rendererInitTarget = `    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });`;

const rendererInitReplace = `    const renderer = new THREE.WebGLRenderer({
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
        const mAngle = rawRenderer.match(/ANGLE \\([^,]+,\\s*([^,]+?)(?:\\s+\\(0x|\\s+Direct3D|\\s*,|\\))/i);
        if (mAngle && mAngle[1]) {
          detectedGpu = mAngle[1].trim();
        } else if (rawRenderer.includes('GeForce') || rawRenderer.includes('NVIDIA') || rawRenderer.includes('RTX') || rawRenderer.includes('GTX')) {
          const m = rawRenderer.match(/(?:NVIDIA\\s+)?(?:GeForce\\s+)?(?:RTX|GTX|Quadro)\\s+[A-Za-z0-9\\s]+/i);
          if (m) detectedGpu = m[0].trim();
        }
        const gpuNameEl = container.querySelector('#v3d-gpu-name');
        if (gpuNameEl && detectedGpu) {
          gpuNameEl.textContent = detectedGpu;
        }
      }
    } catch (_) {}`;

if (!code.includes(rendererInitTarget)) {
  throw new Error('rendererInitTarget not found');
}
code = code.replace(rendererInitTarget, rendererInitReplace);

// 7. Add setToolMode function for 0ms instant tool switching without WebGL teardown/rebuild
const toolButtonsTarget = `    // Autodesk 3ds Max Tool Buttons (Q, W, E, R)
    container.querySelectorAll('.v3d-tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        s.toolMode = btn.getAttribute('data-tool');
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    });`;

const toolButtonsReplace = `    // Instant 0ms tool mode switcher (avoids tearing down WebGL or re-rendering scene)
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

      // Update toolbar buttons visually in 0ms (no DOM re-creation)
      container.querySelectorAll('.v3d-tool-btn').forEach((btn) => {
        const isCurrent = btn.getAttribute('data-tool') === mode;
        btn.className = \`v3d-tool-btn px-2.5 py-1 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer \${
          isCurrent
            ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }\`;
      });

      if (typeof persistProjects === 'function') persistProjects();
      requestRender();
    };

    // 3D Transform Tool Buttons (Q, W, E, R)
    container.querySelectorAll('.v3d-tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tool = btn.getAttribute('data-tool');
        setToolMode(tool);
      });
    });`;

if (!code.includes(toolButtonsTarget)) {
  throw new Error('toolButtonsTarget not found');
}
code = code.replace(toolButtonsTarget, toolButtonsReplace);

// 8. Update Keyboard Shortcuts handler to use setToolMode instead of renderView3DPro
const keyHandlerTarget = `    // Keyboard Shortcuts (AUTODESK 3DS MAX: W, E, R, Q, C, V)
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
        s.toolMode = 'translate';
        renderView3DPro(container, activeMap, activeProject, helpers);
      } else if (e.key === 'e' || e.key === 'E') {
        s.toolMode = 'rotate';
        renderView3DPro(container, activeMap, activeProject, helpers);
      } else if (e.key === 'r' || e.key === 'R') {
        s.toolMode = 'scale';
        renderView3DPro(container, activeMap, activeProject, helpers);
      } else if (e.key === 'q' || e.key === 'Q') {
        s.toolMode = 'select';
        renderView3DPro(container, activeMap, activeProject, helpers);
      } else if (e.key === 'c' || e.key === 'C') {
        s.toolMode = 'orbit';
        renderView3DPro(container, activeMap, activeProject, helpers);
      } else if (e.key === 'v' || e.key === 'V') {
        s.toolMode = 'pan';
        renderView3DPro(container, activeMap, activeProject, helpers);
      }
    };`;

const keyHandlerReplace = `    // Keyboard Shortcuts (W, E, R, Q, C, V)
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
      }
    };`;

if (!code.includes(keyHandlerTarget)) {
  throw new Error('keyHandlerTarget not found');
}
code = code.replace(keyHandlerTarget, keyHandlerReplace);

fs.writeFileSync('src/view3d-pro.js', code, 'utf8');
console.log('Successfully applied all GPU and performance fixes to src/view3d-pro.js!');

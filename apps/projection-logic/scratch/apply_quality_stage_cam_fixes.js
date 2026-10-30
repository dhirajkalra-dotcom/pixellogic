const fs = require('fs');

let code = fs.readFileSync('src/view3d-pro.js', 'utf8');

// 1. Change default rotX from -12 (underground) to 14 (elevated eye level looking down at stage)
code = code.replace(
  `if (!Number.isFinite(Number(s.rotX))) s.rotX = -12;`,
  `if (!Number.isFinite(Number(s.rotX))) s.rotX = 14;`
);

// 2. Add Top Toolbar "+ Stage Deck" button
const topToolbarSnapTarget = `            <!-- Snapshot PNG -->
            <button
              type="button"
              id="v3d-snapshot-btn"`;

const topToolbarSnapReplace = `            <!-- Quick Add Stage Deck Button -->
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
              id="v3d-snapshot-btn"`;

if (code.includes(topToolbarSnapTarget)) {
  code = code.replace(topToolbarSnapTarget, topToolbarSnapReplace);
}

// 3. Enhance Inspector Tabs with icons and stage deck count
const tabsTarget = `            <!-- Inspector Tabs -->
            <div class="grid grid-cols-3 gap-0 bg-[#070d18] border-b border-slate-800 shrink-0">
              \${[
                { id: 'wall', label: '1. LED Wall' },
                { id: 'stage', label: '2. Staging & Rig' },
                { id: 'scene', label: '3. Scene & Cam' }
              ].map((tab) => \``;

const tabsReplace = `            <!-- Inspector Tabs -->
            <div class="grid grid-cols-3 gap-0 bg-[#070d18] border-b border-slate-800 shrink-0">
              \${[
                { id: 'wall', label: '🏢 1. LED Wall' },
                { id: 'stage', label: \`🎭 2. Staging \${s.stageObjects.length ? \`(\${s.stageObjects.length})\` : ''}\` },
                { id: 'scene', label: '🌐 3. Scene' }
              ].map((tab) => \``;

if (code.includes(tabsTarget)) {
  code = code.replace(tabsTarget, tabsReplace);
}

// 4. Add Stage Deck Platform card to Tab 1 (LED Wall) right after Mounting Structure
const tab1MountEndTarget = `                    \${[
                      { id: 'flown', label: '⛓️ Flown Truss' },
                      { id: 'ground', label: '🏗️ Ground Stack' },
                      { id: 'wall', label: '🧱 Clean Wall' }
                    ].map((mm) => \`
                      <button
                        type="button"
                        data-mount-mode="\${mm.id}"
                        class="v3d-mount-btn py-1.5 text-[10px] font-bold transition-all cursor-pointer \${
                          selTf.mountMode === mm.id
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'text-slate-400 hover:text-white'
                        }"
                      >\${mm.label}</button>
                    \`).join('')}
                  </div>
                </div>`;

const tab1MountEndReplace = `                    \${[
                      { id: 'flown', label: '⛓️ Flown Truss' },
                      { id: 'ground', label: '🏗️ Ground Stack' },
                      { id: 'wall', label: '🧱 Clean Wall' }
                    ].map((mm) => \`
                      <button
                        type="button"
                        data-mount-mode="\${mm.id}"
                        class="v3d-mount-btn py-1.5 text-[10px] font-bold transition-all cursor-pointer \${
                          selTf.mountMode === mm.id
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'text-slate-400 hover:text-white'
                        }"
                      >\${mm.label}</button>
                    \`).join('')}
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
                      \${s.stageObjects.length} \${s.stageObjects.length === 1 ? 'Deck' : 'Decks'}
                    </span>
                  </div>

                  \${s.stageObjects.length > 0 ? \`
                    <div class="space-y-2">
                      \${s.stageObjects.map((deck) => \`
                        <div class="bg-[#070d18] border border-slate-700/80 p-2 text-xs flex items-center justify-between">
                          <div>
                            <strong class="text-white">\${escapeHtml(deck.name || 'Stage Deck')}</strong>
                            <div class="text-[10px] text-slate-400 font-mono">\${Number(deck.width || 8).toFixed(1)}m × \${Number(deck.depth || 4).toFixed(1)}m · H: \${Number(deck.height || 1).toFixed(1)}m</div>
                          </div>
                          <div class="flex items-center gap-1">
                            <button type="button" data-stageid="\${escapeHtml(deck.id)}" class="v3d-snap-stage-btn px-2 py-1 bg-sky-500/20 text-sky-300 text-[10px] font-bold hover:bg-sky-500/30 cursor-pointer">Center</button>
                            <button type="button" data-stageid="\${escapeHtml(deck.id)}" class="v3d-delete-stage-btn px-2 py-1 bg-rose-500/20 text-rose-300 text-[10px] font-bold hover:bg-rose-500/30 cursor-pointer">Remove</button>
                          </div>
                        </div>
                      \`).join('')}
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
                  \` : \`
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
                  \`}`;

if (code.includes(tab1MountEndTarget)) {
  code = code.replace(tab1MountEndTarget, tab1MountEndReplace);
}

// 5. Enhance Tab 2 Stage Deck Header with quick presets
const tab2StageHeaderTarget = `              <!-- TAB 2: STAGING & RIGGING -->
              \${s.inspectorTab === 'stage' ? \`
                <div class="bg-[#0f192c] border border-slate-800 p-3 space-y-3">
                  <div class="flex items-center justify-between">
                    <div>
                      <span class="text-xs font-bold text-white uppercase tracking-wider block">Modular Stage Decks</span>
                      <span class="text-[10px] text-slate-400">Aluminum framed platforms with skirting</span>
                    </div>
                    <button type="button" id="v3d-add-stage-btn" class="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm cursor-pointer">+ Add Deck</button>
                  </div>`;

const tab2StageHeaderReplace = `              <!-- TAB 2: STAGING & RIGGING -->
              \${s.inspectorTab === 'stage' ? \`
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
                  </div>`;

if (code.includes(tab2StageHeaderTarget)) {
  code = code.replace(tab2StageHeaderTarget, tab2StageHeaderReplace);
}

// 6. Upgrade WebGLRenderer PixelRatio to high-DPI 2x supersampling and depth precision
const rendererTarget = `    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(s.backgroundTopColor);
    scene.fog = new THREE.FogExp2(s.backgroundTopColor, 0.015);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);`;

const rendererReplace = `    // Force high-DPI supersampling (2x resolution) for pin-sharp render quality when zoomed out
    renderer.setPixelRatio(Math.max(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(s.backgroundTopColor);
    scene.fog = new THREE.FogExp2(s.backgroundTopColor, 0.012);

    // Optimized near/far clipping for sharp depth buffer precision (eliminates Z-fighting when zoomed out)
    const camera = new THREE.PerspectiveCamera(45, 1, 0.3, 400);`;

if (code.includes(rendererTarget)) {
  code = code.replace(rendererTarget, rendererReplace);
}

// 7. Add Solid Stage Ground Plane and upgrade Ground Grid Helper
const gridTarget = `    // Ground Grid Helper
    let gridHelper = null;
    const updateGrid = () => {
      if (gridHelper) scene.remove(gridHelper);
      if (!s.showGrid) return;
      const size = 60;
      const divisions = Math.round(size / Math.max(0.25, Number(s.gridSizeM) || 1));
      gridHelper = new THREE.GridHelper(size, divisions, new THREE.Color(s.gridMajorColor), new THREE.Color(s.gridMinorColor));
      gridHelper.position.y = 0;
      scene.add(gridHelper);
    };
    updateGrid();`;

const gridReplace = `    // Solid Stage Floor Ground Plane (prevents moiré / flickering at distance)
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
    updateGrid();`;

if (code.includes(gridTarget)) {
  code = code.replace(gridTarget, gridReplace);
}

// 8. Upgrade Screen Texture Generation: full trilinear mipmapping and maximum anisotropic filtering
const textureTarget = `      const tex = new THREE.CanvasTexture(texCanvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
      return tex;`;

const textureReplace = `      const tex = new THREE.CanvasTexture(texCanvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return tex;`;

if (code.includes(textureTarget)) {
  code = code.replace(textureTarget, textureReplace);
}

// 9. Fix updateCamera for top view orientation and dynamic centering on active LED screen
const updateCameraTarget = `    const updateCamera = () => {
      const phi = THREE.MathUtils.degToRad(90 - (Number(s.rotX) || -12));
      const theta = THREE.MathUtils.degToRad(Number(s.rotY) || 25);

      const d = targetDist;
      camera.position.x = sceneCenter.x + d * Math.sin(phi) * Math.sin(theta) + (Number(s.panX) || 0) * 0.01;
      camera.position.y = sceneCenter.y + d * Math.cos(phi) - (Number(s.panY) || 0) * 0.01;
      camera.position.z = sceneCenter.z + d * Math.sin(phi) * Math.cos(theta);

      camera.lookAt(
        sceneCenter.x + (Number(s.panX) || 0) * 0.01,
        sceneCenter.y - (Number(s.panY) || 0) * 0.01,
        sceneCenter.z
      );
    };`;

const updateCameraReplace = `    const getActiveCenter = () => {
      const ref = selectedEntry || mapRenderData[0];
      if (!ref) return new THREE.Vector3(0, 1.8, 0);
      const tf = ref.transform;
      const cy = (Number(tf.trimHeightM) || 1.0) + ref.heightM / 2;
      const cx = Number(tf.x) || 0;
      const cz = Number(tf.z) || 0;
      return new THREE.Vector3(cx, cy, cz);
    };

    const updateCamera = () => {
      sceneCenter = getActiveCenter();
      const phi = THREE.MathUtils.degToRad(90 - (Number(s.rotX) || 14));
      const theta = THREE.MathUtils.degToRad(Number(s.rotY) || 25);

      const d = targetDist;
      camera.position.x = sceneCenter.x + d * Math.sin(phi) * Math.sin(theta) + (Number(s.panX) || 0) * 0.01;
      camera.position.y = sceneCenter.y + d * Math.cos(phi) - (Number(s.panY) || 0) * 0.01;
      camera.position.z = sceneCenter.z + d * Math.sin(phi) * Math.cos(theta);

      // Looking straight down from top: set camera up vector towards -Z (front of stage)
      if (Math.abs(Number(s.rotX)) >= 85) {
        camera.up.set(0, 0, -1);
      } else {
        camera.up.set(0, 1, 0);
      }

      camera.lookAt(
        sceneCenter.x + (Number(s.panX) || 0) * 0.01,
        sceneCenter.y - (Number(s.panY) || 0) * 0.01,
        sceneCenter.z
      );
    };`;

if (!code.includes(updateCameraTarget)) {
  throw new Error('updateCameraTarget not found');
}
code = code.replace(updateCameraTarget, updateCameraReplace);

// 10. Fix Camera Presets (Front, Left, Right, Top, Rear, 3D)
const camPresetsTarget = `    // Camera Preset Buttons
    container.querySelectorAll('.v3d-cam-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        if (view === 'front') { s.rotX = 0; s.rotY = 0; }
        else if (view === 'left') { s.rotX = 0; s.rotY = 90; }
        else if (view === 'right') { s.rotX = 0; s.rotY = -90; }
        else if (view === 'top') { s.rotX = -89; s.rotY = 0; }
        else if (view === 'back') { s.rotX = 0; s.rotY = 180; }
        else { s.rotX = -12; s.rotY = 25; }
        requestRender();
      });
    });`;

const camPresetsReplace = `    // Camera Preset Buttons (Front, Left, Right, Top, Rear, 3D)
    container.querySelectorAll('.v3d-cam-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        // Reset pan so the view is always centered on stage
        s.panX = 0;
        s.panY = 0;

        const refEntry = selectedEntry || mapRenderData[0];
        const refDim = refEntry ? Math.max(refEntry.widthM, refEntry.heightM) : 8;
        const frameDist = Math.max(6, Math.min(35, refDim * 1.8));

        if (view === 'front') {
          // FRONT: Looking straight at the front of the LED wall (+Z to -Z)
          s.rotX = 0;
          s.rotY = 0;
          targetDist = frameDist;
          s.distance = frameDist;
        } else if (view === 'left') {
          // LEFT: Camera placed on Stage Left (-X), looking across stage towards right (+X)
          s.rotX = 0;
          s.rotY = -90;
          targetDist = frameDist;
          s.distance = frameDist;
        } else if (view === 'right') {
          // RIGHT: Camera placed on Stage Right (+X), looking across stage towards left (-X)
          s.rotX = 0;
          s.rotY = 90;
          targetDist = frameDist;
          s.distance = frameDist;
        } else if (view === 'top') {
          // TOP: Camera placed high above in ceiling (+Y), looking straight down
          s.rotX = 89.5;
          s.rotY = 0;
          targetDist = frameDist * 1.25;
          s.distance = frameDist * 1.25;
        } else if (view === 'back') {
          // REAR: Camera placed backstage (-Z), looking forward at rigging & rear support (+Z)
          s.rotX = 0;
          s.rotY = 180;
          targetDist = frameDist;
          s.distance = frameDist;
        } else {
          // PERSP / 3D: Elevated 3/4 isometric stage view
          s.rotX = 14;
          s.rotY = 25;
          targetDist = frameDist * 1.15;
          s.distance = frameDist * 1.15;
        }

        // Highlight active camera button
        container.querySelectorAll('.v3d-cam-preset').forEach((b) => {
          const isAct = b.getAttribute('data-view') === view;
          b.className = \`v3d-cam-preset px-2 py-1 text-xs font-bold transition-all cursor-pointer \${
            isAct ? 'bg-sky-500/20 text-sky-300 font-black border-b-2 border-sky-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }\`;
        });

        persistProjects();
        requestRender();
      });
    });`;

if (!code.includes(camPresetsTarget)) {
  throw new Error('camPresetsTarget not found');
}
code = code.replace(camPresetsTarget, camPresetsReplace);

// 11. Wire Stage Deck Add Handlers across all buttons (Top Toolbar, Tab 1, and Tab 2)
const addStageOldTarget = `    // Add Stage Deck Button
    const addStageBtn = container.querySelector('#v3d-add-stage-btn');
    if (addStageBtn) {
      addStageBtn.addEventListener('click', () => {
        pushHistory();
        const firstWall = mapRenderData[0];
        const newDeck = {
          id: \`stage-\${Date.now()}\`,
          name: \`Deck \${s.stageObjects.length + 1}\`,
          width: firstWall ? Math.ceil(firstWall.widthM + 2) : 8,
          depth: 4,
          height: 1.0,
          x: firstWall ? (Number(firstWall.transform.x) || 0) : 0,
          z: firstWall ? (Number(firstWall.transform.z) || 0) : 0,
          color: '#1e293b'
        };
        s.stageObjects.push(newDeck);
        s.selectedStageObjectId = newDeck.id;
        persistProjects();
        showNotification?.('Added modular stage deck', 'success');
        renderView3DPro(container, activeMap, activeProject, helpers);
      });
    }`;

const addStageOldReplace = `    // Centralized Modular Stage Deck Creator
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
        name: \`Stage Deck \${s.stageObjects.length + 1}\`,
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
      showNotification?.(\`Added \${newDeck.name} (\${deckW}×\${deckD}m)\`, 'success');
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
    }`;

if (!code.includes(addStageOldTarget)) {
  throw new Error('addStageOldTarget not found');
}
code = code.replace(addStageOldTarget, addStageOldReplace);

fs.writeFileSync('src/view3d-pro.js', code, 'utf8');
console.log('Successfully applied all quality, stage deck, and camera fixes to src/view3d-pro.js!');

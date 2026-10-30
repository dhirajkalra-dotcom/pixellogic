// Output Maps — compose multiple pixel maps onto a single output canvas.
// Mirrors the desktop "Output Canvas" tab: position pixel maps in a layout,
// drag to reposition, change canvas size/background, export PNG.

import {
  getActiveProject, updateActiveProject, drawMap,
} from '../state.js';
import { go } from '../router.js';

export async function render(root) {
  const project = await getActiveProject();
  if (!project) {
    root.innerHTML = `
      <div class="hero">
        <h2>No project open</h2>
        <p>Open or create a project to compose output maps.</p>
        <button class="btn btn-primary" id="om-go-projects">Go to Projects</button>
      </div>
    `;
    root.querySelector('#om-go-projects').addEventListener('click', () => go('projects'));
    return;
  }
  document.getElementById('app-title').textContent = 'Output Maps';

  // Initialise output canvas state on the project if not present.
  if (!project.data.outputCanvas) {
    project.data.outputCanvas = {
      width: 3840,
      height: 2160,
      background: '#000000',
      placements: [],   // [{ mapId, x, y, w, h }]
    };
    await updateActiveProject(p => ({ ...p, data: { ...p.data, outputCanvas: project.data.outputCanvas } }));
  }
  const canvasState = project.data.outputCanvas;
  const maps = project.data.pixelMaps;

  // Auto-place any pixel maps that aren't yet placed (in a row across the top).
  let dirty = false;
  let placedX = 0;
  for (const m of maps) {
    if (!canvasState.placements.find(p => p.mapId === m.id)) {
      const w = Math.min(canvasState.width / 2, m.panelW * Math.ceil(toMM(m.screenW, m.screenUnit) / m.panelW));
      const h = w * (m.panelResH / m.panelResW); // rough aspect
      canvasState.placements.push({ mapId: m.id, x: placedX, y: 0, w, h });
      placedX += w + 20;
      dirty = true;
    }
  }
  if (dirty) await persist();

  let selectedId = canvasState.placements[0]?.mapId || null;
  let saveTimer = null;

  function persist() {
    return updateActiveProject(p => ({
      ...p,
      data: { ...p.data, outputCanvas: canvasState },
    }));
  }
  function queueSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 220);
  }

  function mount() {
    root.innerHTML = `
      <div class="card preview-card">
        <canvas id="om-canvas" style="touch-action:none;cursor:grab;"></canvas>
        <p class="hint" id="om-status" style="margin:8px 0 0;"></p>
      </div>

      <div class="card">
        <h3>Canvas size</h3>
        <div class="row">
          <div class="field">
            <label>Width (px)</label>
            <input id="om-w" type="number" min="320" max="16384" value="${canvasState.width}" />
          </div>
          <div class="field">
            <label>Height (px)</label>
            <input id="om-h" type="number" min="240" max="16384" value="${canvasState.height}" />
          </div>
        </div>
        <div class="field">
          <label>Background</label>
          <input id="om-bg" type="color" value="${canvasState.background || '#000000'}" style="height:44px;" />
        </div>
        <div class="chip-row">
          <button class="chip" data-preset="1920,1080">1080p</button>
          <button class="chip" data-preset="3840,2160">4K UHD</button>
          <button class="chip" data-preset="4096,2160">DCI 4K</button>
          <button class="chip" data-preset="2560,1440">2.5K</button>
        </div>
      </div>

      <div class="card">
        <h3>Maps on canvas</h3>
        <div id="om-list"></div>
        <p class="hint" style="margin-top:10px;">Drag any map on the canvas to reposition. Tap a map to select.</p>
      </div>

      <div class="card">
        <h3>Selected map</h3>
        <div id="om-sel"></div>
      </div>

      <div class="card">
        <h3>Export</h3>
        <button class="btn btn-primary" id="om-png">Save as PNG</button>
        <p class="hint" style="margin-top:8px;">Exports at native canvas resolution (${canvasState.width} × ${canvasState.height}).</p>
      </div>
    `;
    renderList();
    renderSelected();
    wire();
    sizeAndDraw();
  }

  function renderList() {
    const box = root.querySelector('#om-list');
    if (!canvasState.placements.length) {
      box.innerHTML = '<p class="hint">No pixel maps yet. Add maps in Pixel Designer.</p>';
      return;
    }
    box.innerHTML = canvasState.placements.map((p, i) => {
      const m = maps.find(mm => mm.id === p.mapId);
      if (!m) return '';
      return `
        <div class="om-row${p.mapId === selectedId ? ' active' : ''}" data-id="${p.mapId}"
             style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 6px;border-bottom:1px solid var(--border);">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:14px;">${esc(m.name)}</div>
            <div class="hint" style="font-size:11.5px;">${Math.round(p.w)} × ${Math.round(p.h)} px @ (${Math.round(p.x)}, ${Math.round(p.y)})</div>
          </div>
          <button class="btn btn-ghost btn-sm" data-act="up" data-i="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="btn btn-ghost btn-sm" data-act="dn" data-i="${i}" ${i === canvasState.placements.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn btn-danger btn-sm" data-act="del" data-i="${i}">Remove</button>
        </div>
      `;
    }).join('');

    box.querySelectorAll('.om-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        selectedId = row.dataset.id;
        renderList(); renderSelected(); sizeAndDraw();
      });
    });
    box.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.i);
        if (btn.dataset.act === 'up' && i > 0) {
          const arr = canvasState.placements;
          [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
        } else if (btn.dataset.act === 'dn' && i < canvasState.placements.length - 1) {
          const arr = canvasState.placements;
          [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
        } else if (btn.dataset.act === 'del') {
          const removed = canvasState.placements.splice(i, 1)[0];
          if (selectedId === removed?.mapId) selectedId = canvasState.placements[0]?.mapId || null;
        }
        queueSave(); renderList(); renderSelected(); sizeAndDraw();
      });
    });

    // Show "add" buttons for any project pixel maps not currently placed.
    const missing = maps.filter(m => !canvasState.placements.find(p => p.mapId === m.id));
    if (missing.length) {
      const adder = document.createElement('div');
      adder.style.marginTop = '10px';
      adder.innerHTML = `
        <p class="hint" style="margin-bottom:6px;">Add a map back:</p>
        <div class="chip-row">
          ${missing.map(m => `<button class="chip" data-add="${m.id}">+ ${esc(m.name)}</button>`).join('')}
        </div>
      `;
      adder.querySelectorAll('button[data-add]').forEach(btn => {
        btn.addEventListener('click', () => {
          const m = maps.find(mm => mm.id === btn.dataset.add);
          if (!m) return;
          const w = Math.min(canvasState.width / 2, 1920);
          const h = w * (m.panelResH / m.panelResW);
          canvasState.placements.push({ mapId: m.id, x: 0, y: 0, w, h });
          selectedId = m.id;
          queueSave(); renderList(); renderSelected(); sizeAndDraw();
        });
      });
      box.appendChild(adder);
    }
  }

  function renderSelected() {
    const box = root.querySelector('#om-sel');
    const p = canvasState.placements.find(pp => pp.mapId === selectedId);
    if (!p) {
      box.innerHTML = '<p class="hint">Select a map above.</p>';
      return;
    }
    box.innerHTML = `
      <div class="row">
        <div class="field">
          <label>X (px)</label>
          <input id="om-x" type="number" value="${Math.round(p.x)}" />
        </div>
        <div class="field">
          <label>Y (px)</label>
          <input id="om-y" type="number" value="${Math.round(p.y)}" />
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label>Width (px)</label>
          <input id="om-pw" type="number" min="20" value="${Math.round(p.w)}" />
        </div>
        <div class="field">
          <label>Height (px)</label>
          <input id="om-ph" type="number" min="20" value="${Math.round(p.h)}" />
        </div>
      </div>
      <div class="chip-row">
        <button class="chip" id="om-fit">Fit canvas</button>
        <button class="chip" id="om-center">Center</button>
        <button class="chip" id="om-ar">Reset aspect</button>
      </div>
    `;
    const m = maps.find(mm => mm.id === p.mapId);
    const arInputs = ['om-x','om-y','om-pw','om-ph'];
    arInputs.forEach(id => {
      const el = box.querySelector('#' + id);
      el.addEventListener('input', () => {
        p.x  = Number(box.querySelector('#om-x').value);
        p.y  = Number(box.querySelector('#om-y').value);
        p.w  = Math.max(20, Number(box.querySelector('#om-pw').value));
        p.h  = Math.max(20, Number(box.querySelector('#om-ph').value));
        queueSave(); renderList(); sizeAndDraw();
      });
    });
    box.querySelector('#om-fit').addEventListener('click', () => {
      p.x = 0; p.y = 0; p.w = canvasState.width; p.h = canvasState.height;
      queueSave(); renderSelected(); renderList(); sizeAndDraw();
    });
    box.querySelector('#om-center').addEventListener('click', () => {
      p.x = (canvasState.width  - p.w) / 2;
      p.y = (canvasState.height - p.h) / 2;
      queueSave(); renderSelected(); renderList(); sizeAndDraw();
    });
    box.querySelector('#om-ar').addEventListener('click', () => {
      if (m) p.h = p.w * (m.panelResH / m.panelResW);
      queueSave(); renderSelected(); renderList(); sizeAndDraw();
    });
  }

  function wire() {
    root.querySelector('#om-w').addEventListener('input', (e) => {
      canvasState.width = Math.max(320, Number(e.target.value) || 320);
      sizeAndDraw(); queueSave();
    });
    root.querySelector('#om-h').addEventListener('input', (e) => {
      canvasState.height = Math.max(240, Number(e.target.value) || 240);
      sizeAndDraw(); queueSave();
    });
    root.querySelector('#om-bg').addEventListener('input', (e) => {
      canvasState.background = e.target.value;
      sizeAndDraw(); queueSave();
    });
    root.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [w, h] = btn.dataset.preset.split(',').map(Number);
        canvasState.width = w; canvasState.height = h;
        queueSave(); mount();
      });
    });
    root.querySelector('#om-png').addEventListener('click', exportPng);

    // Drag handling on the canvas.
    const c = root.querySelector('#om-canvas');
    let drag = null;
    c.addEventListener('pointerdown', (e) => {
      const { sx, sy, scale } = layoutInfo(c);
      const cx = (e.offsetX - sx) / scale;
      const cy = (e.offsetY - sy) / scale;
      // hit-test in reverse so top items are picked first
      for (let i = canvasState.placements.length - 1; i >= 0; i--) {
        const p = canvasState.placements[i];
        if (cx >= p.x && cx <= p.x + p.w && cy >= p.y && cy <= p.y + p.h) {
          drag = { id: p.mapId, dx: cx - p.x, dy: cy - p.y };
          selectedId = p.mapId;
          c.setPointerCapture(e.pointerId);
          c.style.cursor = 'grabbing';
          renderList(); renderSelected(); sizeAndDraw();
          return;
        }
      }
    });
    c.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const { sx, sy, scale } = layoutInfo(c);
      const cx = (e.offsetX - sx) / scale;
      const cy = (e.offsetY - sy) / scale;
      const p = canvasState.placements.find(pp => pp.mapId === drag.id);
      if (!p) return;
      p.x = Math.round(cx - drag.dx);
      p.y = Math.round(cy - drag.dy);
      sizeAndDraw();
      renderSelected();
    });
    const endDrag = (e) => {
      if (!drag) return;
      drag = null;
      c.style.cursor = 'grab';
      try { c.releasePointerCapture(e.pointerId); } catch {}
      queueSave();
      renderList();
    };
    c.addEventListener('pointerup', endDrag);
    c.addEventListener('pointercancel', endDrag);
  }

  function layoutInfo(c) {
    const cssW = c.clientWidth;
    const cssH = c.clientHeight;
    const scale = Math.min(cssW / canvasState.width, cssH / canvasState.height);
    const dw = canvasState.width * scale;
    const dh = canvasState.height * scale;
    return { sx: (cssW - dw) / 2, sy: (cssH - dh) / 2, scale, dw, dh };
  }

  function sizeAndDraw() {
    const c = root.querySelector('#om-canvas');
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    const cssW = c.clientWidth || 320;
    const ar = canvasState.height / canvasState.width;
    const cssH = Math.max(180, Math.min(560, Math.round(cssW * ar)));
    c.style.height = cssH + 'px';
    c.width  = Math.round(cssW * ratio);
    c.height = Math.round(cssH * ratio);
    const ctx = c.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    // Background letterbox
    ctx.fillStyle = '#0a1020';
    ctx.fillRect(0, 0, cssW, cssH);

    const { sx, sy, scale, dw, dh } = layoutInfo(c);
    ctx.fillStyle = canvasState.background || '#000';
    ctx.fillRect(sx, sy, dw, dh);

    // Render each placement, scaled into the visible canvas area
    for (const p of canvasState.placements) {
      const m = maps.find(mm => mm.id === p.mapId);
      if (!m) continue;
      const rw = p.w * scale;
      const rh = p.h * scale;
      const off = document.createElement('canvas');
      const dpr = 1;
      off.width  = Math.max(40, Math.round(rw * dpr));
      off.height = Math.max(40, Math.round(rh * dpr));
      const octx = off.getContext('2d');
      drawMap(octx, off, m);
      ctx.drawImage(off, sx + p.x * scale, sy + p.y * scale, rw, rh);

      // Selection outline
      if (p.mapId === selectedId) {
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(sx + p.x * scale + 1, sy + p.y * scale + 1, rw - 2, rh - 2);
        ctx.setLineDash([]);
      }
    }

    // Canvas border
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 0.5, sy + 0.5, dw - 1, dh - 1);

    root.querySelector('#om-status').textContent =
      `${canvasState.placements.length} map${canvasState.placements.length === 1 ? '' : 's'} on a ${canvasState.width} × ${canvasState.height} canvas`;
  }

  function exportPng() {
    const out = document.createElement('canvas');
    out.width = canvasState.width;
    out.height = canvasState.height;
    const ctx = out.getContext('2d');
    ctx.fillStyle = canvasState.background || '#000';
    ctx.fillRect(0, 0, out.width, out.height);

    for (const p of canvasState.placements) {
      const m = maps.find(mm => mm.id === p.mapId);
      if (!m) continue;
      const off = document.createElement('canvas');
      off.width  = Math.max(40, Math.round(p.w));
      off.height = Math.max(40, Math.round(p.h));
      drawMap(off.getContext('2d'), off, m);
      ctx.drawImage(off, p.x, p.y, p.w, p.h);
    }

    out.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(project.name || 'output-map').replace(/[^a-z0-9_-]+/gi, '_')}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, 'image/png');
  }

  mount();
  window.addEventListener('resize', sizeAndDraw, { passive: true });
}

const TO_MM = { m: 1000, cm: 10, mm: 1, ft: 304.8, in: 25.4 };
function toMM(v, u) { return Number(v || 0) * (TO_MM[u] || 1); }

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Pixel Designer v2 — mirrors the Windows desktop experience:
// multi-map subtabs, unit selector, expression-capable inputs, gradient/checker
// visual styles with live canvas preview, numbering & borders.

import {
  getActiveProject, updateActiveProject, updateActiveMap, newPixelMap,
  UNITS, GRADIENT_PALETTES, CHECKER_PALETTES, NUMBERING_STYLES,
  computeMap, drawMap,
} from '../state.js';
import { go } from '../router.js';

// Lightweight expression evaluator: allows "8", "4*2", "9/2", "100+20" in inputs.
function evalExpr(v) {
  if (v == null || v === '') return 0;
  const s = String(v).trim();
  if (/^[-+]?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (!/^[\d+\-*/().\s]+$/.test(s)) return Number(s) || 0;
  try { /* eslint-disable no-new-func */ return Function('"use strict";return (' + s + ')')() || 0; }
  catch { return 0; }
}

export async function render(root) {
  let project = await getActiveProject();
  if (!project) {
    root.innerHTML = `
      <div class="hero">
        <h2>No project open</h2>
        <p>Create or open a project to start designing.</p>
        <button class="btn btn-primary" id="d-go-projects">Go to Projects</button>
      </div>
    `;
    root.querySelector('#d-go-projects').addEventListener('click', () => go('projects'));
    return;
  }

  document.getElementById('app-title').textContent = project.name || 'Designer';

  let maps = project.data.pixelMaps;
  let activeId = project.data.activePixelMapId || maps[0].id;
  let activeMap = maps.find(m => m.id === activeId) || maps[0];

  // Debounce persistence so typing stays snappy.
  let saveTimer = null;
  const queueSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => { await updateActiveMap(() => activeMap); }, 180);
  };

  function mount() {
    root.innerHTML = `
      <div class="designer">
        <div class="map-tabs scroll-x" id="d-tabs">
          ${maps.map(m => `<button class="chip${m.id === activeId ? ' active' : ''}" data-id="${m.id}">${esc(m.name)}</button>`).join('')}
          <button class="chip chip-add" id="d-add">＋</button>
        </div>

        <div class="card preview-card">
          <canvas id="d-preview"></canvas>
          <div class="preview-stats" id="d-stats"></div>
        </div>

        <div class="card">
          <div class="field">
            <label>Map name</label>
            <input id="d-name" type="text" value="${escAttr(activeMap.name)}" />
          </div>
          <div class="row">
            <div class="field">
              <label>Screen width</label>
              <input id="d-sw" type="text" inputmode="decimal" value="${escAttr(activeMap.screenW)}" />
            </div>
            <div class="field">
              <label>Screen height</label>
              <input id="d-sh" type="text" inputmode="decimal" value="${escAttr(activeMap.screenH)}" />
            </div>
          </div>
          <div class="field">
            <label>Units</label>
            <div class="chip-row" id="d-unit">
              ${UNITS.map(u => `<button class="chip${u === activeMap.screenUnit ? ' active' : ''}" data-val="${u}">${u}</button>`).join('')}
            </div>
          </div>
          <div class="row">
            <div class="field">
              <label>Panel W (mm)</label>
              <input id="d-pw" type="number" inputmode="decimal" value="${escAttr(activeMap.panelW)}" />
            </div>
            <div class="field">
              <label>Panel H (mm)</label>
              <input id="d-ph" type="number" inputmode="decimal" value="${escAttr(activeMap.panelH)}" />
            </div>
          </div>
          <div class="row">
            <div class="field">
              <label>Panel res W (px)</label>
              <input id="d-prw" type="number" inputmode="numeric" value="${escAttr(activeMap.panelResW)}" />
            </div>
            <div class="field">
              <label>Panel res H (px)</label>
              <input id="d-prh" type="number" inputmode="numeric" value="${escAttr(activeMap.panelResH)}" />
            </div>
          </div>
          <div class="field">
            <label>Panel presets</label>
            <div class="chip-row scroll-x" id="d-panel-preset">
              ${PANEL_PRESETS.map(pr => `<button class="chip" data-val='${JSON.stringify(pr.v)}'>${pr.label}</button>`).join('')}
            </div>
          </div>
        </div>

        <div class="card">
          <h3>Visual style</h3>
          <div class="chip-row" id="d-style">
            <button class="chip${activeMap.visualStyle === 'checker' ? ' active' : ''}" data-val="checker">Checker</button>
            <button class="chip${activeMap.visualStyle === 'gradient' ? ' active' : ''}" data-val="gradient">Gradient</button>
          </div>
          <div id="d-style-body" style="margin-top:12px;"></div>
        </div>

        <div class="card">
          <h3>Numbering</h3>
          <label class="switch" style="margin-bottom:10px;">
            <input type="checkbox" id="d-num-show" ${activeMap.numbering.show ? 'checked' : ''} />
            <span>Show panel numbers</span>
          </label>
          <div class="field">
            <label>Style</label>
            <select id="d-num-style">
              ${NUMBERING_STYLES.map(s => `<option value="${s.id}"${s.id === activeMap.numbering.style ? ' selected' : ''}>${s.label}</option>`).join('')}
            </select>
          </div>
          <div class="row">
            <div class="field">
              <label>Color</label>
              <input id="d-num-color" type="color" value="${colorOnly(activeMap.numbering.color || '#ffffff')}" style="height:44px;" />
            </div>
            <div class="field">
              <label>Size: <b id="d-num-size-val">${activeMap.numbering.fontSize}</b></label>
              <input id="d-num-size" type="range" min="8" max="48" value="${activeMap.numbering.fontSize}" />
            </div>
          </div>
        </div>

        <div class="card">
          <h3>Borders</h3>
          <div class="row">
            <div class="field">
              <label>Color</label>
              <input id="d-br-color" type="color" value="${colorOnly(activeMap.border.color)}" style="height:44px;" />
            </div>
            <div class="field">
              <label>Thickness: <b id="d-br-thick-val">${activeMap.border.thickness}</b></label>
              <input id="d-br-thick" type="range" min="0" max="6" step="0.5" value="${activeMap.border.thickness}" />
            </div>
          </div>
          <div class="chip-row" id="d-br-style">
            ${['solid','dashed','dotted'].map(s => `<button class="chip${s === activeMap.border.style ? ' active' : ''}" data-val="${s}">${s}</button>`).join('')}
          </div>
        </div>

        <div class="card">
          <h3>Map actions</h3>
          <div class="row">
            <button class="btn btn-ghost" id="d-dupe">Duplicate</button>
            <button class="btn btn-danger" id="d-del"${maps.length === 1 ? ' disabled' : ''}>Delete</button>
          </div>
        </div>
      </div>
    `;

    wireTabs();
    wireInputs();
    renderStyleBody();
    redraw();
  }

  function renderStyleBody() {
    const box = root.querySelector('#d-style-body');
    if (activeMap.visualStyle === 'gradient') {
      const g = activeMap.gradient;
      box.innerHTML = `
        <div class="chip-row">
          <button class="chip${g.type === 'linear' ? ' active' : ''}" data-gtype="linear">Linear</button>
          <button class="chip${g.type === 'radial' ? ' active' : ''}" data-gtype="radial">Radial</button>
        </div>
        <div class="field" style="margin-top:10px;">
          <label>Palette</label>
          <div class="chip-row scroll-x">
            ${Object.keys(GRADIENT_PALETTES).map(name => `
              <button class="chip${name === g.palette ? ' active' : ''}" data-gpal="${name}">${name}</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <label>Angle: <b id="g-ang-val">${g.angle}°</b></label>
          <input id="g-ang" type="range" min="0" max="360" value="${g.angle}" />
        </div>
        <div class="row">
          <div class="field">
            <label>Color A</label>
            <input id="g-c1" type="color" value="${colorOnly(g.colors?.[0] || '#6366f1')}" style="height:44px;" />
          </div>
          <div class="field">
            <label>Color B</label>
            <input id="g-c2" type="color" value="${colorOnly(g.colors?.[g.colors.length - 1] || '#38bdf8')}" style="height:44px;" />
          </div>
        </div>
      `;
      box.querySelectorAll('[data-gtype]').forEach((b) => b.addEventListener('click', () => {
        activeMap.gradient.type = b.dataset.gtype; queueSave(); renderStyleBody(); redraw();
      }));
      box.querySelectorAll('[data-gpal]').forEach((b) => b.addEventListener('click', () => {
        const name = b.dataset.gpal;
        activeMap.gradient.palette = name;
        activeMap.gradient.colors = GRADIENT_PALETTES[name].slice();
        queueSave(); renderStyleBody(); redraw();
      }));
      const ang = box.querySelector('#g-ang');
      ang.addEventListener('input', () => {
        activeMap.gradient.angle = Number(ang.value);
        box.querySelector('#g-ang-val').textContent = ang.value + '°';
        redraw(); queueSave();
      });
      box.querySelector('#g-c1').addEventListener('input', (e) => {
        activeMap.gradient.colors[0] = e.target.value;
        activeMap.gradient.palette = 'Custom';
        redraw(); queueSave();
      });
      box.querySelector('#g-c2').addEventListener('input', (e) => {
        activeMap.gradient.colors[activeMap.gradient.colors.length - 1] = e.target.value;
        activeMap.gradient.palette = 'Custom';
        redraw(); queueSave();
      });
    } else {
      const c = activeMap.checker;
      box.innerHTML = `
        <div class="field">
          <label>Palette</label>
          <div class="chip-row scroll-x">
            ${Object.keys(CHECKER_PALETTES).map(name => `
              <button class="chip${name === c.palette ? ' active' : ''}" data-cpal="${name}">${name}</button>`).join('')}
          </div>
        </div>
        <div class="row">
          <div class="field">
            <label>Color A</label>
            <input id="c-c1" type="color" value="${colorOnly(c.colors[0])}" style="height:44px;" />
          </div>
          <div class="field">
            <label>Color B</label>
            <input id="c-c2" type="color" value="${colorOnly(c.colors[1])}" style="height:44px;" />
          </div>
        </div>
      `;
      box.querySelectorAll('[data-cpal]').forEach((b) => b.addEventListener('click', () => {
        const name = b.dataset.cpal;
        activeMap.checker.palette = name;
        activeMap.checker.colors = CHECKER_PALETTES[name].slice();
        queueSave(); renderStyleBody(); redraw();
      }));
      box.querySelector('#c-c1').addEventListener('input', (e) => {
        activeMap.checker.colors[0] = e.target.value; activeMap.checker.palette = 'Custom';
        redraw(); queueSave();
      });
      box.querySelector('#c-c2').addEventListener('input', (e) => {
        activeMap.checker.colors[1] = e.target.value; activeMap.checker.palette = 'Custom';
        redraw(); queueSave();
      });
    }
  }

  function wireTabs() {
    root.querySelectorAll('#d-tabs .chip[data-id]').forEach((chip) => {
      chip.addEventListener('click', () => {
        activeId = chip.dataset.id;
        activeMap = maps.find(m => m.id === activeId);
        updateActiveProject((p) => ({ ...p, data: { ...p.data, activePixelMapId: activeId } }));
        mount();
      });
    });
    root.querySelector('#d-add').addEventListener('click', async () => {
      const m = newPixelMap(`Pixel Map_${String(maps.length + 1).padStart(2, '0')}`);
      maps = [...maps, m];
      activeId = m.id; activeMap = m;
      await updateActiveProject((p) => ({
        ...p,
        data: { ...p.data, pixelMaps: maps, activePixelMapId: activeId },
      }));
      mount();
    });
  }

  function wireInputs() {
    const $ = (sel) => root.querySelector(sel);

    $('#d-name').addEventListener('input', (e) => {
      activeMap.name = e.target.value || 'Untitled';
      const tab = root.querySelector(`#d-tabs .chip[data-id="${activeId}"]`);
      if (tab) tab.textContent = activeMap.name;
      queueSave();
    });

    const bindNum = (sel, key, parser = evalExpr) => {
      $(sel).addEventListener('input', (e) => {
        activeMap[key] = parser(e.target.value);
        redraw(); queueSave();
      });
    };
    bindNum('#d-sw',  'screenW');
    bindNum('#d-sh',  'screenH');
    bindNum('#d-pw',  'panelW',  (v) => Number(v) || 0);
    bindNum('#d-ph',  'panelH',  (v) => Number(v) || 0);
    bindNum('#d-prw', 'panelResW', (v) => Number(v) || 0);
    bindNum('#d-prh', 'panelResH', (v) => Number(v) || 0);

    root.querySelectorAll('#d-unit .chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        activeMap.screenUnit = chip.dataset.val;
        root.querySelectorAll('#d-unit .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        redraw(); queueSave();
      });
    });

    root.querySelectorAll('#d-panel-preset .chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const v = JSON.parse(chip.dataset.val);
        Object.assign(activeMap, v);
        queueSave(); mount();
      });
    });

    root.querySelectorAll('#d-style .chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        activeMap.visualStyle = chip.dataset.val;
        queueSave(); mount();
      });
    });

    $('#d-num-show').addEventListener('change', (e) => { activeMap.numbering.show = e.target.checked; redraw(); queueSave(); });
    $('#d-num-style').addEventListener('change', (e) => { activeMap.numbering.style = e.target.value; redraw(); queueSave(); });
    $('#d-num-color').addEventListener('input', (e) => { activeMap.numbering.color = e.target.value; redraw(); queueSave(); });
    $('#d-num-size').addEventListener('input', (e) => {
      activeMap.numbering.fontSize = Number(e.target.value);
      $('#d-num-size-val').textContent = e.target.value;
      redraw(); queueSave();
    });

    $('#d-br-color').addEventListener('input', (e) => { activeMap.border.color = e.target.value; redraw(); queueSave(); });
    $('#d-br-thick').addEventListener('input', (e) => {
      activeMap.border.thickness = Number(e.target.value);
      $('#d-br-thick-val').textContent = e.target.value;
      redraw(); queueSave();
    });
    root.querySelectorAll('#d-br-style .chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        activeMap.border.style = chip.dataset.val;
        root.querySelectorAll('#d-br-style .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        redraw(); queueSave();
      });
    });

    $('#d-dupe').addEventListener('click', async () => {
      const copy = { ...structuredClone(activeMap), id: crypto.randomUUID(), name: activeMap.name + ' (copy)' };
      maps = [...maps, copy];
      activeId = copy.id; activeMap = copy;
      await updateActiveProject((p) => ({ ...p, data: { ...p.data, pixelMaps: maps, activePixelMapId: activeId } }));
      mount();
    });
    $('#d-del').addEventListener('click', async () => {
      if (maps.length <= 1) return;
      if (!confirm(`Delete "${activeMap.name}"?`)) return;
      maps = maps.filter(m => m.id !== activeId);
      activeId = maps[0].id; activeMap = maps[0];
      await updateActiveProject((p) => ({ ...p, data: { ...p.data, pixelMaps: maps, activePixelMapId: activeId } }));
      mount();
    });
  }

  function redraw() {
    const c = root.querySelector('#d-preview');
    if (!c) return;
    sizeCanvas(c);
    drawMap(c.getContext('2d'), c, activeMap);
    const comp = computeMap(activeMap);
    const stats = root.querySelector('#d-stats');
    if (stats) {
      stats.innerHTML = `
        <span><b>${comp.panelsX}×${comp.panelsY}</b> panels · <b>${comp.totalPanels}</b> total</span>
        <span><b>${comp.pxW.toLocaleString()} × ${comp.pxH.toLocaleString()}</b> px</span>
        <span>${(comp.actualWmm/1000).toFixed(2)}×${(comp.actualHmm/1000).toFixed(2)} m · ${comp.ratioText}</span>
      `;
    }
  }

  function sizeCanvas(c) {
    const box = c.parentElement.getBoundingClientRect();
    const w = Math.max(240, Math.floor(box.width - 28));
    c.width = w;
    c.height = Math.round(w * 9 / 16);
    c.style.width = '100%';
    c.style.height = 'auto';
  }

  window.addEventListener('resize', () => redraw(), { passive: true });

  mount();
}

// Common LED panel presets (mm @ native res)
const PANEL_PRESETS = [
  { label: 'P1.95 500×500',  v: { panelW: 500, panelH: 500, panelResW: 256, panelResH: 256 } },
  { label: 'P2.6  500×500',  v: { panelW: 500, panelH: 500, panelResW: 192, panelResH: 192 } },
  { label: 'P2.9  500×500',  v: { panelW: 500, panelH: 500, panelResW: 168, panelResH: 168 } },
  { label: 'P3.9  500×500',  v: { panelW: 500, panelH: 500, panelResW: 128, panelResH: 128 } },
  { label: 'P4.8  500×500',  v: { panelW: 500, panelH: 500, panelResW: 104, panelResH: 104 } },
  { label: 'P2.6  500×1000', v: { panelW: 500, panelH: 1000, panelResW: 192, panelResH: 384 } },
  { label: 'P3.9  500×1000', v: { panelW: 500, panelH: 1000, panelResW: 128, panelResH: 256 } },
];

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) { return esc(s); }
function colorOnly(v) {
  const m = String(v || '').match(/^#([0-9a-f]{6})/i);
  return m ? '#' + m[1] : '#ffffff';
}

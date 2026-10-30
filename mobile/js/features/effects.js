// Special Effects — overlays editor for the active pixel map.
// Mirrors the desktop "Special Effects & Details" tab: center cross/circle,
// corner markers, corner circles, color bars, coordinates display, info text.

import {
  getActiveProject, updateActiveMap, drawMap,
} from '../state.js';
import { go } from '../router.js';

export async function render(root) {
  const project = await getActiveProject();
  if (!project) {
    root.innerHTML = `
      <div class="hero">
        <h2>No project open</h2>
        <p>Create or open a project to add overlays and effects.</p>
        <button class="btn btn-primary" id="fx-go-projects">Go to Projects</button>
      </div>
    `;
    root.querySelector('#fx-go-projects').addEventListener('click', () => go('projects'));
    return;
  }
  document.getElementById('app-title').textContent = 'Special Effects';

  const maps = project.data.pixelMaps;
  let activeId = project.data.activePixelMapId || maps[0].id;
  let activeMap = maps.find(m => m.id === activeId) || maps[0];
  // Backfill effects on legacy maps
  if (!activeMap.effects) {
    activeMap.effects = {
      coordinates: false, centerCross: false, centerCircle: false,
      cornerMarkers: false, cornerCircles: false, colorBars: false,
      infoText: '', overlayColor: '#22d3ee', overlayWeight: 2,
    };
  }

  let saveTimer = null;
  const queueSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      await updateActiveMap(() => activeMap);
    }, 180);
  };

  function mount() {
    const fx = activeMap.effects;
    root.innerHTML = `
      <div class="map-tabs scroll-x" id="fx-tabs">
        ${maps.map(m => `<button class="chip${m.id === activeId ? ' active' : ''}" data-id="${m.id}">${esc(m.name)}</button>`).join('')}
      </div>

      <div class="card preview-card">
        <canvas id="fx-preview"></canvas>
        <p class="hint" style="margin:8px 0 0;">Live preview — toggle effects below to see changes.</p>
      </div>

      <div class="card">
        <h3>Quick toggles</h3>
        <div style="display:flex;gap:8px;margin-bottom:10px;">
          <button class="btn btn-secondary btn-sm" id="fx-all-on">Enable all</button>
          <button class="btn btn-ghost btn-sm" id="fx-all-off">Disable all</button>
        </div>
        ${switchRow('fx-coords',   'Coordinates (W × H)',         fx.coordinates)}
        ${switchRow('fx-cross',    'Center cross',                fx.centerCross)}
        ${switchRow('fx-circle',   'Center circle',               fx.centerCircle)}
        ${switchRow('fx-cornM',    'Corner markers (L brackets)', fx.cornerMarkers)}
        ${switchRow('fx-cornC',    'Corner circles',              fx.cornerCircles)}
        ${switchRow('fx-bars',     'Color bars (bottom)',         fx.colorBars)}
      </div>

      <div class="card">
        <h3>Overlay style</h3>
        <div class="row">
          <div class="field">
            <label>Color</label>
            <input id="fx-color" type="color" value="${(fx.overlayColor || '#22d3ee')}" style="height:44px;" />
          </div>
          <div class="field">
            <label>Weight: <b id="fx-w-val">${fx.overlayWeight}</b>px</label>
            <input id="fx-w" type="range" min="1" max="6" step="0.5" value="${fx.overlayWeight}" />
          </div>
        </div>
      </div>

      <div class="card">
        <h3>Info text</h3>
        <div class="field">
          <label>Text rendered top-left of the map</label>
          <input id="fx-text" type="text" maxlength="40" placeholder="e.g. Main Wall — DSP" value="${escAttr(fx.infoText || '')}" />
        </div>
      </div>

      <div class="card">
        <h3>Open in Designer</h3>
        <button class="btn btn-ghost" id="fx-to-designer">Edit map ${esc(activeMap.name)}</button>
      </div>
    `;

    wire();
    sizeAndDraw();
  }

  function switchRow(id, label, checked) {
    return `
      <label class="switch" style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:14px;">${label}</span>
        <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} />
      </label>
    `;
  }

  function wire() {
    root.querySelectorAll('#fx-tabs .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        activeId = chip.dataset.id;
        activeMap = maps.find(m => m.id === activeId);
        if (!activeMap.effects) {
          activeMap.effects = {
            coordinates: false, centerCross: false, centerCircle: false,
            cornerMarkers: false, cornerCircles: false, colorBars: false,
            infoText: '', overlayColor: '#22d3ee', overlayWeight: 2,
          };
        }
        mount();
      });
    });

    const bind = (id, key) => {
      const el = root.querySelector('#' + id);
      el.addEventListener('change', () => {
        activeMap.effects[key] = el.checked;
        queueSave(); sizeAndDraw();
      });
    };
    bind('fx-coords', 'coordinates');
    bind('fx-cross',  'centerCross');
    bind('fx-circle', 'centerCircle');
    bind('fx-cornM',  'cornerMarkers');
    bind('fx-cornC',  'cornerCircles');
    bind('fx-bars',   'colorBars');

    root.querySelector('#fx-all-on').addEventListener('click', () => {
      Object.assign(activeMap.effects, {
        coordinates: true, centerCross: true, centerCircle: true,
        cornerMarkers: true, cornerCircles: true, colorBars: true,
      });
      queueSave(); mount();
    });
    root.querySelector('#fx-all-off').addEventListener('click', () => {
      Object.assign(activeMap.effects, {
        coordinates: false, centerCross: false, centerCircle: false,
        cornerMarkers: false, cornerCircles: false, colorBars: false,
      });
      queueSave(); mount();
    });

    root.querySelector('#fx-color').addEventListener('input', (e) => {
      activeMap.effects.overlayColor = e.target.value;
      queueSave(); sizeAndDraw();
    });
    const wEl = root.querySelector('#fx-w');
    wEl.addEventListener('input', () => {
      activeMap.effects.overlayWeight = Number(wEl.value);
      root.querySelector('#fx-w-val').textContent = wEl.value;
      sizeAndDraw(); queueSave();
    });
    root.querySelector('#fx-text').addEventListener('input', (e) => {
      activeMap.effects.infoText = e.target.value;
      sizeAndDraw(); queueSave();
    });
    root.querySelector('#fx-to-designer').addEventListener('click', () => go('designer'));
  }

  function sizeAndDraw() {
    const c = root.querySelector('#fx-preview');
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    const cssW = c.clientWidth || 320;
    const cssH = Math.round(cssW * 0.5625);
    c.style.height = cssH + 'px';
    c.width  = Math.round(cssW * ratio);
    c.height = Math.round(cssH * ratio);
    const ctx = c.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawMap(ctx, { width: cssW, height: cssH }, activeMap);
  }

  mount();
  // Redraw if window resizes (e.g. orientation change)
  window.addEventListener('resize', sizeAndDraw, { passive: true });
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escAttr(s) { return esc(s); }

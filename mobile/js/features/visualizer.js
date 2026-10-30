// 2D Visualizer — mobile port.
// Load an image onto the wall, choose fit mode, optionally simulate pixel-pitch grid, export PNG.
// Accepts a ?id=<projectId> param to load the wall dimensions from a saved project.

import { listPixelMapViews, getPixelMapView } from '../state.js';
import { go } from '../router.js';

const fmt = (n, d = 2) => (isFinite(n) ? Number(n).toFixed(d) : '—');
const fmtInt = (n) => (isFinite(n) ? Math.round(n).toLocaleString() : '—');

export async function render(root, params = {}) {
  document.getElementById('app-title').textContent = '2D Visualizer';

  // Try to load a wall config: from ?id, else fallback to most recent pixel-map project,
  // else use a default demo wall.
  let wall = null; // {pxW, pxH, actualWmm, actualHmm, panelsX, panelsY, name}
  if (params.id) {
    const p = await getPixelMapView(params.id);
    if (p) wall = { ...p.data.computed, name: p.name, __id: p.id };
  }
  if (!wall) {
    const list = await listPixelMapViews();
    const first = list[0];
    if (first) wall = { ...first.data.computed, name: first.name, __id: first.id };
  }
  if (!wall) {
    wall = { pxW: 1920, pxH: 1080, actualWmm: 4000, actualHmm: 2250, panelsX: 0, panelsY: 0, name: 'Demo wall (16:9 HD)' };
  }

  const state = {
    fit: 'cover',      // 'cover' | 'contain' | 'stretch'
    showGrid: wall.panelsX > 0,
    bg: '#000000',
    img: null,         // HTMLImageElement
    imgName: '',
  };

  root.innerHTML = `
    <h2>2D Visualizer</h2>
    <p>See how content will look on your LED wall. Save as PNG at native resolution.</p>

    <div class="card">
      <h3>Wall</h3>
      <div class="kv-row mono" style="font-size:13px;">
        <div>Source: <b>${escapeHtml(wall.name || 'Demo')}</b></div>
        <div>Resolution: <b>${fmtInt(wall.pxW)} × ${fmtInt(wall.pxH)} px</b></div>
        <div>Aspect: <b>${fmt(wall.pxW / wall.pxH, 3)} : 1</b></div>
        ${wall.panelsX ? `<div>Panels: <b>${wall.panelsX} × ${wall.panelsY}</b></div>` : ''}
      </div>
      <button class="btn btn-ghost" id="vz-pick-project" style="margin-top:10px;">Change wall</button>
    </div>

    <div class="card">
      <h3>Content</h3>
      <button class="btn btn-primary" id="vz-load">Load image</button>
      <input id="vz-file" type="file" accept="image/*" style="display:none;" />
      <p class="hint" id="vz-img-name" style="min-height:16px;"></p>
      <div class="field" style="margin-top:10px;">
        <label>Fit</label>
        <div class="chip-row" id="vz-fit">
          <button class="chip active" data-val="cover">Cover</button>
          <button class="chip" data-val="contain">Contain</button>
          <button class="chip" data-val="stretch">Stretch</button>
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label>Background</label>
          <input type="color" id="vz-bg" value="${state.bg}" style="height:44px;" />
        </div>
        <div class="field">
          <label>Panel grid</label>
          <div class="chip-row" id="vz-grid">
            <button class="chip${state.showGrid ? ' active' : ''}" data-val="1">On</button>
            <button class="chip${!state.showGrid ? ' active' : ''}" data-val="0">Off</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Preview</h3>
      <canvas id="vz-canvas" style="width:100%; height:auto; border:1px solid var(--border); border-radius:12px; background:#000; display:block;"></canvas>
      <p class="hint mono" id="vz-stats" style="margin-top:6px;"></p>
    </div>

    <div class="card">
      <h3>Export</h3>
      <button class="btn btn-primary" id="vz-export">Save PNG (${fmtInt(wall.pxW)} × ${fmtInt(wall.pxH)})</button>
      <p class="hint" id="vz-export-msg" style="min-height:16px;"></p>
    </div>
  `;

  const els = {
    pickBtn:  root.querySelector('#vz-pick-project'),
    loadBtn:  root.querySelector('#vz-load'),
    fileEl:   root.querySelector('#vz-file'),
    imgName:  root.querySelector('#vz-img-name'),
    fitRow:   root.querySelector('#vz-fit'),
    bgEl:     root.querySelector('#vz-bg'),
    gridRow:  root.querySelector('#vz-grid'),
    canvas:   root.querySelector('#vz-canvas'),
    stats:    root.querySelector('#vz-stats'),
    exportBtn:root.querySelector('#vz-export'),
    exportMsg:root.querySelector('#vz-export-msg'),
  };

  // Preview canvas sized to a mobile-friendly width; render at wall aspect ratio.
  function sizePreview() {
    const box = els.canvas.parentElement.getBoundingClientRect();
    const targetW = Math.min(640, Math.max(280, Math.floor(box.width - 28)));
    const targetH = Math.round(targetW * (wall.pxH / wall.pxW));
    els.canvas.width = targetW;
    els.canvas.height = targetH;
    els.canvas.style.height = targetH + 'px';
  }

  function drawInto(ctx, W, H) {
    ctx.save();
    ctx.fillStyle = state.bg;
    ctx.fillRect(0, 0, W, H);

    if (state.img) {
      const img = state.img;
      let dx = 0, dy = 0, dw = W, dh = H;
      const wallAspect = W / H;
      const imgAspect = img.width / img.height;
      if (state.fit === 'contain') {
        if (imgAspect > wallAspect) { dw = W; dh = W / imgAspect; dy = (H - dh) / 2; }
        else                         { dh = H; dw = H * imgAspect; dx = (W - dw) / 2; }
      } else if (state.fit === 'cover') {
        if (imgAspect > wallAspect) { dh = H; dw = H * imgAspect; dx = (W - dw) / 2; }
        else                         { dw = W; dh = W / imgAspect; dy = (H - dh) / 2; }
      } // stretch uses default dw,dh
      ctx.drawImage(img, dx, dy, dw, dh);
    }

    if (state.showGrid && wall.panelsX > 0 && wall.panelsY > 0) {
      const cw = W / wall.panelsX;
      const ch = H / wall.panelsY;
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < wall.panelsX; i++) { ctx.moveTo(i * cw, 0); ctx.lineTo(i * cw, H); }
      for (let j = 1; j < wall.panelsY; j++) { ctx.moveTo(0, j * ch); ctx.lineTo(W, j * ch); }
      ctx.stroke();
    }
    ctx.restore();
  }

  function redraw() {
    sizePreview();
    const ctx = els.canvas.getContext('2d');
    drawInto(ctx, els.canvas.width, els.canvas.height);
    els.stats.textContent = state.img
      ? `Source image: ${state.img.width} × ${state.img.height} px · Fit: ${state.fit}`
      : `No image loaded — background only.`;
  }

  // Wiring
  els.loadBtn.addEventListener('click', () => els.fileEl.click());
  els.fileEl.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    state.imgName = file.name;
    els.imgName.textContent = `Loaded: ${file.name}`;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      state.img = img;
      URL.revokeObjectURL(url);
      redraw();
    };
    img.onerror = () => {
      els.imgName.textContent = 'Failed to load image.';
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });

  els.fitRow.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      els.fitRow.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.fit = chip.dataset.val;
      redraw();
    });
  });
  els.gridRow.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      els.gridRow.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.showGrid = chip.dataset.val === '1';
      redraw();
    });
  });
  els.bgEl.addEventListener('input', () => { state.bg = els.bgEl.value; redraw(); });

  els.pickBtn.addEventListener('click', async () => {
    const list = await listProjects();
    const pmaps = list.filter(p => p?.data?.kind === 'pixel-map');
    if (!pmaps.length) {
      alert('No saved pixel-map projects yet. Create one in the Pixel Designer.');
      return;
    }
    const options = pmaps.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
    const pick = prompt(`Type a number to choose a wall:\n\n${options}`);
    const idx = Number(pick) - 1;
    if (pmaps[idx]) go('visualizer', { id: pmaps[idx].id });
  });

  els.exportBtn.addEventListener('click', () => {
    try {
      const off = document.createElement('canvas');
      off.width = Math.max(1, Math.round(wall.pxW));
      off.height = Math.max(1, Math.round(wall.pxH));
      const ctx = off.getContext('2d');
      drawInto(ctx, off.width, off.height);
      off.toBlob((blob) => {
        if (!blob) { els.exportMsg.textContent = 'Export failed.'; return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safe = (wall.name || 'wall').replace(/[^\w.-]+/g, '_');
        a.download = `${safe}_${off.width}x${off.height}.png`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        els.exportMsg.textContent = `Saved ${off.width} × ${off.height} PNG.`;
      }, 'image/png');
    } catch (err) {
      els.exportMsg.textContent = `Export failed: ${err.message || err}`;
    }
  });

  window.addEventListener('resize', redraw, { passive: true });
  redraw();
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

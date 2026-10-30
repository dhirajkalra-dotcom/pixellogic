// Active-project state helpers — layers on top of db.js (IndexedDB).
// A Project has this shape:
// {
//   id, name, status: 'draft' | 'saved',
//   created, updated,
//   data: {
//     kind: 'project',
//     meta: { eventDate, eventTime, client, venue, salesperson, location },
//     activePixelMapId,
//     pixelMaps: [PixelMap]
//   }
// }
//
// A PixelMap:
// {
//   id, name,
//   screenW, screenH, screenUnit,        // 'm' | 'cm' | 'mm' | 'ft' | 'in'
//   panelW, panelH,                      // mm
//   panelResW, panelResH,                // px
//   visualStyle: 'checker' | 'gradient',
//   gradient: { type, palette, angle, colors[] },
//   checker:  { palette, colors[2] },
//   numbering: { show, style, color, fontSize },
//   border:   { color, thickness, style }
// }

import { getProject, saveProject, listProjects, kvGet, kvSet } from './db.js';

export const UNITS = ['m', 'cm', 'mm', 'ft', 'in'];
export const TO_MM = { m: 1000, cm: 10, mm: 1, ft: 304.8, in: 25.4 };
export const toMM = (v, u) => Number(v || 0) * (TO_MM[u] || 1);

export const GRADIENT_PALETTES = {
  Sunrise:  ['#fbbf24', '#f97316', '#ef4444'],
  Ocean:    ['#0ea5e9', '#6366f1'],
  Passion:  ['#ec4899', '#8b5cf6'],
  Forest:   ['#22c55e', '#065f46'],
  Amethyst: ['#a78bfa', '#ec4899'],
  Custom:   ['#6366f1', '#38bdf8'],
};

export const CHECKER_PALETTES = {
  Classic:    ['#4b5563', '#1f2937'],
  Monochrome: ['#ffffff', '#000000'],
  Earth:      ['#92400e', '#57534e'],
  Oceanic:    ['#0891b2', '#1e3a8a'],
  Sunset:     ['#f97316', '#7c2d12'],
  Rainbow:    ['#ef4444', '#3b82f6'],
  Neon:       ['#a3e635', '#22d3ee'],
};

export const NUMBERING_STYLES = [
  { id: 'sequential', label: '1, 2, 3…' },
  { id: 'rowcol',     label: 'R1C1, R1C2…' },
  { id: 'colrow',     label: 'C1R1, C2R1…' },
  { id: 'rowletter',  label: 'A1, A2, B1…' },
  { id: 'colletter',  label: 'A1, B1, A2…' },
];

export function newPixelMap(name = 'Pixel Map_01') {
  return {
    id: crypto.randomUUID(),
    name,
    screenW: 2, screenH: 2, screenUnit: 'm',
    panelW: 500, panelH: 500,
    panelResW: 128, panelResH: 128,
    visualStyle: 'checker',
    gradient: { type: 'linear', palette: 'Ocean', angle: 90, colors: GRADIENT_PALETTES.Ocean.slice() },
    checker:  { palette: 'Classic', colors: CHECKER_PALETTES.Classic.slice() },
    numbering:{ show: true, style: 'sequential', color: '#ffffff', fontSize: 22 },
    border:   { color: '#a5b4fc', thickness: 2, style: 'solid' },
    effects:  {
      coordinates:   false,
      centerCross:   false,
      centerCircle:  false,
      cornerMarkers: false,
      cornerCircles: false,
      colorBars:     false,
      infoText:      '',
      overlayColor:  '#22d3ee',
      overlayWeight: 2,
    },
  };
}

export function newProject(name = 'Untitled Project') {
  const map = newPixelMap();
  return {
    name,
    status: 'draft',
    data: {
      kind: 'project',
      meta: { eventDate: '', eventTime: '', client: '', venue: '', salesperson: '', location: '' },
      activePixelMapId: map.id,
      pixelMaps: [map],
    },
  };
}

// Migrate legacy {kind:'pixel-map'} records into the new project shape on read.
export function migrateLegacy(record) {
  if (!record?.data) return record;
  if (record.data.kind === 'project') return record;
  if (record.data.kind === 'pixel-map') {
    const old = record.data;
    const map = newPixelMap(record.name || 'Imported Map');
    if (old.panel) {
      map.panelW = old.panel.w ?? map.panelW;
      map.panelH = old.panel.h ?? map.panelH;
      map.panelResW = old.panel.resW ?? map.panelResW;
      map.panelResH = old.panel.resH ?? map.panelResH;
    }
    if (old.wall) {
      map.screenW = old.wall.w ?? map.screenW;
      map.screenH = old.wall.h ?? map.screenH;
      map.screenUnit = old.wall.unit ?? map.screenUnit;
    }
    return {
      ...record,
      data: {
        kind: 'project',
        meta: { eventDate: '', eventTime: '', client: '', venue: '', salesperson: '', location: '' },
        activePixelMapId: map.id,
        pixelMaps: [map],
      },
    };
  }
  return record;
}

export async function listAllProjects() {
  const rows = await listProjects();
  return rows.map(migrateLegacy);
}

// Legacy-shape view: returns one record per pixel map across all projects, shaped
// like the old `pixel-map` records so Visualizer / Patching / PDF keep working.
export async function listPixelMapViews() {
  const projects = await listAllProjects();
  const out = [];
  for (const p of projects) {
    for (const m of (p.data.pixelMaps || [])) {
      const comp = computeMap(m);
      out.push({
        id: `${p.id}::${m.id}`,
        projectId: p.id,
        mapId: m.id,
        name: `${p.name} · ${m.name}`,
        status: p.status,
        updated: p.updated,
        data: {
          kind: 'pixel-map',
          panel: { w: m.panelW, h: m.panelH, resW: m.panelResW, resH: m.panelResH },
          screen: { w: m.screenW, h: m.screenH, unit: m.screenUnit },
          computed: { ...comp, name: `${p.name} · ${m.name}` },
        },
      });
    }
  }
  return out;
}

export async function getPixelMapView(combinedId) {
  if (!combinedId) return null;
  const [projectId, mapId] = String(combinedId).split('::');
  const p = await getProject(projectId);
  if (!p) return null;
  const mig = migrateLegacy(p);
  const m = (mig.data.pixelMaps || []).find(x => x.id === mapId);
  if (!m) return null;
  const comp = computeMap(m);
  return {
    id: combinedId,
    projectId, mapId,
    name: `${mig.name} · ${m.name}`,
    data: {
      kind: 'pixel-map',
      panel: { w: m.panelW, h: m.panelH, resW: m.panelResW, resH: m.panelResH },
      screen: { w: m.screenW, h: m.screenH, unit: m.screenUnit },
      computed: { ...comp, name: `${mig.name} · ${m.name}` },
    },
  };
}

export async function getActiveProjectId() {
  return await kvGet('activeProjectId');
}
export async function setActiveProjectId(id) {
  return await kvSet('activeProjectId', id || null);
}
export async function getActiveProject() {
  const id = await getActiveProjectId();
  if (!id) return null;
  const raw = await getProject(id);
  return raw ? migrateLegacy(raw) : null;
}

export async function createProject(name, meta = {}) {
  const tmpl = newProject(name);
  Object.assign(tmpl.data.meta, meta);
  const saved = await saveProject(tmpl);
  await setActiveProjectId(saved.id);
  return saved;
}

export async function updateProject(id, updater) {
  const current = await getProject(id);
  if (!current) throw new Error('Project not found');
  const migrated = migrateLegacy(current);
  const next = typeof updater === 'function' ? updater(migrated) : { ...migrated, ...updater };
  return await saveProject(next);
}

// Convenient active-project mutators:
export async function updateActiveProject(updater) {
  const id = await getActiveProjectId();
  if (!id) throw new Error('No active project');
  return await updateProject(id, updater);
}

export async function updateActiveMap(updater) {
  const id = await getActiveProjectId();
  if (!id) throw new Error('No active project');
  return await updateProject(id, (p) => {
    const maps = p.data.pixelMaps.map((m) =>
      m.id === p.data.activePixelMapId ? (typeof updater === 'function' ? updater(m) : { ...m, ...updater }) : m
    );
    return { ...p, data: { ...p.data, pixelMaps: maps } };
  });
}

// Compute derived geometry for a pixel map.
export function computeMap(m) {
  const wmm = toMM(m.screenW, m.screenUnit);
  const hmm = toMM(m.screenH, m.screenUnit);
  const panelsX = Math.max(1, Math.floor(wmm / m.panelW) || 1);
  const panelsY = Math.max(1, Math.floor(hmm / m.panelH) || 1);
  const totalPanels = panelsX * panelsY;
  const actualWmm = panelsX * m.panelW;
  const actualHmm = panelsY * m.panelH;
  const pxW = panelsX * m.panelResW;
  const pxH = panelsY * m.panelResH;
  const totalPx = pxW * pxH;
  const pitchW = m.panelResW ? m.panelW / m.panelResW : 0;
  const pitchH = m.panelResH ? m.panelH / m.panelResH : 0;
  const diagMm = Math.hypot(actualWmm, actualHmm);
  const areaM2 = (actualWmm * actualHmm) / 1e6;
  const g = Math.max(1, gcd(Math.round(actualWmm), Math.round(actualHmm)));
  const ratioText = `${Math.round(actualWmm / g)}:${Math.round(actualHmm / g)}`;
  return { panelsX, panelsY, totalPanels, actualWmm, actualHmm, pxW, pxH, totalPx, pitchW, pitchH, diagMm, areaM2, ratioText };
}

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

// Numbering helper: produces label for panel at (col, row).
export function panelLabel(style, col, row, panelsX, panelsY) {
  const c = col + 1, r = row + 1;
  switch (style) {
    case 'sequential': return String(r * panelsX + c - panelsX); // row-major
    case 'rowcol':     return `R${r}C${c}`;
    case 'colrow':     return `C${c}R${r}`;
    case 'rowletter':  return `${letter(r)}${c}`;
    case 'colletter':  return `${letter(c)}${r}`;
    default:           return String(r * panelsX + c - panelsX);
  }
}
function letter(n) {
  let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s || 'A';
}

// Draw a pixel map to a canvas. Fills the canvas at its current width/height.
export function drawMap(ctx, c /*canvas*/, m) {
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);

  const comp = computeMap(m);
  const wallW = Math.max(1, comp.actualWmm);
  const wallH = Math.max(1, comp.actualHmm);
  const aspect = wallW / wallH;

  // Fit wall into canvas with 8% padding
  const PAD = 12;
  let dw = W - PAD * 2;
  let dh = dw / aspect;
  if (dh > H - PAD * 2) { dh = H - PAD * 2; dw = dh * aspect; }
  const x0 = (W - dw) / 2;
  const y0 = (H - dh) / 2;
  const cw = dw / comp.panelsX;
  const ch = dh / comp.panelsY;

  // Background frame
  ctx.fillStyle = 'rgba(15,23,42,0.6)';
  ctx.fillRect(0, 0, W, H);

  // Draw panels
  for (let r = 0; r < comp.panelsY; r++) {
    for (let col = 0; col < comp.panelsX; col++) {
      const px = x0 + col * cw;
      const py = y0 + r * ch;
      fillPanel(ctx, px, py, cw, ch, col, r, comp, m);
      drawBorder(ctx, px, py, cw, ch, m.border);
      if (m.numbering?.show) drawLabel(ctx, px, py, cw, ch, col, r, comp, m);
    }
  }
  // Outer outline
  ctx.strokeStyle = '#a5b4fc';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x0, y0, dw, dh);

  // Special effects overlay
  if (m.effects) drawEffects(ctx, x0, y0, dw, dh, m.effects, comp);
}

function drawEffects(ctx, x0, y0, w, h, fx, comp) {
  const cx = x0 + w / 2;
  const cy = y0 + h / 2;
  const stroke = fx.overlayColor || '#22d3ee';
  const lw = Math.max(1, Number(fx.overlayWeight) || 2);

  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.shadowColor = stroke;
  ctx.shadowBlur = 4;

  if (fx.centerCross) {
    const len = Math.min(w, h) * 0.18;
    ctx.beginPath();
    ctx.moveTo(cx - len, cy); ctx.lineTo(cx + len, cy);
    ctx.moveTo(cx, cy - len); ctx.lineTo(cx, cy + len);
    ctx.stroke();
  }
  if (fx.centerCircle) {
    const r = Math.min(w, h) * 0.22;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (fx.cornerMarkers) {
    const len = Math.min(w, h) * 0.10;
    const corners = [
      [x0, y0, 1, 1], [x0 + w, y0, -1, 1],
      [x0, y0 + h, 1, -1], [x0 + w, y0 + h, -1, -1],
    ];
    corners.forEach(([px, py, sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(px, py + sy * len); ctx.lineTo(px, py); ctx.lineTo(px + sx * len, py);
      ctx.stroke();
    });
  }
  if (fx.cornerCircles) {
    const r = Math.min(w, h) * 0.05;
    [[x0, y0], [x0 + w, y0], [x0, y0 + h], [x0 + w, y0 + h]].forEach(([px, py]) => {
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
  ctx.shadowBlur = 0;

  if (fx.colorBars) {
    const bands = ['#ffffff','#ffff00','#00ffff','#00ff00','#ff00ff','#ff0000','#0000ff','#000000'];
    const bw = w / bands.length;
    const bh = h * 0.10;
    bands.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x0 + i * bw, y0 + h - bh, bw, bh);
    });
    ctx.globalAlpha = 1;
  }

  if (fx.coordinates) {
    const fs = Math.max(9, Math.min(14, w / 38));
    ctx.font = `600 ${fs}px ui-monospace, monospace`;
    ctx.fillStyle = stroke;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`(${comp.pxW} x ${comp.pxH})`, x0 + w - 4, y0 + 4);
  }

  if (fx.infoText) {
    const fs = Math.max(10, Math.min(15, w / 36));
    ctx.font = `700 ${fs}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = stroke;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(String(fx.infoText).slice(0, 40), x0 + 6, y0 + 6);
  }
  ctx.restore();
}

function fillPanel(ctx, x, y, w, h, col, row, comp, m) {
  if (m.visualStyle === 'gradient') {
    const g = m.gradient;
    const cols = (g.colors && g.colors.length) ? g.colors : ['#6366f1', '#38bdf8'];
    // Build a gradient over the WHOLE wall (based on this panel's position inside it).
    const wallX = x - (col * w);
    const wallY = y - (row * h);
    const wallW = w * comp.panelsX;
    const wallH = h * comp.panelsY;
    let grad;
    if (g.type === 'radial') {
      const cx = wallX + wallW / 2, cy = wallY + wallH / 2;
      const r = Math.hypot(wallW, wallH) / 2;
      grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    } else {
      const ang = ((g.angle || 0) * Math.PI) / 180;
      const cx = wallX + wallW / 2, cy = wallY + wallH / 2;
      const len = Math.abs(Math.cos(ang)) * wallW + Math.abs(Math.sin(ang)) * wallH;
      const dx = Math.cos(ang) * len / 2, dy = Math.sin(ang) * len / 2;
      grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    }
    cols.forEach((c, i) => grad.addColorStop(i / Math.max(1, cols.length - 1), c));
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = grad;
    ctx.fillRect(wallX, wallY, wallW, wallH);
    ctx.restore();
  } else {
    // Checker
    const [a, b] = m.checker?.colors?.length >= 2 ? m.checker.colors : ['#4b5563', '#1f2937'];
    ctx.fillStyle = ((col + row) % 2 === 0) ? a : b;
    ctx.fillRect(x, y, w, h);
  }
}

function drawBorder(ctx, x, y, w, h, border) {
  if (!border || !border.thickness) return;
  ctx.strokeStyle = border.color || '#a5b4fc';
  ctx.lineWidth = Math.max(0.5, Math.min(6, border.thickness * 0.5));
  if (border.style === 'dashed')      ctx.setLineDash([6, 4]);
  else if (border.style === 'dotted') ctx.setLineDash([2, 3]);
  else                                ctx.setLineDash([]);
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.setLineDash([]);
}

function drawLabel(ctx, x, y, w, h, col, row, comp, m) {
  const label = panelLabel(m.numbering.style, col, row, comp.panelsX, comp.panelsY);
  const fs = Math.max(8, Math.min(24, (m.numbering.fontSize || 20) * Math.min(w, h) / 100));
  ctx.fillStyle = m.numbering.color || '#fff';
  ctx.font = `600 ${fs.toFixed(1)}px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
}

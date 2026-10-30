// LED Patching — mobile port (simplified).
// Rather than a React-Flow node graph (hard on touch), this gives a form-based patching
// plan: pick processor + LED map, compute ports needed, panels/daisy-chain per port, and
// a visual of which panels go to which port.

import { listPixelMapViews, getPixelMapView } from '../state.js';
import { go } from '../router.js';

const fmtInt = (n) => (isFinite(n) ? Math.round(n).toLocaleString() : '—');

// Max pixels per port (data-sheet approx). Ports are gigabit unless noted.
const PROCESSORS = [
  { brand: 'Brompton',  model: 'SX40 / S4',   ports: 4,  maxPxPerPort: 2_300_000 },
  { brand: 'Brompton',  model: 'Tessera SX40',ports: 4,  maxPxPerPort: 2_300_000 },
  { brand: 'Novastar',  model: 'MX40 Pro',    ports: 16, maxPxPerPort: 650_000  },
  { brand: 'Novastar',  model: 'VX1000',      ports: 10, maxPxPerPort: 650_000  },
  { brand: 'Novastar',  model: 'MCTRL4K',     ports: 4,  maxPxPerPort: 2_300_000 },
  { brand: 'Colorlight',model: 'Z6 Pro',      ports: 20, maxPxPerPort: 650_000  },
  { brand: 'Colorlight',model: 'X16',         ports: 16, maxPxPerPort: 650_000  },
  { brand: 'Megapixel', model: 'HELIOS',      ports: 8,  maxPxPerPort: 2_300_000 },
];

export async function render(root) {
  document.getElementById('app-title').textContent = 'LED Patching';

  const saved = await listPixelMapViews();

  const state = {
    projectId: saved[0]?.id || '',
    // Fallback manual mode
    panelsX: 8, panelsY: 4,
    resW: 128, resH: 128,
    procIndex: 0,
    useManual: saved.length === 0,
  };

  root.innerHTML = `
    <h2>LED Patching</h2>
    <p>Choose a processor and your LED map — get the port count, panels-per-port grouping, and total bandwidth.</p>

    <div class="card">
      <h3>LED map source</h3>
      <div class="chip-row" id="pt-source">
        <button class="chip${!state.useManual ? ' active' : ''}" data-val="project" ${saved.length === 0 ? 'disabled' : ''}>From saved project</button>
        <button class="chip${ state.useManual ? ' active' : ''}" data-val="manual">Manual</button>
      </div>

      <div id="pt-project-wrap" style="margin-top:10px; display:${state.useManual ? 'none' : ''};">
        <div class="field">
          <label for="pt-project">Project</label>
          <select id="pt-project">
            ${saved.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <p class="hint" id="pt-project-info"></p>
      </div>

      <div id="pt-manual-wrap" style="margin-top:10px; display:${state.useManual ? '' : 'none'};">
        <div class="row">
          <div class="field">
            <label for="pt-panelsX">Panels across</label>
            <input id="pt-panelsX" type="number" inputmode="numeric" min="1" value="${state.panelsX}" />
          </div>
          <div class="field">
            <label for="pt-panelsY">Panels down</label>
            <input id="pt-panelsY" type="number" inputmode="numeric" min="1" value="${state.panelsY}" />
          </div>
        </div>
        <div class="row">
          <div class="field">
            <label for="pt-resW">Panel res W (px)</label>
            <input id="pt-resW" type="number" inputmode="numeric" min="1" value="${state.resW}" />
          </div>
          <div class="field">
            <label for="pt-resH">Panel res H (px)</label>
            <input id="pt-resH" type="number" inputmode="numeric" min="1" value="${state.resH}" />
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Processor</h3>
      <div class="field">
        <label for="pt-proc">Model</label>
        <select id="pt-proc">
          ${PROCESSORS.map((p, i) => `<option value="${i}">${p.brand} · ${p.model} (${p.ports} ports · ${fmtInt(p.maxPxPerPort)} px/port)</option>`).join('')}
        </select>
      </div>
    </div>

    <div id="pt-results"></div>

    <div class="card">
      <h3>Port assignment</h3>
      <svg id="pt-svg" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid meet"
           style="width:100%; height:auto; background:rgba(15,23,42,0.6); border:1px solid var(--border); border-radius:12px;"></svg>
      <p class="hint">Each color = one processor port. Columns are grouped left→right to minimise cable runs.</p>
    </div>
  `;

  const els = {
    sourceRow: root.querySelector('#pt-source'),
    projWrap:  root.querySelector('#pt-project-wrap'),
    manualWrap:root.querySelector('#pt-manual-wrap'),
    projSel:   root.querySelector('#pt-project'),
    projInfo:  root.querySelector('#pt-project-info'),
    panelsX:   root.querySelector('#pt-panelsX'),
    panelsY:   root.querySelector('#pt-panelsY'),
    resW:      root.querySelector('#pt-resW'),
    resH:      root.querySelector('#pt-resH'),
    procSel:   root.querySelector('#pt-proc'),
    results:   root.querySelector('#pt-results'),
    svg:       root.querySelector('#pt-svg'),
  };

  async function resolveMap() {
    if (!state.useManual && state.projectId) {
      const p = await getPixelMapView(state.projectId);
      const d = p?.data;
      if (d?.kind === 'pixel-map' && d.computed && d.panel) {
        els.projInfo.textContent = `${d.computed.panelsX}×${d.computed.panelsY} panels · ${fmtInt(d.computed.pxW)}×${fmtInt(d.computed.pxH)} px`;
        return {
          panelsX: d.computed.panelsX, panelsY: d.computed.panelsY,
          resW: d.panel.resW, resH: d.panel.resH,
          totalPx: d.computed.totalPx,
          pxW: d.computed.pxW, pxH: d.computed.pxH,
        };
      }
    }
    const pxW = state.panelsX * state.resW;
    const pxH = state.panelsY * state.resH;
    return {
      panelsX: state.panelsX, panelsY: state.panelsY,
      resW: state.resW, resH: state.resH,
      totalPx: pxW * pxH,
      pxW, pxH,
    };
  }

  function computePlan(map, proc) {
    const pxPerPanel = map.resW * map.resH;
    const panelsPerPort = Math.max(1, Math.floor(proc.maxPxPerPort / pxPerPanel));
    const totalPanels = map.panelsX * map.panelsY;
    const portsNeeded = Math.ceil(totalPanels / panelsPerPort);
    const processorsNeeded = Math.ceil(portsNeeded / proc.ports);

    // Group by columns: panelsPerColumn = panelsY; columns per port = panelsPerPort / panelsY (min 1).
    const colsPerPort = Math.max(1, Math.floor(panelsPerPort / map.panelsY));
    // If a single column exceeds the port budget (tall walls), fall back to row-based grouping.
    let strategy = 'columns';
    let panelsInLastGroup = 0;
    let portAssignments = [];
    if (colsPerPort >= 1 && map.panelsY <= panelsPerPort) {
      // column strategy
      let port = 0;
      for (let x = 0; x < map.panelsX; x += colsPerPort) {
        const xEnd = Math.min(map.panelsX, x + colsPerPort);
        portAssignments.push({ port: port++, xStart: x, xEnd, yStart: 0, yEnd: map.panelsY });
      }
    } else {
      strategy = 'rows';
      const rowsPerPort = Math.max(1, Math.floor(panelsPerPort / map.panelsX));
      let port = 0;
      for (let y = 0; y < map.panelsY; y += rowsPerPort) {
        const yEnd = Math.min(map.panelsY, y + rowsPerPort);
        portAssignments.push({ port: port++, xStart: 0, xEnd: map.panelsX, yStart: y, yEnd });
      }
    }

    // Bandwidth (bits/sec) — 24-bit color × 60 fps (typical).
    const bitsPerSec = map.totalPx * 24 * 60;
    return {
      pxPerPanel, panelsPerPort, portsNeeded, processorsNeeded,
      strategy, portAssignments, bitsPerSec,
    };
  }

  function paintResults(map, proc, plan) {
    const utilWorst = Math.min(1, plan.panelsPerPort * map.resW * map.resH / proc.maxPxPerPort);
    const mbps = plan.bitsPerSec / 1e6;

    els.results.innerHTML = `
      <div class="result">
        <div class="big">${plan.portsNeeded} port${plan.portsNeeded === 1 ? '' : 's'} · ${plan.processorsNeeded} processor${plan.processorsNeeded === 1 ? '' : 's'}</div>
        <div class="kv"><span>Processor</span><b>${proc.brand} · ${proc.model}</b></div>
        <div class="kv"><span>Panels total</span><b>${fmtInt(map.panelsX * map.panelsY)} (${map.panelsX} × ${map.panelsY})</b></div>
        <div class="kv"><span>Pixels/panel</span><b>${fmtInt(plan.pxPerPanel)}</b></div>
        <div class="kv"><span>Panels / port (max)</span><b>${fmtInt(plan.panelsPerPort)}</b></div>
        <div class="kv"><span>Port util (worst case)</span><b>${Math.round(utilWorst * 100)}%</b></div>
        <div class="kv"><span>Grouping strategy</span><b>${plan.strategy}</b></div>
        <div class="kv"><span>Video bandwidth (24-bit @ 60 fps)</span><b>${mbps.toFixed(0)} Mbps</b></div>
      </div>
    `;

    // SVG: draw panel grid tinted by port color
    const VB_W = 400, VB_H = 260, PAD = 12;
    const gridW = VB_W - PAD * 2;
    const gridH = VB_H - PAD * 2;
    const aspect = (map.panelsX * map.resW) / (map.panelsY * map.resH);
    let w = gridW, h = gridW / aspect;
    if (h > gridH) { h = gridH; w = gridH * aspect; }
    const x0 = (VB_W - w) / 2;
    const y0 = (VB_H - h) / 2;
    const cellW = w / map.panelsX;
    const cellH = h / map.panelsY;

    const colors = ['#6366f1','#38bdf8','#22c55e','#f59e0b','#ef4444','#a855f7','#ec4899','#14b8a6','#eab308','#84cc16','#0ea5e9','#f43f5e','#8b5cf6','#10b981','#f97316','#3b82f6','#d946ef','#06b6d4','#ca8a04','#dc2626'];

    let rects = '';
    plan.portAssignments.forEach((pa) => {
      const color = colors[pa.port % colors.length];
      for (let y = pa.yStart; y < pa.yEnd; y++) {
        for (let x = pa.xStart; x < pa.xEnd; x++) {
          const rx = x0 + x * cellW;
          const ry = y0 + y * cellH;
          rects += `<rect x="${rx.toFixed(2)}" y="${ry.toFixed(2)}" width="${cellW.toFixed(2)}" height="${cellH.toFixed(2)}" fill="${color}" fill-opacity="0.35" stroke="${color}" stroke-width="0.5"/>`;
        }
      }
      // Port label at center of group
      const lx = x0 + ((pa.xStart + pa.xEnd) / 2) * cellW;
      const ly = y0 + ((pa.yStart + pa.yEnd) / 2) * cellH;
      rects += `<text x="${lx.toFixed(2)}" y="${(ly + 3).toFixed(2)}" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" font-family="ui-monospace, monospace">P${pa.port + 1}</text>`;
    });

    els.svg.innerHTML = `
      <rect x="${x0 - 4}" y="${y0 - 4}" width="${w + 8}" height="${h + 8}" fill="none" stroke="rgba(56,189,248,0.5)" stroke-dasharray="3 3" stroke-width="0.8"/>
      ${rects}
      <rect x="${x0.toFixed(2)}" y="${y0.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="none" stroke="#a5b4fc" stroke-width="1.2"/>
    `;
  }

  async function recompute() {
    const map = await resolveMap();
    const proc = PROCESSORS[Number(state.procIndex)];
    const plan = computePlan(map, proc);
    paintResults(map, proc, plan);
  }

  // Wire
  els.sourceRow.querySelectorAll('.chip').forEach((chip) => {
    if (chip.disabled) return;
    chip.addEventListener('click', () => {
      els.sourceRow.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.useManual = chip.dataset.val === 'manual';
      els.projWrap.style.display   = state.useManual ? 'none' : '';
      els.manualWrap.style.display = state.useManual ? ''     : 'none';
      recompute();
    });
  });
  els.projSel.addEventListener('change', () => { state.projectId = els.projSel.value; recompute(); });
  if (saved.length) {
    els.projSel.value = state.projectId;
  }
  ['panelsX','panelsY','resW','resH'].forEach((key) => {
    const el = els[key];
    el.addEventListener('input', () => { state[key] = Number(el.value); recompute(); });
  });
  els.procSel.addEventListener('change', () => { state.procIndex = Number(els.procSel.value); recompute(); });

  recompute();
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

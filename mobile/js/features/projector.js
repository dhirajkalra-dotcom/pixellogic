// Projector tools — mobile port.
// Three subtabs: Throw (flat), Curved surface, Test Patterns.

const fmt = (n, d = 2) => (isFinite(n) ? Number(n).toFixed(d) : '—');
const fmtInt = (n) => (isFinite(n) ? Math.round(n).toLocaleString() : '—');

export function render(root) {
  document.getElementById('app-title').textContent = 'Projector';

  const state = { sub: 'throw' };

  root.innerHTML = `
    <h2>Projector</h2>
    <p>Throw distance, curved surface sizing, and on-screen test patterns.</p>

    <div class="chip-row" id="pj-sub" style="margin-bottom:6px;">
      <button class="chip active" data-val="throw">Throw</button>
      <button class="chip" data-val="curve">Curve</button>
      <button class="chip" data-val="pattern">Test Pattern</button>
    </div>

    <div id="pj-body"></div>
  `;

  const subRow = root.querySelector('#pj-sub');
  const body   = root.querySelector('#pj-body');

  subRow.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      subRow.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.sub = chip.dataset.val;
      mount();
    });
  });

  function mount() {
    if (state.sub === 'throw')   return renderThrow(body);
    if (state.sub === 'curve')   return renderCurve(body);
    if (state.sub === 'pattern') return renderPattern(body);
  }
  mount();
}

/* ---------- Throw distance ---------- */
function renderThrow(body) {
  const s = {
    mode: 'd-from-w',   // 'd-from-w' | 'w-from-d'
    ratioMin: 1.5, ratioMax: 2.5,
    width: 4,           // meters
    distance: 8,        // meters
    aspectW: 16, aspectH: 9,
  };

  body.innerHTML = `
    <div class="card">
      <h3>Throw ratio (min – max)</h3>
      <div class="row">
        <div class="field">
          <label for="pt-min">Min T/W</label>
          <input id="pt-min" type="number" inputmode="decimal" step="any" value="${s.ratioMin}" />
        </div>
        <div class="field">
          <label for="pt-max">Max T/W</label>
          <input id="pt-max" type="number" inputmode="decimal" step="any" value="${s.ratioMax}" />
        </div>
      </div>
      <p class="hint">T/W = throw distance ÷ image width. Check the projector datasheet.</p>
    </div>

    <div class="card">
      <h3>Calculate</h3>
      <div class="chip-row" id="pt-mode">
        <button class="chip active" data-val="d-from-w">Width → Distance</button>
        <button class="chip" data-val="w-from-d">Distance → Width</button>
      </div>
      <div class="row" style="margin-top:10px;">
        <div class="field">
          <label for="pt-width">Image width (m)</label>
          <input id="pt-width" type="number" inputmode="decimal" step="any" value="${s.width}" />
        </div>
        <div class="field">
          <label for="pt-distance">Distance (m)</label>
          <input id="pt-distance" type="number" inputmode="decimal" step="any" value="${s.distance}" />
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label for="pt-ar-w">Aspect W</label>
          <input id="pt-ar-w" type="number" inputmode="decimal" step="any" value="${s.aspectW}" />
        </div>
        <div class="field">
          <label for="pt-ar-h">Aspect H</label>
          <input id="pt-ar-h" type="number" inputmode="decimal" step="any" value="${s.aspectH}" />
        </div>
      </div>
    </div>

    <div id="pt-results"></div>
  `;

  const els = {
    mode: body.querySelector('#pt-mode'),
    min: body.querySelector('#pt-min'),
    max: body.querySelector('#pt-max'),
    width: body.querySelector('#pt-width'),
    distance: body.querySelector('#pt-distance'),
    arW: body.querySelector('#pt-ar-w'),
    arH: body.querySelector('#pt-ar-h'),
    results: body.querySelector('#pt-results'),
  };

  function recompute() {
    const rMin = Number(s.ratioMin) || 0;
    const rMax = Number(s.ratioMax) || 0;
    const aw = Number(s.aspectW) || 16;
    const ah = Number(s.aspectH) || 9;

    if (s.mode === 'd-from-w') {
      const w = Number(s.width) || 0;
      const h = w * ah / aw;
      const dMin = w * rMin;
      const dMax = w * rMax;
      const diag = Math.hypot(w, h);
      els.results.innerHTML = `
        <div class="result">
          <div class="big">${fmt(dMin, 2)} – ${fmt(dMax, 2)} m</div>
          <div class="kv"><span>Throw distance range</span><b>${fmt(dMin, 2)} m – ${fmt(dMax, 2)} m</b></div>
          <div class="kv"><span>Image width × height</span><b>${fmt(w, 2)} × ${fmt(h, 2)} m</b></div>
          <div class="kv"><span>Diagonal</span><b>${fmt(diag, 2)} m (${fmt(diag / 0.0254, 0)}")</b></div>
        </div>
      `;
    } else {
      const d = Number(s.distance) || 0;
      const wMin = rMax > 0 ? d / rMax : 0;
      const wMax = rMin > 0 ? d / rMin : 0;
      const hMin = wMin * ah / aw;
      const hMax = wMax * ah / aw;
      els.results.innerHTML = `
        <div class="result">
          <div class="big">${fmt(wMin, 2)} – ${fmt(wMax, 2)} m wide</div>
          <div class="kv"><span>Image width range</span><b>${fmt(wMin, 2)} – ${fmt(wMax, 2)} m</b></div>
          <div class="kv"><span>Image height range</span><b>${fmt(hMin, 2)} – ${fmt(hMax, 2)} m</b></div>
        </div>
      `;
    }
  }

  els.mode.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      els.mode.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      s.mode = chip.dataset.val;
      recompute();
    });
  });
  const bind = (el, key) => el.addEventListener('input', () => { s[key] = Number(el.value); recompute(); });
  bind(els.min, 'ratioMin');
  bind(els.max, 'ratioMax');
  bind(els.width, 'width');
  bind(els.distance, 'distance');
  bind(els.arW, 'aspectW');
  bind(els.arH, 'aspectH');
  recompute();
}

/* ---------- Curved surface ---------- */
function renderCurve(body) {
  const s = { radius: 5, arcAngle: 120, height: 3 };
  body.innerHTML = `
    <div class="card">
      <h3>Curved screen</h3>
      <p>Flat projector image wrapped around a constant-radius curve.</p>
      <div class="row">
        <div class="field">
          <label for="cv-r">Radius (m)</label>
          <input id="cv-r" type="number" inputmode="decimal" step="any" value="${s.radius}" />
        </div>
        <div class="field">
          <label for="cv-a">Arc angle (°)</label>
          <input id="cv-a" type="number" inputmode="decimal" step="any" value="${s.arcAngle}" />
        </div>
      </div>
      <div class="field">
        <label for="cv-h">Screen height (m)</label>
        <input id="cv-h" type="number" inputmode="decimal" step="any" value="${s.height}" />
      </div>
    </div>
    <div id="cv-results"></div>
    <div class="card">
      <h3>Diagram</h3>
      <svg id="cv-svg" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid meet"
           style="width:100%; height:auto; background:rgba(15,23,42,0.6); border:1px solid var(--border); border-radius:12px;"></svg>
    </div>
  `;

  const rEl = body.querySelector('#cv-r');
  const aEl = body.querySelector('#cv-a');
  const hEl = body.querySelector('#cv-h');
  const res = body.querySelector('#cv-results');
  const svg = body.querySelector('#cv-svg');

  function recompute() {
    const r = Math.max(0.01, Number(s.radius));
    const aDeg = Math.max(1, Math.min(359, Number(s.arcAngle)));
    const aRad = aDeg * Math.PI / 180;
    const chord = 2 * r * Math.sin(aRad / 2);
    const arcLen = r * aRad;
    const sagitta = r - r * Math.cos(aRad / 2);
    const h = Math.max(0, Number(s.height));
    const area = arcLen * h;

    res.innerHTML = `
      <div class="result">
        <div class="big">${fmt(arcLen, 2)} m arc</div>
        <div class="kv"><span>Arc length (screen width)</span><b>${fmt(arcLen, 2)} m</b></div>
        <div class="kv"><span>Chord (flat distance)</span><b>${fmt(chord, 2)} m</b></div>
        <div class="kv"><span>Sagitta (depth)</span><b>${fmt(sagitta, 2)} m</b></div>
        <div class="kv"><span>Surface area</span><b>${fmt(area, 2)} m²</b></div>
      </div>
    `;

    // Diagram (top-down)
    const VB_W = 400, VB_H = 260;
    const cx = VB_W / 2;
    const cy = VB_H - 40;
    const maxR = Math.min(VB_W, VB_H) * 0.4;
    const scale = maxR / r;
    const rpx = r * scale;
    const startAng = -Math.PI / 2 - aRad / 2;
    const endAng   = -Math.PI / 2 + aRad / 2;
    const x1 = cx + rpx * Math.cos(startAng);
    const y1 = cy + rpx * Math.sin(startAng);
    const x2 = cx + rpx * Math.cos(endAng);
    const y2 = cy + rpx * Math.sin(endAng);
    const largeArc = aDeg > 180 ? 1 : 0;

    svg.innerHTML = `
      <circle cx="${cx}" cy="${cy}" r="3" fill="#a5b4fc"/>
      <path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${rpx.toFixed(2)} ${rpx.toFixed(2)} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}"
            stroke="#38bdf8" stroke-width="2.5" fill="none"/>
      <line x1="${cx}" y1="${cy}" x2="${x1.toFixed(2)}" y2="${y1.toFixed(2)}" stroke="rgba(165,180,252,0.4)" stroke-dasharray="3 3"/>
      <line x1="${cx}" y1="${cy}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="rgba(165,180,252,0.4)" stroke-dasharray="3 3"/>
      <line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="rgba(34,197,94,0.6)" stroke-width="1.5"/>
      <text x="${cx}" y="${(cy + 20).toFixed(2)}" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="ui-monospace, monospace">center · r=${fmt(r,2)} m · ${fmt(aDeg,0)}°</text>
    `;
  }

  rEl.addEventListener('input', () => { s.radius = Number(rEl.value); recompute(); });
  aEl.addEventListener('input', () => { s.arcAngle = Number(aEl.value); recompute(); });
  hEl.addEventListener('input', () => { s.height = Number(hEl.value); recompute(); });
  recompute();
}

/* ---------- Test Pattern ---------- */
function renderPattern(body) {
  const s = { pattern: 'grid', color: '#ffffff', bg: '#000000' };
  body.innerHTML = `
    <div class="card">
      <h3>Pattern</h3>
      <div class="chip-row" id="tp-pattern" style="flex-wrap:wrap;">
        ${['grid', 'crosshatch', 'circle', 'focus', 'bars', 'checker'].map((p, i) => `<button class="chip${i===0?' active':''}" data-val="${p}">${p}</button>`).join('')}
      </div>
      <div class="row" style="margin-top:10px;">
        <div class="field">
          <label>Line color</label>
          <input type="color" id="tp-fg" value="${s.color}" style="height:44px;" />
        </div>
        <div class="field">
          <label>Background</label>
          <input type="color" id="tp-bg" value="${s.bg}" style="height:44px;" />
        </div>
      </div>
      <button class="btn btn-primary" id="tp-fs" style="margin-top:8px;">Show fullscreen</button>
      <p class="hint">Tap the fullscreen image to dismiss. Lock phone rotation for consistent output.</p>
    </div>
    <div class="card">
      <h3>Preview</h3>
      <canvas id="tp-canvas" style="width:100%; height:auto; border:1px solid var(--border); border-radius:12px; display:block;"></canvas>
    </div>
  `;

  const patternRow = body.querySelector('#tp-pattern');
  const fgEl = body.querySelector('#tp-fg');
  const bgEl = body.querySelector('#tp-bg');
  const canvas = body.querySelector('#tp-canvas');
  const fsBtn = body.querySelector('#tp-fs');

  function sizeCanvas(c) {
    const box = c.parentElement.getBoundingClientRect();
    const w = Math.min(800, Math.floor(box.width - 28));
    c.width = w;
    c.height = Math.round(w * 9 / 16);
    c.style.height = c.height + 'px';
  }

  function drawPattern(ctx, W, H) {
    ctx.fillStyle = s.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = Math.max(1, Math.round(W / 800));

    if (s.pattern === 'grid' || s.pattern === 'crosshatch') {
      const step = Math.round(W / 32);
      ctx.beginPath();
      for (let x = 0; x <= W; x += step) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
      for (let y = 0; y <= H; y += step) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
      ctx.stroke();
      if (s.pattern === 'crosshatch') {
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(W, H);
        ctx.moveTo(W, 0); ctx.lineTo(0, H);
        ctx.stroke();
      }
    } else if (s.pattern === 'circle') {
      const cx = W / 2, cy = H / 2;
      const maxR = Math.min(W, H) / 2 - 4;
      for (let i = 1; i <= 6; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (maxR * i) / 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, cy); ctx.lineTo(W, cy);
      ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
      ctx.stroke();
    } else if (s.pattern === 'focus') {
      // Concentric squares + crosshair
      const cx = W / 2, cy = H / 2;
      const max = Math.min(W, H) / 2 - 4;
      for (let i = 1; i <= 8; i++) {
        const r = (max * i) / 8;
        ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);
      }
      ctx.beginPath();
      ctx.moveTo(0, cy); ctx.lineTo(W, cy);
      ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
      ctx.stroke();
    } else if (s.pattern === 'bars') {
      const colors = ['#ffffff','#ffff00','#00ffff','#00ff00','#ff00ff','#ff0000','#0000ff','#000000'];
      const bw = W / colors.length;
      colors.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(i * bw, 0, bw + 1, H); });
    } else if (s.pattern === 'checker') {
      const N = 16;
      const cw = W / N;
      const ch = H / Math.max(1, Math.round(N * H / W));
      for (let y = 0; y * ch < H; y++) {
        for (let x = 0; x * cw < W; x++) {
          if ((x + y) % 2 === 0) ctx.fillRect(x * cw, y * ch, cw + 1, ch + 1);
        }
      }
    }
  }

  function redraw() {
    sizeCanvas(canvas);
    drawPattern(canvas.getContext('2d'), canvas.width, canvas.height);
  }

  patternRow.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      patternRow.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      s.pattern = chip.dataset.val;
      redraw();
    });
  });
  fgEl.addEventListener('input', () => { s.color = fgEl.value; redraw(); });
  bgEl.addEventListener('input', () => { s.bg    = bgEl.value; redraw(); });

  fsBtn.addEventListener('click', async () => {
    // Create a fullscreen canvas layered above everything, draw pattern at device px,
    // dismiss on tap.
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#000;';
    const c = document.createElement('canvas');
    c.style.cssText = 'width:100vw;height:100vh;display:block;';
    overlay.appendChild(c);
    document.body.appendChild(overlay);
    try {
      if (overlay.requestFullscreen) await overlay.requestFullscreen().catch(() => {});
    } catch {}
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    c.width = Math.round(window.innerWidth * dpr);
    c.height = Math.round(window.innerHeight * dpr);
    drawPattern(c.getContext('2d'), c.width, c.height);

    const close = () => {
      overlay.remove();
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
    overlay.addEventListener('click', close, { once: true });
    overlay.addEventListener('touchend', close, { once: true });
  });

  window.addEventListener('resize', redraw, { passive: true });
  redraw();
}

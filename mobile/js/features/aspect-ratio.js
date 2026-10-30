// Aspect Ratio Calculator — mobile port.
// Given width + target ratio (or width + height) → compute the missing side in any unit.
// Supports: pixels (via DPI), mm, cm, m, inches, ft. Ratio from preset or custom w:h.

const UNITS = ['pixels', 'mm', 'cm', 'm', 'inches', 'ft'];

// Pixels need DPI. Other units convert to mm internally.
const TO_MM = { mm: 1, cm: 10, m: 1000, inches: 25.4, ft: 304.8 };

function toMM(value, unit, dpi) {
  if (unit === 'pixels') return (value / dpi) * 25.4;
  return value * TO_MM[unit];
}
function fromMM(mm, unit, dpi) {
  if (unit === 'pixels') return (mm / 25.4) * dpi;
  return mm / TO_MM[unit];
}

const RATIOS = [
  { label: '16:9 (HD)',      w: 16, h: 9 },
  { label: '16:10',          w: 16, h: 10 },
  { label: '4:3',            w: 4,  h: 3 },
  { label: '21:9 (UW)',      w: 21, h: 9 },
  { label: '32:9',           w: 32, h: 9 },
  { label: '2.39:1 (Cine)',  w: 239, h: 100 },
  { label: '1.85:1',         w: 185, h: 100 },
  { label: '1:1',            w: 1,  h: 1 },
  { label: '9:16 (vert)',    w: 9,  h: 16 },
  { label: '3:4 (vert)',     w: 3,  h: 4 },
];

const gcd = (a, b) => { a = Math.round(a); b = Math.round(b); while (b) { [a, b] = [b, a % b]; } return a || 1; };
const fmt = (n, d = 2) => (isFinite(n) ? Number(n).toFixed(d) : '—');

export function render(root) {
  document.getElementById('app-title').textContent = 'Aspect Ratio';

  const state = {
    mode: 'ratio',     // 'ratio' | 'both'
    unit: 'pixels',
    dpi: 96,
    width:  1920,
    height: 1080,
    ratioW: 16,
    ratioH: 9,
  };

  root.innerHTML = `
    <h2>Aspect Ratio</h2>
    <p>Solve width / height across pixels, mm, cm, m, inches, feet.</p>

    <div class="card">
      <h3>Mode</h3>
      <div class="chip-row" id="ar-mode">
        <button class="chip active" data-val="ratio">Width + Ratio → Height</button>
        <button class="chip" data-val="both">Width + Height → Ratio</button>
      </div>
    </div>

    <div class="card">
      <h3>Inputs</h3>
      <div class="row">
        <div class="field">
          <label for="ar-unit">Unit</label>
          <select id="ar-unit">${UNITS.map(u => `<option value="${u}">${u}</option>`).join('')}</select>
        </div>
        <div class="field" id="ar-dpi-wrap">
          <label for="ar-dpi">DPI</label>
          <input id="ar-dpi" type="number" inputmode="numeric" min="1" value="96" />
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label for="ar-width">Width</label>
          <input id="ar-width" type="number" inputmode="decimal" step="any" value="1920" />
        </div>
        <div class="field" id="ar-height-wrap">
          <label for="ar-height">Height</label>
          <input id="ar-height" type="number" inputmode="decimal" step="any" value="1080" />
        </div>
      </div>
    </div>

    <div class="card" id="ar-ratio-card">
      <h3>Ratio</h3>
      <div class="chip-row" id="ar-presets">
        ${RATIOS.map(r => `<button class="chip" data-w="${r.w}" data-h="${r.h}">${r.label}</button>`).join('')}
      </div>
      <div class="sep"></div>
      <div class="row">
        <div class="field">
          <label for="ar-ratio-w">Custom W</label>
          <input id="ar-ratio-w" type="number" inputmode="decimal" step="any" value="16" />
        </div>
        <div class="field">
          <label for="ar-ratio-h">Custom H</label>
          <input id="ar-ratio-h" type="number" inputmode="decimal" step="any" value="9" />
        </div>
      </div>
    </div>

    <div id="ar-results"></div>
  `;

  const modeRow = root.querySelector('#ar-mode');
  const unitEl  = root.querySelector('#ar-unit');
  const dpiWrap = root.querySelector('#ar-dpi-wrap');
  const dpiEl   = root.querySelector('#ar-dpi');
  const wEl     = root.querySelector('#ar-width');
  const hEl     = root.querySelector('#ar-height');
  const hWrap   = root.querySelector('#ar-height-wrap');
  const rWEl    = root.querySelector('#ar-ratio-w');
  const rHEl    = root.querySelector('#ar-ratio-h');
  const presets = root.querySelector('#ar-presets');
  const ratioCard = root.querySelector('#ar-ratio-card');
  const results = root.querySelector('#ar-results');

  function syncUi() {
    dpiWrap.style.display = state.unit === 'pixels' ? '' : 'none';
    hWrap.style.display   = state.mode === 'both' ? '' : 'none';
    ratioCard.style.display = state.mode === 'ratio' ? '' : 'none';
  }

  function recompute() {
    results.innerHTML = '';
    const unit = state.unit;
    const dpi  = Math.max(1, Number(state.dpi) || 96);
    const w    = Number(state.width);
    if (!isFinite(w) || w <= 0) return;

    if (state.mode === 'ratio') {
      const rw = Number(state.ratioW), rh = Number(state.ratioH);
      if (!rw || !rh) return;
      const h = (w * rh) / rw;
      const wMM = toMM(w, unit, dpi);
      const hMM = toMM(h, unit, dpi);
      const diagMM = Math.hypot(wMM, hMM);
      const g = gcd(rw, rh);
      results.innerHTML = `
        <div class="result">
          <div class="big">${fmt(h, 2)} ${unit}</div>
          <div class="kv"><span>Calculated height</span><b>${fmt(h, 2)} ${unit}</b></div>
          <div class="kv"><span>Ratio (simplified)</span><b>${(rw/g)} : ${(rh/g)}</b></div>
          <div class="kv"><span>Diagonal</span><b>${fmt(fromMM(diagMM, unit, dpi), 2)} ${unit}</b></div>
          <div class="kv"><span>Physical (mm)</span><b>${fmt(wMM, 1)} × ${fmt(hMM, 1)} mm</b></div>
          <div class="kv"><span>Physical (inches)</span><b>${fmt(wMM/25.4, 2)} × ${fmt(hMM/25.4, 2)} in</b></div>
        </div>
      `;
    } else {
      const h = Number(state.height);
      if (!isFinite(h) || h <= 0) return;
      const g = gcd(w, h);
      const wMM = toMM(w, unit, dpi);
      const hMM = toMM(h, unit, dpi);
      const diagMM = Math.hypot(wMM, hMM);
      results.innerHTML = `
        <div class="result">
          <div class="big">${(w/g).toFixed(0)} : ${(h/g).toFixed(0)}</div>
          <div class="kv"><span>Exact ratio</span><b>${(w/h).toFixed(4)} : 1</b></div>
          <div class="kv"><span>Diagonal</span><b>${fmt(fromMM(diagMM, unit, dpi), 2)} ${unit}</b></div>
          <div class="kv"><span>Physical (mm)</span><b>${fmt(wMM, 1)} × ${fmt(hMM, 1)} mm</b></div>
          <div class="kv"><span>Physical (inches)</span><b>${fmt(wMM/25.4, 2)} × ${fmt(hMM/25.4, 2)} in</b></div>
        </div>
      `;
    }
  }

  function chipActivate(container, matchFn) {
    container.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', matchFn(c)));
  }

  modeRow.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.mode = chip.dataset.val;
      chipActivate(modeRow, (c) => c.dataset.val === state.mode);
      syncUi(); recompute();
    });
  });

  presets.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.ratioW = Number(chip.dataset.w);
      state.ratioH = Number(chip.dataset.h);
      rWEl.value = state.ratioW;
      rHEl.value = state.ratioH;
      chipActivate(presets, (c) => c === chip);
      recompute();
    });
  });

  unitEl.addEventListener('change', () => { state.unit = unitEl.value; syncUi(); recompute(); });
  dpiEl.addEventListener('input',  () => { state.dpi = Number(dpiEl.value); recompute(); });
  wEl.addEventListener('input',    () => { state.width = Number(wEl.value); recompute(); });
  hEl.addEventListener('input',    () => { state.height = Number(hEl.value); recompute(); });
  rWEl.addEventListener('input',   () => { state.ratioW = Number(rWEl.value); recompute(); });
  rHEl.addEventListener('input',   () => { state.ratioH = Number(rHEl.value); recompute(); });

  // Activate the 16:9 preset by default
  const def = presets.querySelector('[data-w="16"][data-h="9"]');
  if (def) def.classList.add('active');

  syncUi();
  recompute();
}

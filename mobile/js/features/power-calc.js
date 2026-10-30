// Power Calc — mobile port.
// Data: mobile/data/led-power.json (extracted from desktop app).
// Formula parity with desktop: amps/tile from measured data × tile count;
// per-phase = total / phases; breaker sized with 1.25× safety factor.

const BREAKERS = [10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200];
const nextBreaker = (a) =>
  BREAKERS.find((b) => b >= a) || Math.ceil(a / 10) * 10;

const SCENARIOS = [
  { key: 'w', label: 'Full White (worst case)', color: '#f1f5f9' },
  { key: 'r', label: 'Full Red',                color: '#ef4444' },
  { key: 'g', label: 'Full Green',              color: '#22c55e' },
  { key: 'b', label: 'Full Blue',               color: '#3b82f6' },
  { key: 's', label: 'Standby',                 color: '#94a3b8' },
];

let DATA = null;
async function loadData() {
  if (DATA) return DATA;
  const res = await fetch('./data/led-power.json');
  DATA = await res.json();
  return DATA;
}

const fmt = (n, d = 2) => (n == null ? '—' : Number(n).toFixed(d));

function compute(panel, tiles, voltage, phases, brightness) {
  const src = panel[brightness] || panel.full;
  const results = SCENARIOS.map((s) => {
    const aPerTile = src ? src[s.key] : null;
    if (aPerTile == null) return { ...s, aPerTile: null, total: null, perPhase: null, kw: null, breaker: null, phaseBreaker: null };
    const total = aPerTile * tiles;
    const perPhase = phases > 1 ? total / phases : total;
    const kw = (total * voltage) / 1000;
    return {
      ...s,
      aPerTile,
      total,
      perPhase,
      kw,
      breaker: nextBreaker(total * 1.25),
      phaseBreaker: nextBreaker(perPhase * 1.25),
    };
  });
  const worst = results.reduce(
    (acc, r) => (r.total != null && r.total > (acc?.total ?? -1) ? r : acc),
    null
  );
  return { results, worst };
}

export async function render(root) {
  document.getElementById('app-title').textContent = 'Power Calc';
  const data = await loadData();
  const brands = [...new Set(data.map((d) => d.brand))].sort();

  const state = {
    brand: brands[0],
    model: '',
    tiles: 100,
    voltage: 230,
    phases: 3,
    brightness: 'full',
  };

  root.innerHTML = `
    <h2>Power Calc</h2>
    <p>LED power draw, per-phase amps and recommended breaker (1.25× safety).</p>

    <div class="card">
      <h3>Panel</h3>
      <div class="field">
        <label for="pc-brand">Brand</label>
        <select id="pc-brand"></select>
      </div>
      <div class="field">
        <label for="pc-model">Model</label>
        <select id="pc-model"></select>
      </div>
      <div class="field">
        <label>Brightness scenario source</label>
        <div class="chip-row" id="pc-brightness">
          <button class="chip active" data-val="full">Full brightness</button>
          <button class="chip" data-val="half">Half brightness</button>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>System</h3>
      <div class="row">
        <div class="field">
          <label for="pc-tiles">Tile count</label>
          <input id="pc-tiles" type="number" inputmode="numeric" min="1" value="100" />
        </div>
        <div class="field">
          <label for="pc-voltage">Voltage (V)</label>
          <input id="pc-voltage" type="number" inputmode="numeric" min="1" value="230" />
        </div>
      </div>
      <div class="field">
        <label>Phases</label>
        <div class="chip-row" id="pc-phases">
          <button class="chip" data-val="1">Single-phase</button>
          <button class="chip active" data-val="3">3-phase</button>
        </div>
      </div>
    </div>

    <div id="pc-results"></div>

    <p class="hint">Amps-per-tile values are measured on LED test bench (from the desktop app). Breaker sizes follow IEC preferred ratings with a 1.25× safety factor.</p>
  `;

  const brandEl    = root.querySelector('#pc-brand');
  const modelEl    = root.querySelector('#pc-model');
  const tilesEl    = root.querySelector('#pc-tiles');
  const voltageEl  = root.querySelector('#pc-voltage');
  const results    = root.querySelector('#pc-results');

  brands.forEach((b) => {
    const opt = document.createElement('option');
    opt.value = b; opt.textContent = b;
    brandEl.appendChild(opt);
  });

  function fillModels() {
    modelEl.innerHTML = '';
    const models = data.filter((d) => d.brand === state.brand);
    models.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m.model; opt.textContent = m.model;
      modelEl.appendChild(opt);
    });
    state.model = models[0]?.model || '';
    modelEl.value = state.model;
  }

  function recompute() {
    const panel = data.find((d) => d.brand === state.brand && d.model === state.model);
    if (!panel) { results.innerHTML = ''; return; }
    const tiles = Math.max(1, Number(state.tiles) || 0);
    const voltage = Math.max(1, Number(state.voltage) || 230);
    const phases = Number(state.phases) || 1;
    const { results: rows, worst } = compute(panel, tiles, voltage, phases, state.brightness);

    const worstBreaker = worst && worst.perPhase != null ? nextBreaker(worst.perPhase * 1.25) : null;
    const totalKw      = worst ? worst.kw : null;

    results.innerHTML = `
      <div class="result">
        <div class="kv"><span>Panel</span><b>${panel.brand} · ${panel.model}</b></div>
        <div class="kv"><span>Tiles × Voltage × Phases</span><b>${tiles} · ${voltage} V · ${phases}ϕ</b></div>
        <div class="big">${worstBreaker ? worstBreaker + ' A per phase' : '—'}</div>
        <div class="kv"><span>Worst-case total amps</span><b>${fmt(worst?.total, 1)} A</b></div>
        <div class="kv"><span>Worst-case per phase</span><b>${fmt(worst?.perPhase, 1)} A</b></div>
        <div class="kv"><span>Peak active power</span><b>${fmt(totalKw, 2)} kW</b></div>
        <div class="kv"><span>Scenario used</span><b>${worst?.label || '—'}</b></div>
      </div>

      <div class="card" style="margin-top:14px;">
        <h3>All scenarios</h3>
        <div class="scroll-x">
          <table class="mono" style="width:100%; font-size:13px; border-collapse:collapse;">
            <thead>
              <tr style="color:var(--text-dim); text-align:left;">
                <th style="padding:6px 8px;">Scenario</th>
                <th style="padding:6px 8px; text-align:right;">A/tile</th>
                <th style="padding:6px 8px; text-align:right;">Total A</th>
                <th style="padding:6px 8px; text-align:right;">Per phase</th>
                <th style="padding:6px 8px; text-align:right;">kW</th>
                <th style="padding:6px 8px; text-align:right;">Breaker/ϕ</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((r) => `
                <tr style="border-top:1px solid var(--border);">
                  <td style="padding:6px 8px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${r.color};margin-right:6px;"></span>${r.label}</td>
                  <td style="padding:6px 8px; text-align:right;">${fmt(r.aPerTile, 2)}</td>
                  <td style="padding:6px 8px; text-align:right;">${fmt(r.total, 1)}</td>
                  <td style="padding:6px 8px; text-align:right;">${fmt(r.perPhase, 1)}</td>
                  <td style="padding:6px 8px; text-align:right;">${fmt(r.kw, 2)}</td>
                  <td style="padding:6px 8px; text-align:right; color:#fbbf24;">${r.phaseBreaker != null ? r.phaseBreaker + ' A' : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Wire chip rows
  function wireChips(container, stateKey, cast) {
    container.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        container.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        state[stateKey] = cast(chip.dataset.val);
        recompute();
      });
    });
  }
  wireChips(root.querySelector('#pc-brightness'), 'brightness', String);
  wireChips(root.querySelector('#pc-phases'),     'phases',     Number);

  brandEl.addEventListener('change', () => { state.brand = brandEl.value; fillModels(); recompute(); });
  modelEl.addEventListener('change', () => { state.model = modelEl.value; recompute(); });
  tilesEl.addEventListener('input',  () => { state.tiles = Number(tilesEl.value); recompute(); });
  voltageEl.addEventListener('input',() => { state.voltage = Number(voltageEl.value); recompute(); });

  fillModels();
  recompute();
}

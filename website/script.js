/* ============================================================
   PIXELOGIC WEBSITE — script.js
   Animations & Interactivity
   ============================================================ */

'use strict';

// ── 0a. PAGE HIT COUNTER — Firebase ─────────────────────────
(function trackVisit() {
  var DB = 'https://pixelogic-site-default-rtdb.firebaseio.com';
  var page = location.pathname.replace(/.*\//, '').replace('.html', '') || 'index';

  // Coerce any stored value to a safe non-negative integer. This guards
  // against a legacy corrupted node (e.g. "[object Object]111…") poisoning
  // the total — such values become 0 and get overwritten on next write.
  function toCount(v) {
    var n = parseInt(v, 10);
    return (isFinite(n) && n > 0) ? n : 0;
  }

  // Increment this page's count
  fetch(DB + '/hits/' + page + '.json')
    .then(function(r) { return r.ok ? r.json() : 0; })
    .then(function(count) {
      return fetch(DB + '/hits/' + page + '.json', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toCount(count) + 1)
      });
    })
    .then(function() {
      // Fetch all page counts and display total
      return fetch(DB + '/hits.json');
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(hits) {
      if (!hits) return;
      var total = Object.values(hits).reduce(function(sum, n) { return sum + toCount(n); }, 0);
      var el = document.getElementById('visitor-counter');
      if (el && total > 0) el.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;opacity:.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> ' + total.toLocaleString();
    })
    .catch(function() {});
})();

// ── 0. PAGE LOADER — fade out after page ready ──────────────
(function initPageLoader() {
  const loader = document.getElementById('page-loader');
  if (!loader) return;
  window.addEventListener('load', function () {
    setTimeout(function () { loader.classList.add('loaded'); }, 400);
    setTimeout(function () { loader.remove(); }, 1200);
  });
})();

// ── 1. HERO CANVAS — LED pixel wall wave ────────────────────
(function initHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, COLS, ROWS;
  const CELL  = 20;   // px per LED cell
  const DOT_R = 2.4;  // LED dot radius (5px diam, 15px dead zone = authentic pitch)
  let t = 0;

  // Occasional bright pop-pixels (like individual LEDs flashing on)
  const pops = [];
  function schedulePop() {
    setTimeout(() => {
      if (COLS && pops.length < 28) {
        const rand = Math.random();
        pops.push({
          c: Math.floor(Math.random() * COLS),
          r: Math.floor(Math.random() * ROWS),
          a: 1.0,
          speed: 0.014 + Math.random() * 0.018,
          col: rand < 0.55 ? [99,102,241] : rand < 0.78 ? [6,182,212] : [255,255,255],
        });
      }
      schedulePop();
    }, 180 + Math.random() * 420);
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    COLS = Math.ceil(W / CELL) + 1;
    ROWS = Math.ceil(H / CELL) + 1;
  }

  // Compound sine wave field — gives organic rolling LED wall look
  function brightness(c, r) {
    return (
      Math.sin(c * 0.09 + t * 1.6) * 0.26 +
      Math.sin(r * 0.12 + t * 1.1) * 0.26 +
      Math.sin((c + r) * 0.07 + t * 0.85) * 0.20 +
      Math.sin(c * 0.05 - t * 1.35) * 0.15 +
      Math.sin(r * 0.06 + c * 0.04 + t * 0.55) * 0.13
    ); // range ≈ −1 to +1
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    t += 0.006;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const b = brightness(c, r) * 0.5 + 0.5; // 0 → 1
        const cx = c * CELL, cy = r * CELL;

        if (b < 0.33) {
          // Off LED: ghost dot shows the pixel structure
          ctx.beginPath();
          ctx.arc(cx, cy, DOT_R * 0.55, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${(b * 0.03).toFixed(3)})`;
          ctx.fill();
          continue;
        }

        const n = (b - 0.33) / 0.67; // 0→1 within visible range
        let ri, gi, bi, alpha;

        if (n < 0.38) {
          // Dim indigo
          ri = 99; gi = 102; bi = 241;
          alpha = n * 0.60;
        } else if (n < 0.72) {
          // Mid indigo → purple-cyan blend
          const m = (n - 0.38) / 0.34;
          ri = Math.round(99  + (129 - 99)  * m);
          gi = Math.round(102 + (140 - 102) * m);
          bi = 241;
          alpha = 0.23 + m * 0.18;
        } else {
          // Bright — cyan bloom
          const m = (n - 0.72) / 0.28;
          ri = Math.round(129 + (6   - 129) * m);
          gi = Math.round(140 + (182 - 140) * m);
          bi = Math.round(241 + (212 - 241) * m);
          alpha = 0.41 + m * 0.38;
        }

        ctx.beginPath();
        ctx.arc(cx, cy, DOT_R, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${ri},${gi},${bi},${alpha.toFixed(3)})`;
        ctx.fill();
      }
    }

    // Pop pixels — bright individual LED flashes
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      p.a -= p.speed;
      if (p.a <= 0) { pops.splice(i, 1); continue; }
      ctx.save();
      ctx.shadowBlur = 16;
      ctx.shadowColor = `rgba(${p.col.join(',')},${p.a.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(p.c * CELL, p.r * CELL, DOT_R * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.col.join(',')},${p.a.toFixed(2)})`;
      ctx.fill();
      ctx.restore();
    }

    // Content-area dark vignette — keeps hero text readable
    const vg = ctx.createRadialGradient(W * 0.5, H * 0.44, W * 0.04, W * 0.5, H * 0.44, W * 0.62);
    vg.addColorStop(0,   'rgba(5,5,16,0.60)');
    vg.addColorStop(0.38,'rgba(5,5,16,0.22)');
    vg.addColorStop(1,   'transparent');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    requestAnimationFrame(render);
  }

  resize();
  schedulePop();
  render();
  window.addEventListener('resize', () => resize());
})();



// ── 2. LED PREVIEW CANVAS — Hero app window ──────────────────
(function initLedPreview() {
  const canvas = document.getElementById('led-preview');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const COLS = 20, ROWS = 10;
  const PAD  = 12;
  const GAP  = 2;
  const cellW = (W - PAD * 2 - GAP * (COLS - 1)) / COLS;
  const cellH = (H - PAD * 2 - GAP * (ROWS - 1)) / ROWS - 14;

  const BASE_Y = H - PAD;
  const WALL_H = cellH * ROWS + GAP * (ROWS - 1);
  const WALL_W = cellW * COLS + GAP * (COLS - 1);
  const WALL_X = PAD;
  const WALL_Y = BASE_Y - WALL_H - 24;

  // Pixel color map
  const types = [
    'rgba(99,102,241,',   // indigo
    'rgba(6,182,212,',    // cyan
    'rgba(244,63,94,',    // pink
    'rgba(34,197,94,',    // green
    'rgba(250,204,21,',   // yellow
    'rgba(248,113,113,',  // red
  ];

  const cells = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      type:    Math.floor(Math.random() * types.length),
      alpha:   Math.random() * 0.7 + 0.2,
      dAlpha:  (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.01 + 0.003),
    }))
  );

  // Occasionally randomize a cell color
  setInterval(() => {
    const count = Math.floor(COLS * ROWS * 0.08);
    for (let i = 0; i < count; i++) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      cells[r][c].type = Math.floor(Math.random() * types.length);
    }
  }, 280);

  function drawFloor() {
    // Floor grid
    ctx.save();
    ctx.strokeStyle = 'rgba(99,102,241,0.12)';
    ctx.lineWidth   = 0.5;
    const floorY    = BASE_Y - 10;
    const floorW    = W - PAD * 2;
    const GRID_ROWS = 5;
    const GRID_COLS = 12;
    for (let i = 0; i <= GRID_ROWS; i++) {
      const y = floorY - i * 14;
      const xOff = i * 12;
      ctx.beginPath();
      ctx.moveTo(PAD + xOff, y);
      ctx.lineTo(W - PAD - xOff, y);
      ctx.stroke();
    }
    for (let j = 0; j <= GRID_COLS; j++) {
      const t = j / GRID_COLS;
      const xTop = PAD + GRID_ROWS * 12 + (W - PAD * 2 - GRID_ROWS * 24) * t;
      const xBot = PAD + floorW * t;
      ctx.beginPath();
      ctx.moveTo(xTop, floorY - GRID_ROWS * 14);
      ctx.lineTo(xBot, floorY);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWall() {
    // Wall shadow glow
    ctx.save();
    const grd = ctx.createRadialGradient(
      WALL_X + WALL_W / 2, WALL_Y + WALL_H / 2, 0,
      WALL_X + WALL_W / 2, WALL_Y + WALL_H / 2, WALL_W * 0.6
    );
    grd.addColorStop(0, 'rgba(99,102,241,0.15)');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(WALL_X - 30, WALL_Y - 30, WALL_W + 60, WALL_H + 60);
    ctx.restore();

    // Wall background
    ctx.fillStyle = 'rgba(5,5,18,0.9)';
    ctx.strokeStyle = 'rgba(99,102,241,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(WALL_X, WALL_Y, WALL_W, WALL_H);
    ctx.fill();
    ctx.stroke();

    // Cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = cells[r][c];
        cell.alpha += cell.dAlpha;
        if (cell.alpha > 0.92 || cell.alpha < 0.08) cell.dAlpha *= -1;

        const x = WALL_X + c * (cellW + GAP);
        const y = WALL_Y + r * (cellH + GAP);
        ctx.fillStyle = types[cell.type] + cell.alpha.toFixed(2) + ')';
        ctx.fillRect(x, y, cellW, cellH);
      }
    }

    // Cabinet grid overlay
    const CAB_COLS = 4, CAB_ROWS = 2;
    const cabW = WALL_W / CAB_COLS, cabH = WALL_H / CAB_ROWS;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth   = 0.8;
    for (let i = 1; i < CAB_COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(WALL_X + i * cabW, WALL_Y);
      ctx.lineTo(WALL_X + i * cabW, WALL_Y + WALL_H);
      ctx.stroke();
    }
    for (let i = 1; i < CAB_ROWS; i++) {
      ctx.beginPath();
      ctx.moveTo(WALL_X, WALL_Y + i * cabH);
      ctx.lineTo(WALL_X + WALL_W, WALL_Y + i * cabH);
      ctx.stroke();
    }
  }

  function drawUI() {
    // Toolbar at top
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, 0, W, 28);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, 28); ctx.lineTo(W, 28); ctx.stroke();
    // Status label
    ctx.fillStyle = 'rgba(99,102,241,0.7)';
    ctx.font = 'bold 9px Inter, sans-serif';
    ctx.fillText('3D VIEW', 10, 18);
    ctx.fillStyle = 'rgba(148,163,184,0.5)';
    ctx.font = '9px Inter, sans-serif';
    ctx.fillText('20×10 cabinets · P2.5mm · 4K output', 68, 18);
  }

  let raf;
  function render() {
    ctx.clearRect(0, 0, W, H);
    // Background
    ctx.fillStyle = '#060618';
    ctx.fillRect(0, 0, W, H);
    drawFloor();
    drawWall();
    drawUI();
    raf = requestAnimationFrame(render);
  }
  render();
})();


// ── 3. VISUALIZER TAB CANVAS ─────────────────────────────────
(function initWallCanvas() {
  const canvas = document.getElementById('wall-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const COLS = 16, ROWS = 8;
  const PAD  = 8, GAP = 2;
  const cellW = (W * 0.7 - PAD * 2 - GAP * (COLS - 1)) / COLS;
  const cellH = (H * 0.55 - PAD * 2 - GAP * (ROWS - 1)) / ROWS;

  const WALL_X = (W - (cellW * COLS + GAP * (COLS - 1))) / 2;
  const WALL_Y = 30;
  const WALL_W = cellW * COLS + GAP * (COLS - 1);
  const WALL_H = cellH * ROWS + GAP * (ROWS - 1);

  const types = ['rgba(99,102,241,','rgba(6,182,212,','rgba(244,63,94,','rgba(34,197,94,'];
  const cells = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      type:  Math.floor(Math.random() * types.length),
      alpha: Math.random() * 0.7 + 0.2,
      da:    (Math.random() > 0.5 ? 1 : -1) * 0.008,
    }))
  );
  setInterval(() => {
    const n = Math.floor(COLS * ROWS * 0.06);
    for (let i = 0; i < n; i++) {
      cells[Math.floor(Math.random() * ROWS)][Math.floor(Math.random() * COLS)].type =
        Math.floor(Math.random() * types.length);
    }
  }, 220);

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#060618';
    ctx.fillRect(0, 0, W, H);

    // Floor
    const floorY = WALL_Y + WALL_H + 4;
    ctx.strokeStyle = 'rgba(99,102,241,0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 6; i++) {
      const y = floorY + i * 12, xOff = i * 10;
      ctx.beginPath(); ctx.moveTo(xOff, y); ctx.lineTo(W - xOff, y); ctx.stroke();
    }
    for (let j = 0; j <= 10; j++) {
      const t = j / 10;
      ctx.beginPath(); ctx.moveTo(50 + (W - 100) * t, floorY); ctx.lineTo(W * t, floorY + 60); ctx.stroke();
    }

    // Glow
    const g = ctx.createRadialGradient(WALL_X + WALL_W/2, WALL_Y + WALL_H/2, 0, WALL_X + WALL_W/2, WALL_Y + WALL_H/2, WALL_W*0.5);
    g.addColorStop(0, 'rgba(99,102,241,0.12)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(WALL_X - 20, WALL_Y - 20, WALL_W + 40, WALL_H + 40);

    // Wall bg
    ctx.fillStyle = 'rgba(4,4,15,0.95)'; ctx.fillRect(WALL_X, WALL_Y, WALL_W, WALL_H);

    // Cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = cells[r][c];
        cell.alpha += cell.da;
        if (cell.alpha > 0.9 || cell.alpha < 0.1) cell.da *= -1;
        ctx.fillStyle = types[cell.type] + cell.alpha.toFixed(2) + ')';
        ctx.fillRect(WALL_X + c * (cellW + GAP), WALL_Y + r * (cellH + GAP), cellW, cellH);
      }
    }

    // Frame
    ctx.strokeStyle = 'rgba(99,102,241,0.35)'; ctx.lineWidth = 1;
    ctx.strokeRect(WALL_X, WALL_Y, WALL_W, WALL_H);

    // Info overlay
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, 0, W, 22);
    ctx.fillStyle = 'rgba(99,102,241,0.8)'; ctx.font = 'bold 8px Inter,sans-serif';
    ctx.fillText('16×8 CAB · P3.9 · 63.5m²', 8, 14);

    requestAnimationFrame(render);
  }
  render();
})();


// ── 5. NAVBAR SCROLL EFFECT ───────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });


// ── 6. MOBILE HAMBURGER ───────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('nav-links');

hamburger.addEventListener('click', () => {
  const open = hamburger.classList.toggle('open');
  navLinks.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
});
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
    document.body.style.overflow = '';
  });
});


// ── 7. SCROLL REVEAL (IntersectionObserver) ───────────────────
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const delay = parseInt(entry.target.dataset.delay || '0', 10);
    setTimeout(() => entry.target.classList.add('visible'), delay);
    revealObs.unobserve(entry.target);
  });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));


// ── 8. ANIMATED STAT COUNTERS ─────────────────────────────────
function countUp(el, target, duration) {
  let start = null;
  const step = (ts) => {
    if (!start) start = ts;
    const p = Math.min((ts - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
    el.textContent = Math.round(eased * target);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
}

const counterObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const target = parseInt(entry.target.dataset.target, 10);
    const numEl  = entry.target.querySelector('.stat-number');
    if (numEl && target) countUp(numEl, target, 1800);
    counterObs.unobserve(entry.target);
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-item[data-target]').forEach(el => counterObs.observe(el));


// ── 9. TYPING EFFECT ──────────────────────────────────────────
(function initTyping() {
  const el = document.getElementById('typed-text');
  if (!el) return;
  const phrases = ['LED Wall Designer', 'AV Engineering Tool', 'Signal Patching Suite', 'Power Calculator'];
  let pIdx = 0, cIdx = 0, deleting = false;

  function tick() {
    const phrase = phrases[pIdx];
    if (!deleting) {
      el.textContent = phrase.slice(0, ++cIdx);
      if (cIdx === phrase.length) { deleting = true; setTimeout(tick, 2400); return; }
    } else {
      el.textContent = phrase.slice(0, --cIdx);
      if (cIdx === 0) { deleting = false; pIdx = (pIdx + 1) % phrases.length; }
    }
    setTimeout(tick, deleting ? 45 : 80);
  }
  tick();
})();


// ── 10. SCREENSHOT TABS ───────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = document.getElementById(`tab-${tab}`);
    if (panel) panel.classList.add('active');
  });
});


// ── 11. SMOOTH ANCHOR SCROLL ──────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});


// ── 12. FEATURE CARD MOUSE GLOW ───────────────────────────────
document.querySelectorAll('.feature-card, .doc-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
    const y = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
    card.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(99,102,241,0.08) 0%, rgba(255,255,255,0.04) 60%)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.background = '';
  });
});


// ── 14. HERO APP SWITCHER ─────────────────────────────────────
(function initHeroSwitcher() {
  const bar = document.getElementById('hero-app-bar');
  if (!bar) return;
  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('.hap-btn');
    if (!btn) return;
    const app = btn.dataset.app;

    // Toggle active class on buttons
    bar.querySelectorAll('.hap-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Show / hide slots
    const slots = document.querySelectorAll('.hero-slot');
    slots.forEach(s => { s.style.display = s.id === `hslot-${app}` ? 'flex' : 'none'; });

    // Start ef-preview if switching to eventflow
    if (app === 'eventflow') initEfPreview();
  });
})();

// ── 15. EVENTFLOW SCHEMATIC CANVAS ────────────────────────────
function initEfPreview() {
  const canvas = document.getElementById('ef-preview');
  if (!canvas || canvas._efInit) return;
  canvas._efInit = true;

  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // Nodes: [x, y, label, color]
  const nodes = [
    [36,  50, 'INPUT\nMATRIX',  '#6366f1'],
    [36, 150, 'AUDIO\nCONSOLE', '#6366f1'],
    [200, 30, 'VIDEO\nSWITCHER','#14b8a6'],
    [200,120, 'STAGE\nBOX',     '#14b8a6'],
    [200,210, 'MONITOR\nCONSOLE','#14b8a6'],
    [370, 80, 'LED\nPROCESSOR', '#f59e0b'],
    [370,185, 'FOH\nSYSTEM',    '#f59e0b'],
  ];

  // Connections: [fromIdx, toIdx]
  const conns = [
    [0,2],[0,3],[1,3],[1,4],[2,5],[3,5],[4,6],[3,6]
  ];

  const NW = 110, NH = 52;
  let t = 0;

  function node(x, y, label, col) {
    // Box
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, NW, NH, 8);
    ctx.fillStyle = 'rgba(10,10,25,0.85)';
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.7;
    ctx.stroke();
    ctx.restore();

    // Accent bar
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, 4, NH, [8, 0, 0, 8]);
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.restore();

    // Label
    ctx.save();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = label.split('\n');
    lines.forEach((l, i) => {
      const yOff = (i - (lines.length - 1) / 2) * 13;
      ctx.fillText(l, x + NW / 2 + 2, y + NH / 2 + yOff);
    });
    ctx.restore();
  }

  function wire(x1, y1, x2, y2, col, progress) {
    const mx = (x1 + x2) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.35;
    ctx.setLineDash([5, 4]);
    ctx.stroke();

    // Animated dot
    const seg = ctx.getLineDash().reduce((a, b) => a + b, 0);
    ctx.setLineDash([]);
    const p = progress % 1;
    // Approximate position along bezier
    const bx = bezier(p, x1, mx, mx, x2);
    const by = bezier(p, y1, y1, y2, y2);
    ctx.beginPath();
    ctx.arc(bx, by, 3, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.restore();
  }

  function bezier(t, p0, p1, p2, p3) {
    const u = 1 - t;
    return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Dark background
    ctx.save();
    ctx.fillStyle = 'rgba(5,5,20,0.95)';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 32) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,H); ctx.stroke(); }
    for (let gy = 0; gy < H; gy += 32) { ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke(); }
    ctx.restore();

    // Wires
    conns.forEach(([fi, ti], i) => {
      const [fx, fy] = nodes[fi];
      const [tx, ty] = nodes[ti];
      const x1 = fx + NW, y1 = fy + NH / 2;
      const x2 = tx,       y2 = ty + NH / 2;
      const col = nodes[ti][3];
      const offset = (i / conns.length);
      wire(x1, y1, x2, y2, col, (t * 0.004 + offset) % 1);
    });

    // Nodes
    nodes.forEach(([x, y, label, col]) => node(x, y, label, col));

    t++;
    requestAnimationFrame(draw);
  }

  draw();
}

// ── 16. REQUEST FORM HANDLER ──────────────────────────────────
(function initRequestForm() {
  const form = document.getElementById('req-form');
  if (!form) return;

  function setErr(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
  }
  function clearErrors() {
    ['err-name','err-email','err-apps'].forEach(id => setErr(id, ''));
    form.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
  }
  function markInvalid(inputId, errId, msg) {
    const input = document.getElementById(inputId) || document.getElementById('app-check-group');
    if (input) input.classList.add('has-error');
    setErr(errId, msg);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const name  = document.getElementById('req-name');
    const email = document.getElementById('req-email');
    const apps  = [...form.querySelectorAll('input[name="apps"]:checked')];
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    let valid = true;
    if (!name.value.trim()) {
      markInvalid('req-name', 'err-name', 'Please enter your name.');
      valid = false;
    }
    if (!email.value.trim() || !emailRe.test(email.value.trim())) {
      markInvalid('req-email', 'err-email', 'Please enter a valid email address.');
      valid = false;
    }
    if (!apps.length) {
      setErr('err-apps', 'Please select at least one application.');
      const grp = document.getElementById('app-check-group');
      if (grp) grp.classList.add('has-error');
      valid = false;
    }

    if (!valid) return;

    // Disable submit button while sending
    const submitBtn = document.getElementById('req-submit');
    const origHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Sending…';

    try {
      const formData = new FormData(form);
      // Merge checked apps into a single field
      const appList = apps.map(c => c.value).join(', ');
      formData.set('apps', appList);

      // Save to Firebase (auto-dashboard) + Web3Forms (email) in parallel
      const FIREBASE_DB = 'https://pixelogic-site-default-rtdb.firebaseio.com';
      const requestData = {
        name: name.value.trim(),
        email: email.value.trim(),
        company: (document.getElementById('req-company') || {}).value || '',
        role: (document.getElementById('req-role') || {}).value || '',
        apps: appList,
        message: (document.getElementById('req-msg') || {}).value || '',
        date: new Date().toISOString()
      };

      const promises = [
        fetch(FIREBASE_DB + '/requests.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        }),
        fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          body: formData,
        })
      ];

      const [, web3Res] = await Promise.all(promises);
      const data = await web3Res.json();

      if (data.success) {
        form.style.display = 'none';
        const success = document.getElementById('req-success');
        if (success) success.style.display = 'flex';

        // Reveal correct download buttons based on selected apps
        const wantsPixelogic = appList.toLowerCase().includes('pixelogic');
        const wantsEventflow = appList.toLowerCase().includes('eventflow');
        const wantsStagecue  = appList.toLowerCase().includes('stagecue');
        const dlPx = document.getElementById('req-download-pixelogic');
        const dlEf = document.getElementById('req-download-eventflow');
        const dlSc = document.getElementById('req-download-stagecue');
        if (dlPx) dlPx.style.display = wantsPixelogic ? 'inline-flex' : 'none';
        if (dlEf) dlEf.style.display = wantsEventflow ? 'inline-flex' : 'none';
        if (dlSc) dlSc.style.display = wantsStagecue  ? 'inline-flex' : 'none';

        // Adjust message wording
        const msg = document.getElementById('req-success-msg');
        if (msg) {
          const dlNames = [];
          if (wantsPixelogic) dlNames.push('Pixelogic Demo');
          if (wantsEventflow) dlNames.push('Eventflow Demo');
          if (wantsStagecue)  dlNames.push('StageCue Demo');
          if (dlNames.length) {
            msg.innerHTML = `Click below to download ${dlNames.join(' and ')} for Windows. A confirmation copy is on its way to your inbox.`;
          }
        }

        // Track downloads — fire a notification email + Firebase log
        // when the user actually clicks the download button.
        const trackDownload = (appName) => {
          try {
            const trackData = new FormData();
            trackData.append('access_key', 'aafd069e-ff20-437c-aaa9-5725bad2d2e9');
            trackData.append('subject', `Demo Downloaded: ${appName} — ${requestData.name}`);
            trackData.append('from_name', 'Pixelogic Download Tracker');
            trackData.append('name', requestData.name);
            trackData.append('email', requestData.email);
            trackData.append('company', requestData.company);
            trackData.append('role', requestData.role);
            trackData.append('app_downloaded', appName);
            trackData.append('user_agent', navigator.userAgent);
            trackData.append('downloaded_at', new Date().toISOString());
            trackData.append('message', `${requestData.name} (${requestData.email}) just downloaded ${appName}.`);
            trackData.append('botcheck', '');
            fetch('https://api.web3forms.com/submit', { method: 'POST', body: trackData });
          } catch (_) { /* ignore */ }
          try {
            fetch(FIREBASE_DB + '/downloads.json', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...requestData,
                app_downloaded: appName,
                user_agent: navigator.userAgent,
                downloaded_at: new Date().toISOString()
              })
            });
          } catch (_) { /* ignore */ }
        };

        const wireOnce = (el, label) => {
          if (!el) return;
          let fired = false;
          el.addEventListener('click', () => {
            if (fired) return; fired = true;
            trackDownload(label);
          });
        };
        wireOnce(dlPx, 'Pixelogic Demo (Windows)');
        wireOnce(dlEf, 'Eventflow Demo (Windows)');
        wireOnce(dlSc, 'StageCue Demo (Windows)');
      } else {
        setErr('err-apps', data.message || 'Something went wrong. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = origHTML;
      }
    } catch (err) {
      setErr('err-apps', 'Network error — please check your connection and try again.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHTML;
    }
  });
})();

// ── 16b. FULL VERSION REQUEST FORM HANDLER ─────────────────────
(function initFullForm() {
  const form = document.getElementById('full-form');
  if (!form) return;

  function setErr(id, msg) { const el = document.getElementById(id); if (el) el.textContent = msg; }
  function clearErrors() {
    ['full-err-name','full-err-email','full-err-apps'].forEach(id => setErr(id, ''));
    form.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const name  = document.getElementById('full-name');
    const email = document.getElementById('full-email');
    const apps  = [...form.querySelectorAll('input[name="apps"]:checked')];
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    let valid = true;
    if (!name.value.trim()) {
      name.classList.add('has-error');
      setErr('full-err-name', 'Please enter your name.');
      valid = false;
    }
    if (!email.value.trim() || !emailRe.test(email.value.trim())) {
      email.classList.add('has-error');
      setErr('full-err-email', 'Please enter a valid email address.');
      valid = false;
    }
    if (!apps.length) {
      const grp = document.getElementById('full-app-check-group');
      if (grp) grp.classList.add('has-error');
      setErr('full-err-apps', 'Please select at least one application.');
      valid = false;
    }
    if (!valid) return;

    const submitBtn = document.getElementById('full-submit');
    const origHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Sending…';

    try {
      const formData = new FormData(form);
      const appList = apps.map(c => c.value).join(', ');
      formData.set('apps', appList);
      formData.set('request_type', 'full-version');

      const FIREBASE_DB = 'https://pixelogic-site-default-rtdb.firebaseio.com';
      const requestData = {
        name: name.value.trim(),
        email: email.value.trim(),
        company: (document.getElementById('full-company') || {}).value || '',
        phone: (document.getElementById('full-phone') || {}).value || '',
        apps: appList,
        message: (document.getElementById('full-msg') || {}).value || '',
        request_type: 'full-version',
        date: new Date().toISOString()
      };

      const promises = [
        fetch(FIREBASE_DB + '/full-requests.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        }),
        fetch('https://api.web3forms.com/submit', { method: 'POST', body: formData })
      ];

      const [, web3Res] = await Promise.all(promises);
      const data = await web3Res.json();

      if (data.success) {
        form.style.display = 'none';
        const success = document.getElementById('full-success');
        if (success) success.style.display = 'flex';
      } else {
        setErr('full-err-apps', data.message || 'Something went wrong. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = origHTML;
      }
    } catch (err) {
      setErr('full-err-apps', 'Network error — please check your connection and try again.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHTML;
    }
  });
})();

// ── 17. CURSOR AMBIENT GLOW ─────────────────────────────────
(function initCursorGlow() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const el = document.createElement('div');
  el.className = 'cursor-glow';
  document.body.appendChild(el);
  let tx = 0, ty = 0, cx = 0, cy = 0;
  window.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  (function loop() {
    cx += (tx - cx) * 0.06;
    cy += (ty - cy) * 0.06;
    el.style.transform = `translate3d(${cx - 350}px, ${cy - 350}px, 0)`;
    requestAnimationFrame(loop);
  })();
})();


// ── 18. HERO VISUAL PARALLAX ──────────────────────────────────
(function initHeroParallax() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const visuals = document.querySelectorAll('.hero-visual');
  if (!visuals.length) return;
  let tx = 0, ty = 0, cx = 0, cy = 0;
  window.addEventListener('mousemove', e => {
    tx = (e.clientX / window.innerWidth  - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
  (function loop() {
    cx += (tx - cx) * 0.04;
    cy += (ty - cy) * 0.04;
    const tf = `perspective(1200px) rotateY(${cx * 3.5}deg) rotateX(${-cy * 2}deg)`;
    visuals.forEach(v => { v.style.transform = tf; });
    requestAnimationFrame(loop);
  })();
})();


// ── 19. LOGO CANVAS — Animated LED pixel mark ─────────────────
(function initLogoCanvas() {
  const canvas = document.getElementById('logo-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const ROWS = 6, COLS = 6, CELL = 6, DOT_R = 1.85;
  // "P" letterform in a 6×6 LED grid
  const MASK = [
    [1,1,1,1,0,0],
    [1,0,0,0,1,0],
    [1,0,0,0,1,0],
    [1,1,1,1,0,0],
    [1,0,0,0,0,0],
    [1,0,0,0,0,0],
  ];

  let t = 0;         // animation clock
  let scanY = 0;     // scan-line Y position (0→ROWS, bounces)
  let scanDir = 1;

  function render() {
    ctx.clearRect(0, 0, 36, 36);
    t += 0.035;

    // Scan line advances every frame
    scanY += 0.04 * scanDir;
    if (scanY > ROWS + 0.5) scanDir = -1;
    if (scanY < -0.5)       scanDir =  1;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cx = c * CELL + CELL / 2;
        const cy = r * CELL + CELL / 2;
        const lit = MASK[r][c] === 1;

        if (!lit) {
          // Ghost pixel — shows the grid structure
          ctx.beginPath();
          ctx.arc(cx, cy, DOT_R * 0.65, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.07)';
          ctx.fill();
          continue;
        }

        // Individual phase offset so pixels breathe out of sync
        const phase = r * 0.38 + c * 0.22;
        const pulse = 0.72 + Math.sin(t + phase) * 0.16;

        // Scan boost: row close to scan line gets brighter + shifts to cyan
        const dist   = Math.abs(r - scanY);
        const boost  = Math.max(0, 1 - dist * 0.9);
        const alpha  = Math.min(pulse + boost * 0.55, 1.0);
        const size   = DOT_R + boost * 0.7;

        // Color: base indigo → cyan near scan line
        const ri = Math.round(99  + (6   - 99)  * boost * 0.9);
        const gi = Math.round(102 + (182 - 102) * boost * 0.9);
        const bi = Math.round(241 + (212 - 241) * boost * 0.9);

        ctx.save();
        ctx.shadowBlur = 3 + boost * 8;
        ctx.shadowColor = `rgba(${ri},${gi},${bi},${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(cx, cy, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${ri},${gi},${bi},${alpha.toFixed(2)})`;
        ctx.fill();
        ctx.restore();
      }
    }

    requestAnimationFrame(render);
  }

  render();
})();


// ── 20. SCROLL SPY — Active nav link highlight ───────────────
(function initScrollSpy() {
  const sectionIds = ['products','features','eventflow','pricing','builder'];
  const linkMap = {};
  sectionIds.forEach(id => {
    const a = document.querySelector(`.nav-links a[href="#${id}"]`);
    if (a) linkMap[id] = a;
  });

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      Object.values(linkMap).forEach(l => l.classList.remove('active'));
      if (linkMap[id]) linkMap[id].classList.add('active');
    });
  }, { rootMargin: '-25% 0px -65% 0px', threshold: 0 });

  sectionIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) obs.observe(el);
  });
})();


// ── 21. PAGE HERO CANVAS — Subtle LED particle field ──────────
(function initPageHeroCanvas() {
  const canvas = document.getElementById('page-hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, COLS, ROWS;
  const CELL  = 28;
  const DOT_R = 1.6;
  let t = 0;

  function resize() {
    const section = canvas.parentElement;
    W = canvas.width  = section.offsetWidth;
    H = canvas.height = section.offsetHeight;
    COLS = Math.ceil(W / CELL) + 1;
    ROWS = Math.ceil(H / CELL) + 1;
  }

  function brightness(c, r) {
    return (
      Math.sin(c * 0.11 + t * 1.2) * 0.28 +
      Math.sin(r * 0.14 + t * 0.9) * 0.28 +
      Math.sin((c + r) * 0.08 + t * 0.65) * 0.22 +
      Math.sin(c * 0.06 - t * 1.1) * 0.14 +
      Math.sin(r * 0.07 + c * 0.05 + t * 0.4) * 0.10
    );
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    t += 0.004;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const b = brightness(c, r) * 0.5 + 0.5;
        const cx = c * CELL, cy = r * CELL;

        if (b < 0.38) {
          ctx.beginPath();
          ctx.arc(cx, cy, DOT_R * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${(b * 0.015).toFixed(4)})`;
          ctx.fill();
          continue;
        }

        const n = (b - 0.38) / 0.62;
        let ri, gi, bi, alpha;

        if (n < 0.4) {
          ri = 99; gi = 102; bi = 241;
          alpha = n * 0.35;
        } else if (n < 0.75) {
          const m = (n - 0.4) / 0.35;
          ri = Math.round(99 + 30 * m);
          gi = Math.round(102 + 38 * m);
          bi = 241;
          alpha = 0.14 + m * 0.12;
        } else {
          const m = (n - 0.75) / 0.25;
          ri = Math.round(129 + (6 - 129) * m);
          gi = Math.round(140 + (182 - 140) * m);
          bi = Math.round(241 + (212 - 241) * m);
          alpha = 0.26 + m * 0.22;
        }

        ctx.beginPath();
        ctx.arc(cx, cy, DOT_R, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${ri},${gi},${bi},${alpha.toFixed(3)})`;
        ctx.fill();
      }
    }

    // Central dark vignette to keep text readable
    const vg = ctx.createRadialGradient(W * 0.5, H * 0.45, W * 0.02, W * 0.5, H * 0.45, W * 0.55);
    vg.addColorStop(0,   'rgba(5,5,16,0.70)');
    vg.addColorStop(0.4, 'rgba(5,5,16,0.25)');
    vg.addColorStop(1,   'transparent');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    requestAnimationFrame(render);
  }

  resize();
  render();
  window.addEventListener('resize', resize);
})();

// ── 22. WEBSITE PROTECTION ────────────────────────────────────
(function protectSite() {
  // Disable right-click context menu
  document.addEventListener('contextmenu', function(e) { e.preventDefault(); });

  // Disable text selection via CSS
  document.documentElement.style.userSelect = 'none';
  document.documentElement.style.webkitUserSelect = 'none';

  // Block keyboard shortcuts (Ctrl+U, Ctrl+S, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, F12)
  document.addEventListener('keydown', function(e) {
    // F12
    if (e.key === 'F12') { e.preventDefault(); return; }
    // Ctrl+U (view source), Ctrl+S (save), Ctrl+P (print)
    if (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P')) {
      e.preventDefault(); return;
    }
    // Ctrl+Shift+I (devtools), Ctrl+Shift+J (console), Ctrl+Shift+C (inspect)
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
      e.preventDefault(); return;
    }
  });

  // Disable drag on images
  document.addEventListener('dragstart', function(e) {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });

  // DevTools detection — clear console + warn
  var devtoolsOpen = false;
  var threshold = 160;
  setInterval(function() {
    var w = window.outerWidth - window.innerWidth > threshold;
    var h = window.outerHeight - window.innerHeight > threshold;
    if (w || h) {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        console.clear();
        console.log('%c⚠ This website is protected. Unauthorized copying is prohibited.', 'color:#f87171;font-size:18px;font-weight:bold;');
      }
    } else {
      devtoolsOpen = false;
    }
  }, 1000);
})();


// ── 21. AUTH NAV — Sign in / Account state in the navbar ─────
// 1) On every page load, immediately render Sign in + Sign up buttons
//    in the navbar (no PHP required to display them).
// 2) Then ask /auth/me.php in the background. If the user is logged in,
//    upgrade the buttons to "Account" + "Sign out".
(function authNav() {
  if (location.pathname.startsWith('/auth/') || location.pathname.startsWith('/app/')
      || location.pathname.startsWith('/eventflow-app')) return;

  // EventFlow pages use a separate auth system (ef-*.php + /eventflow-auth/),
  // completely independent from PixelLogic's (/login.php, /auth/me.php, ...).
  var isEventFlow = /eventflow/i.test(location.pathname);
  var AUTH = isEventFlow
    ? { login: '/ef-login.php', register: '/ef-register.php', account: '/ef-account.php', logout: '/ef-logout.php', me: '/eventflow-auth/me.php' }
    : { login: '/login.php',    register: '/register.php',    account: '/account.php',    logout: '/logout.php',    me: '/auth/me.php' };

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  function ensureNavStyles() {
    if (document.getElementById('pl-nav-auth-style')) return;
    var s = document.createElement('style');
    s.id = 'pl-nav-auth-style';
    s.textContent = [
      // Keep auth controls and the page CTA visible alongside product links.
      '.nav-container { max-width: 1680px !important; gap: 10px !important; }',
      '.nav-links { gap: 4px !important; }',
      '.nav-cta-desktop { margin-left: 2px !important; }',
      '#pl-nav-signin, #pl-nav-signup { flex-shrink: 0; }',
      // Compact headers retain the primary page CTA; account actions remain in the menu.
      '@media (max-width: 1450px) {',
      '  #pl-nav-signin, #pl-nav-signup { display: none !important; }',
      '}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function renderLoggedOut() {
    ensureNavStyles();
    // Desktop pills (inserted BEFORE the existing "Get Demo" CTA so the
    // visual order is: [Sign in] [Sign up] [Get Demo])
    var desktopCta = document.querySelector('.nav-cta-desktop');
    if (desktopCta && !document.getElementById('pl-nav-signin')) {
      var pillBase = 'display:inline-flex;align-items:center;justify-content:center;'
                   + 'height:32px;padding:0 10px;margin-right:2px;'
                   + 'border-radius:8px;font-size:13.5px;font-weight:600;'
                   + 'line-height:1;white-space:nowrap;text-decoration:none;'
                   + 'transition:filter .15s, background .15s, border-color .15s;';

      var signin = document.createElement('a');
      signin.id = 'pl-nav-signin';
      signin.href = AUTH.login;
      signin.textContent = 'Sign in';
      signin.style.cssText = pillBase
        + 'border:1px solid rgba(148,163,184,.4);color:#e2e8f0;'
        + 'background:rgba(15,23,42,.55);';
      signin.addEventListener('mouseenter', function () {
        signin.style.background = 'rgba(30,41,59,.85)';
        signin.style.borderColor = 'rgba(148,163,184,.6)';
      });
      signin.addEventListener('mouseleave', function () {
        signin.style.background = 'rgba(15,23,42,.55)';
        signin.style.borderColor = 'rgba(148,163,184,.4)';
      });

      var signup = document.createElement('a');
      signup.id = 'pl-nav-signup';
      signup.href = AUTH.register;
      signup.textContent = 'Sign up';
      signup.style.cssText = pillBase
        + 'border:1px solid rgba(56,189,248,.5);color:#7dd3fc;'
        + 'background:rgba(56,189,248,.10);';
      signup.addEventListener('mouseenter', function () {
        signup.style.background = 'rgba(56,189,248,.18)';
        signup.style.borderColor = 'rgba(56,189,248,.7)';
      });
      signup.addEventListener('mouseleave', function () {
        signup.style.background = 'rgba(56,189,248,.10)';
        signup.style.borderColor = 'rgba(56,189,248,.5)';
      });

      desktopCta.parentNode.insertBefore(signin, desktopCta);
      desktopCta.parentNode.insertBefore(signup, desktopCta);
    }

    // Mobile menu entries
    var navLinks = document.getElementById('nav-links');
    if (navLinks && !document.getElementById('pl-nav-mobile-signin')) {
      var li1 = document.createElement('li');
      li1.id = 'pl-nav-mobile-signin';
      li1.className = 'nav-cta-mobile';
      li1.style.cssText = 'border-top:1px solid rgba(148,163,184,.18);margin-top:6px;padding-top:6px;';
      li1.innerHTML = '<a href="' + AUTH.login + '">Sign in</a>';

      var li2 = document.createElement('li');
      li2.id = 'pl-nav-mobile-signup';
      li2.className = 'nav-cta-mobile';
      li2.innerHTML = '<a href="' + AUTH.register + '">Sign up</a>';

      navLinks.appendChild(li1);
      navLinks.appendChild(li2);
    }
  }

  function renderLoggedIn(user) {
    ensureNavStyles();
    // Replace the Sign in pill with the user's name -> /account.php
    // and remove the Sign up pill. "Get Demo" stays untouched.
    var signinPill = document.getElementById('pl-nav-signin');
    var signupPill = document.getElementById('pl-nav-signup');
    if (signupPill && signupPill.parentNode) signupPill.parentNode.removeChild(signupPill);
    if (signinPill) {
      var name = (user && user.name) ? user.name.split(' ')[0] : 'Account';
      signinPill.href = AUTH.account;
      signinPill.textContent = name;
    }

    // Mobile menu: swap Sign in/Sign up for Account + Sign out
    var mSignin = document.getElementById('pl-nav-mobile-signin');
    var mSignup = document.getElementById('pl-nav-mobile-signup');
    if (mSignin) mSignin.innerHTML = '<a href="' + AUTH.account + '">Account</a>';
    if (mSignup) mSignup.innerHTML = '<a href="' + AUTH.logout + '" style="color:#fca5a5;">Sign out</a>';
  }

  ready(function () {
    renderLoggedOut();

    // Try to detect a live session. Silent failure (e.g. running locally
    // without PHP) just leaves the Sign in / Sign up buttons visible.
    fetch(AUTH.me, { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.logged_in) renderLoggedIn(data.user);
      })
      .catch(function () { /* offline / no PHP — leave defaults */ });
  });
})();

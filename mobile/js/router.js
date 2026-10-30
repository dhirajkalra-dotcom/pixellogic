// Tiny hash-based router for the PWA.
const routes = new Map();
let currentRoute = null;

export function register(name, loader) {
  routes.set(name, loader);
}

export function go(name, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const hash = `#/${name}${qs ? '?' + qs : ''}`;
  if (location.hash === hash) {
    render();
  } else {
    location.hash = hash;
  }
}

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  if (!raw) return { name: 'projects', params: {} };
  const [name, query = ''] = raw.split('?');
  const params = Object.fromEntries(new URLSearchParams(query).entries());
  return { name, params };
}

async function render() {
  const { name, params } = parseHash();
  const loader = routes.get(name) || routes.get('home');
  const view = document.getElementById('view');
  view.innerHTML = '';
  try {
    const mod = await loader();
    if (typeof mod.render === 'function') {
      mod.render(view, params);
    }
  } catch (err) {
    console.error('Route render failed:', name, err);
    view.innerHTML = `<div class="card"><h3>Error</h3><p>Failed to load "${name}".</p><pre class="mono">${String(err && err.message || err)}</pre></div>`;
  }
  currentRoute = name;
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.route === name);
  });
  document.getElementById('view').scrollTo?.(0, 0);
  window.scrollTo(0, 0);
}

export function start() {
  window.addEventListener('hashchange', render);
  if (!location.hash) location.hash = '#/projects';
  else render();
}

export function current() { return currentRoute; }

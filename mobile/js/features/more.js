// "More" tab — shows the extra tools not in the bottom nav.
import { go } from '../router.js';

const TILES = [
  {
    route: 'aspect-ratio',
    iconClass: 'bg-cyan',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
    label: 'Aspect Ratio',
    desc: 'Calculator + converter',
  },
  {
    route: 'projector',
    iconClass: 'bg-amber',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M3 12h2M19 12h2M12 3v2M12 19v2M5.64 5.64l1.41 1.41M16.95 16.95l1.41 1.41M5.64 18.36l1.41-1.41M16.95 7.05l1.41-1.41"/></svg>`,
    label: 'Projector Tools',
    desc: 'Throw, curve, patterns',
  },
  {
    route: 'patching',
    iconClass: 'bg-indigo',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="6" y1="8" x2="6" y2="16"/><line x1="8" y1="18" x2="16" y2="18"/><line x1="18" y1="8" x2="18" y2="16"/></svg>`,
    label: 'LED Patching',
    desc: 'Ports & bandwidth',
  },
  {
    route: 'pdf',
    iconClass: 'bg-rose',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    label: 'PDF Export',
    desc: 'Project reports',
  },
  {
    route: 'output-maps',
    iconClass: 'bg-violet',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"/><rect x="6" y="6" width="6" height="5"/><rect x="13" y="8" width="5" height="6"/><line x1="7" y1="21" x2="17" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
    label: 'Output Maps',
    desc: 'Compose multi-map canvas',
  },
  {
    route: 'projects',
    iconClass: 'bg-emerald',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    label: 'All Projects',
    desc: 'Browse saved work',
  },
];

export function render(root) {
  document.getElementById('app-title').textContent = 'More';
  root.innerHTML = `
    <h2>More tools</h2>
    <p>Utilities and exports for the current project.</p>
    <div class="tile-grid">
      ${TILES.map(t => `
        <div class="tile" data-route="${t.route}">
          <div class="tile-icon ${t.iconClass}">${t.icon}</div>
          <div class="tile-label">${t.label}</div>
          <div class="tile-desc">${t.desc}</div>
        </div>
      `).join('')}
    </div>
  `;
  root.querySelectorAll('.tile').forEach((el) => {
    el.addEventListener('click', () => go(el.dataset.route));
  });
}

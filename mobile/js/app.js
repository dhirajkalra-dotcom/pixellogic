// Entry point — registers routes, wires nav, starts SW.
import { register, start, go } from './router.js';

register('projects',      () => import('./features/projects.js'));
register('home',          () => import('./features/home.js')); // redirects to projects
register('power-calc',    () => import('./features/power-calc.js'));
register('aspect-ratio',  () => import('./features/aspect-ratio.js'));
register('designer',      () => import('./features/designer.js'));
register('effects',       () => import('./features/effects.js'));
register('output-maps',   () => import('./features/output-maps.js'));
register('shows',         () => import('./features/projects.js')); // legacy alias
register('projector',     () => import('./features/projector.js'));
register('patching',      () => import('./features/patching.js'));
register('pdf',           () => import('./features/pdf.js'));
register('more',          () => import('./features/more.js'));

// Bottom-nav wiring
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => go(btn.dataset.route));
});
document.getElementById('btn-home').addEventListener('click', () => go('projects'));
document.getElementById('btn-menu').addEventListener('click', () => go('more'));

start();

// Register service worker (only when served over http/https, not file://)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}

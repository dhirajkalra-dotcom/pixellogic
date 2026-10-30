// Generic "coming soon" placeholder for features still being ported.
const META = {
  designer:    { title: 'Pixel Designer',         blurb: 'Create and edit LED pixel maps with dimensions, pitch, and resolution.' },
  effects:     { title: 'Special Effects',        blurb: 'Add overlays, markers and info text on top of pixel maps.' },
  'output-maps': { title: 'Output Maps',          blurb: 'Compose multiple pixel maps onto a single output canvas.' },
  shows:       { title: 'Projects',               blurb: 'Manage drafts and saved shows — stored locally on your device.' },
  projector:   { title: 'Projector Test Patterns',blurb: 'Flat / curved / circular projection calculators and test patterns.' },
  patching:    { title: 'LED Patching',           blurb: 'Touch-friendly signal routing between processors and LED walls.' },
  pdf:         { title: 'PDF Export',             blurb: 'Generate a report PDF with your pixel maps and calculations.' },
};

export function forRoute(key) {
  const meta = META[key] || { title: key, blurb: '' };
  return {
    render(root) {
      document.getElementById('app-title').textContent = meta.title;
      root.innerHTML = `
        <h2>${meta.title}</h2>
        <p>${meta.blurb}</p>
        <div class="card">
          <h3>Coming soon</h3>
          <p>This feature is being ported from the desktop app. Power Calc and Aspect Ratio are already available.</p>
        </div>
      `;
    }
  };
}

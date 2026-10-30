const fs = require('fs');
const path = require('path');

const product = process.argv[2];
const targets = {
  pixel: { directory: 'pixellogic', mode: 'pixel' },
  projection: { directory: 'projection-logic', mode: 'projection' }
};
const target = targets[product];
if (!target) throw new Error('Usage: node scripts/sync-product-app.js <pixel|projection>');

const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'apps', target.directory);
const excluded = new Set(['apps', 'node_modules', 'out', 'release', 'release-new', 'dist', 'pixellogic-builds', 'demo-app', 'website', 'web-app', 'mobile', 'pixelogic-license-server', '.git', '.venv']);

for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (excluded.has(entry.name) || entry.name === 'package.json' || entry.name === 'package-lock.json') continue;
  fs.cpSync(path.join(root, entry.name), path.join(destination, entry.name), { recursive: true, force: true });
}
const indexPath = path.join(destination, 'index.html');
const productTitle = target.mode === 'projection' ? 'Projection Logic' : 'Pixelogic';
let productHtml = fs.readFileSync(indexPath, 'utf8');
productHtml = productHtml.replace('<html lang="en">', `<html lang="en" data-product="${target.mode}">`);
productHtml = productHtml.replace('<title>PIXI LOGIC</title>', `<title>${productTitle}</title>`);
fs.writeFileSync(indexPath, productHtml);
fs.writeFileSync(path.join(destination, 'product-mode.json'), JSON.stringify({ mode: target.mode }, null, 2) + '\n');
console.log(`Synced ${target.directory} product files.`);
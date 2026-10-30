const fs = require('fs');
const path = require('path');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  console.log(`Copied ${src} -> ${dest}`);
}

function getPackageBase(packageName) {
  try {
    return path.dirname(require.resolve(`${packageName}/package.json`));
  } catch (_) {}

  let entry = null;
  try {
    entry = require.resolve(packageName);
  } catch (_) {}
  if (!entry) throw new Error(`Cannot resolve package: ${packageName}`);

  let current = path.dirname(entry);
  for (let i = 0; i < 8; i++) {
    const pkgJson = path.join(current, 'package.json');
    if (fs.existsSync(pkgJson)) return current;
    const parent = path.dirname(current);
    if (!parent || parent === current) break;
    current = parent;
  }

  throw new Error(`Cannot determine package base for ${packageName}`);
}

function main() {
  const vendorDir = path.join(__dirname, '..', 'vendor');
  ensureDir(vendorDir);

  // pdf.js
  try {
    const pdfjsBase = getPackageBase('pdfjs-dist');
    const buildDir = path.join(pdfjsBase, 'build');
    const pdfSrc = fs.existsSync(path.join(buildDir, 'pdf.min.js'))
      ? path.join(buildDir, 'pdf.min.js')
      : path.join(buildDir, 'pdf.min.mjs');
    const workerSrc = fs.existsSync(path.join(buildDir, 'pdf.worker.min.js'))
      ? path.join(buildDir, 'pdf.worker.min.js')
      : path.join(buildDir, 'pdf.worker.min.mjs');
    copyFile(pdfSrc, path.join(vendorDir, 'pdf.min.js'));
    copyFile(workerSrc, path.join(vendorDir, 'pdf.worker.min.js'));
  } catch (e) {
    console.warn('pdfjs-dist not installed yet. Skipping copy.');
  }

  // jsPDF
  try {
    const jspdfBase = getPackageBase('jspdf');
    // UMD build file name
    copyFile(path.join(jspdfBase, 'dist', 'jspdf.umd.min.js'), path.join(vendorDir, 'jspdf.umd.min.js'));
  } catch (e) {
    console.warn('jspdf not installed yet. Skipping copy.');
  }

  // html2canvas
  try {
    const h2cBase = getPackageBase('html2canvas');
    copyFile(path.join(h2cBase, 'dist', 'html2canvas.min.js'), path.join(vendorDir, 'html2canvas.min.js'));
  } catch (e) {
    console.warn('html2canvas not installed yet. Skipping copy.');
  }

}

main();

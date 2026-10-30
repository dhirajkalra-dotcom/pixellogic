/**
 * Convert icon-new.svg → icon.png (1024×1024) and build/icon.ico (multi-size).
 * Run: node scripts/convert-icon.js
 */
const sharp = require('sharp');
const { default: pngToIco } = require('png-to-ico');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SVG_PATH = path.join(ROOT, 'icon-new.svg');
const PNG_PATH = path.join(ROOT, 'icon.png');
const ICO_PATH = path.join(ROOT, 'build', 'icon.ico');

async function main() {
  const svgBuf = fs.readFileSync(SVG_PATH);

  // 1. SVG → 1024×1024 PNG
  console.log('Rendering SVG → icon.png (1024×1024)...');
  await sharp(svgBuf, { density: 300 })
    .resize(1024, 1024)
    .png()
    .toFile(PNG_PATH);
  console.log('  ✓', PNG_PATH);

  // 2. Generate temp PNGs at ICO sizes
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const tmpFiles = [];

  for (const sz of sizes) {
    const tmp = path.join(ROOT, `_tmp_icon_${sz}.png`);
    await sharp(svgBuf, { density: 300 })
      .resize(sz, sz)
      .png()
      .toFile(tmp);
    tmpFiles.push(tmp);
  }

  // 3. Bundle into ICO
  console.log(`Generating ICO with sizes [${sizes.join(', ')}]...`);
  const icoBuf = await pngToIco(tmpFiles);
  fs.mkdirSync(path.dirname(ICO_PATH), { recursive: true });
  fs.writeFileSync(ICO_PATH, icoBuf);
  console.log('  ✓', ICO_PATH);

  // Cleanup temp files
  for (const f of tmpFiles) fs.unlinkSync(f);

  console.log('Done!');
}

main().catch(err => { console.error(err); process.exit(1); });

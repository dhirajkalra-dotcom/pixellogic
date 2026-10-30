/**
 * Convert icon-new.svg → icon.png (1024×1024), build/icon.ico (multi-size), and build/icon.icns (Apple Icon).
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
const ICNS_PATH = path.join(ROOT, 'build', 'icon.icns');

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

  // 4. Bundle into Apple ICNS (macOS)
  console.log('Generating macOS ICNS icon...');
  const icnsEntries = [
    { type: 'ic07', size: 128 },
    { type: 'ic08', size: 256 },
    { type: 'ic09', size: 512 },
    { type: 'ic10', size: 1024 }
  ];
  const icnsBuffers = [];
  for (const e of icnsEntries) {
    const pngBuf = await sharp(PNG_PATH).resize(e.size, e.size).png().toBuffer();
    const chunkHeader = Buffer.alloc(8);
    chunkHeader.write(e.type, 0, 4, 'ascii');
    chunkHeader.writeUInt32BE(8 + pngBuf.length, 4);
    icnsBuffers.push(chunkHeader, pngBuf);
  }
  const icnsBody = Buffer.concat(icnsBuffers);
  const icnsFileHeader = Buffer.alloc(8);
  icnsFileHeader.write('icns', 0, 4, 'ascii');
  icnsFileHeader.writeUInt32BE(8 + icnsBody.length, 4);
  const icnsBuf = Buffer.concat([icnsFileHeader, icnsBody]);
  fs.writeFileSync(ICNS_PATH, icnsBuf);
  console.log('  ✓', ICNS_PATH);

  console.log('Done!');
}

main().catch(err => { console.error(err); process.exit(1); });

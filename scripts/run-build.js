const { execSync } = require('child_process');
const path = require('path');

function ts() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}${MM}${dd}-${hh}${mm}${ss}`;
}

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

function main() {
  // 0) Optional auto-bump patch version (skip with SKIP_VERSION_BUMP=1)
  if (!process.env.SKIP_VERSION_BUMP) {
    try {
      run('npm version patch --no-git-tag-version');
    } catch (e) {
      console.warn('Version bump failed (continuing):', e?.message || e);
    }
  } else {
    console.log('Skipping automatic patch version bump (SKIP_VERSION_BUMP set).');
  }

  // 1) Ensure CSS is built
  run('npm run css');
  try {
    run('node ./scripts/generate-tutorial-pdf.js');
  } catch (e) {
    console.warn('Tutorial PDF generation skipped:', e?.message || e);
  }

  // 2) Set a unique BUILD_ID for this run (YYYYMMDD-HHMMSS)
  process.env.BUILD_ID = process.env.BUILD_ID || ts();
  if (!process.env.CSC_IDENTITY_AUTO_DISCOVERY) {
    process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
  }
  console.log(`Using BUILD_ID=${process.env.BUILD_ID}`);

  // 3) Run electron-builder with the environment variable set
  const ebCmd = 'npx --no-install electron-builder';
  const publishMode = String(process.env.ELECTRON_BUILDER_PUBLISH || 'never').trim();
  const extraArgs = process.argv.slice(2).join(' ');
  const ebWithArgs = `${ebCmd} --publish ${publishMode} ${extraArgs}`.trim();
  try {
    run(ebWithArgs, { env: process.env });
  } catch (e) {
    console.error('electron-builder failed with status:', e.status);
    if (e.stdout) console.log('STDOUT:\n', e.stdout.toString());
    if (e.stderr) console.error('STDERR:\n', e.stderr.toString());
    process.exit(e.status || 1);
  }
}

main();

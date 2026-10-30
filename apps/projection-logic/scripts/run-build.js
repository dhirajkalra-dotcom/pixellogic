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
  run('node ./scripts/generate-tutorial-pdf.js');

  // 2) Set a unique BUILD_ID for this run (YYYYMMDD-HHMMSS)
  process.env.BUILD_ID = process.env.BUILD_ID || ts();
  console.log(`Using BUILD_ID=${process.env.BUILD_ID}`);

  // 3) Run electron-builder with the environment variable set
  const ebCmd = process.platform === 'win32'
    ? '".\\node_modules\\.bin\\electron-builder.cmd"'
    : './node_modules/.bin/electron-builder';
  const publishMode = String(process.env.ELECTRON_BUILDER_PUBLISH || 'never').trim();
  const ebWithArgs = publishMode ? `${ebCmd} --publish ${publishMode}` : ebCmd;
  try {
    run(ebWithArgs, { env: process.env });
  } catch (e) {
    process.exit(e.status || 1);
  }
}

main();

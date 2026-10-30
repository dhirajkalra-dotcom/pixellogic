const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const indexPath = path.join(rootDir, 'index.html');

function setAiFlag(content, enabled) {
  const re = /(const\s+AI_AUTO_MAP_ENABLED\s*=\s*)(true|false)(\s*;)/;
  if (!re.test(content)) {
    throw new Error('AI feature flag not found in index.html');
  }
  return content.replace(re, `$1${enabled ? 'true' : 'false'}$3`);
}

function runBuild() {
  const env = {
    ...process.env,
    ELECTRON_BUILDER_PUBLISH: 'never',
  };
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
    env,
  });

  if (result.status !== 0) {
    throw new Error(`Build failed with exit code ${result.status}`);
  }
}

function main() {
  if (!fs.existsSync(indexPath)) {
    throw new Error(`index.html not found at ${indexPath}`);
  }

  const original = fs.readFileSync(indexPath, 'utf8');
  const disabled = setAiFlag(original, false);

  fs.writeFileSync(indexPath, disabled, 'utf8');
  console.log('AI Auto Map temporarily disabled for release build.');

  let restored = false;
  try {
    runBuild();
    console.log('Release build completed with AI disabled.');
  } finally {
    try {
      fs.writeFileSync(indexPath, original, 'utf8');
      restored = true;
      console.log('AI Auto Map restored in local source.');
    } catch (e) {
      console.error('Failed to restore index.html automatically:', e.message || e);
    }
  }

  if (!restored) {
    process.exitCode = 1;
  }
}

main();

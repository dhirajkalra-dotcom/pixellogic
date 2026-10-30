/**
 * Builds both the main app and the demo app sequentially.
 * Usage: node ./scripts/run-build-all.js
 */
const { execSync } = require('child_process');
const path = require('path');

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

function main() {
  const rootDir = path.join(__dirname, '..');
  const demoDir = path.join(rootDir, 'demo-app');

  console.log('=== Building Main App ===');
  run('node ./scripts/run-build.js', { cwd: rootDir });

  console.log('\n=== Building Demo App ===');
  run('npm run build', { cwd: demoDir });

  console.log('\n=== All builds complete ===');
}

main();

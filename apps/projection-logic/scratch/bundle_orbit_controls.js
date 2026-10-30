const fs = require('fs');
const path = require('path');
const THREE = require('three');

const srcPath = path.join(__dirname, '..', 'node_modules', 'three', 'examples', 'jsm', 'controls', 'OrbitControls.js');
let code = fs.readFileSync(srcPath, 'utf8');

// Replace import statement
code = code.replace(/import\s*\{[\s\S]*?\}\s*from\s*['"]three['"];/, 'const { ' + Object.keys(THREE).join(', ') + ' } = THREE;');

// Replace export statement
code = code.replace(/export\s*\{[\s\S]*?\};?/, `
global.OrbitControls = OrbitControls;
if (global.THREE) {
  global.THREE.OrbitControls = OrbitControls;
}
`);

const wrapper = `
(function(global) {
  const THREE = global.THREE || (typeof window !== 'undefined' ? window.THREE : null);
  ${code}
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
`;

const outPath = path.join(__dirname, '..', 'vendor', 'OrbitControls.js');
fs.writeFileSync(outPath, wrapper, 'utf8');

// Test loading it
global.THREE = THREE;
require(outPath);
console.log('Successfully bundled OrbitControls.js! typeof global.THREE.OrbitControls:', typeof global.THREE.OrbitControls);

const fs = require('fs');
const path = require('path');
const THREE = require('three');

const srcPath = path.join(__dirname, '..', 'node_modules', 'three', 'examples', 'jsm', 'controls', 'TransformControls.js');
let code = fs.readFileSync(srcPath, 'utf8');

// Replace import statement
code = code.replace(/import\s*\{[\s\S]*?\}\s*from\s*['"]three['"];/, 'const { ' + Object.keys(THREE).join(', ') + ' } = THREE;');

// Replace export statement
code = code.replace(/export\s*\{[\s\S]*?\};?/, `
global.TransformControls = TransformControls;
if (global.THREE) {
  global.THREE.TransformControls = TransformControls;
  global.THREE.TransformControlsGizmo = TransformControlsGizmo;
  global.THREE.TransformControlsPlane = TransformControlsPlane;
}
`);

const wrapper = `
(function(global) {
  const THREE = global.THREE;
  ${code}
})(typeof window !== 'undefined' ? window : this);
`;

const outPath = path.join(__dirname, '..', 'vendor', 'TransformControls.js');
fs.writeFileSync(outPath, wrapper, 'utf8');

// Test loading it
const fakeWindow = { THREE: THREE };
const fn = new Function('window', wrapper + '\nreturn window;');
fn(fakeWindow);
console.log('Successfully bundled TransformControls.js! typeof THREE.TransformControls:', typeof fakeWindow.THREE.TransformControls);

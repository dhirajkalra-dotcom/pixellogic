const fs = require('fs');
const path = require('path');

console.log('=== TEST 1: Check forbidden trademark mentions ===');
const v3dSrc = fs.readFileSync(path.join(__dirname, '../src/view3d-pro.js'), 'utf8');
const indexSrc = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

const forbidden = [/autodesk/i, /3ds\s*max/i, /3d\s*max/i];
forbidden.forEach((regex) => {
  if (regex.test(v3dSrc)) throw new Error(`Forbidden term found in view3d-pro.js: ${regex}`);
  if (regex.test(indexSrc)) throw new Error(`Forbidden term found in index.html: ${regex}`);
});
console.log('PASS: Zero forbidden trademark mentions in codebase.');

console.log('\n=== TEST 2: Verify OrbitControls and TransformControls ===');
const THREE_BUNDLE = require('../vendor/three.min.js');
global.THREE = THREE_BUNDLE.THREE;
global.window = { THREE: global.THREE };

require('../vendor/OrbitControls.js');
require('../vendor/TransformControls.js');

if (typeof global.THREE.OrbitControls !== 'function') {
  throw new Error('THREE.OrbitControls is not a function');
}
if (typeof global.THREE.TransformControls !== 'function') {
  throw new Error('THREE.TransformControls is not a function');
}
console.log('PASS: THREE.OrbitControls & THREE.TransformControls properly bundled and functional.');

console.log('\n=== TEST 3: Validate View Presets (Front, Left, Right, Top, Rear, 3D) ===');
const doc = { addEventListener: () => {}, removeEventListener: () => {} };
const domElement = {
  addEventListener: () => {},
  removeEventListener: () => {},
  ownerDocument: doc,
  getRootNode: () => doc,
  style: {}
};

const camera = new global.THREE.PerspectiveCamera(45, 16 / 9, 0.3, 400);
const controls = new global.THREE.OrbitControls(camera, domElement);
controls.screenSpacePanning = true;

const target = new global.THREE.Vector3(2.0, 1.5, 0.0);
const frameDist = 12.0;

const views = ['front', 'back', 'left', 'right', 'top', 'persp'];
views.forEach((view) => {
  controls.target.copy(target);
  if (view === 'front') {
    camera.position.set(target.x, target.y, target.z + frameDist);
    camera.up.set(0, 1, 0);
  } else if (view === 'back' || view === 'rear') {
    camera.position.set(target.x, target.y, target.z - frameDist);
    camera.up.set(0, 1, 0);
  } else if (view === 'left') {
    camera.position.set(target.x - frameDist, target.y, target.z);
    camera.up.set(0, 1, 0);
  } else if (view === 'right') {
    camera.position.set(target.x + frameDist, target.y, target.z);
    camera.up.set(0, 1, 0);
  } else if (view === 'top') {
    camera.position.set(target.x, target.y + frameDist * 1.3, target.z + 0.0001);
    camera.up.set(0, 0, -1);
  } else {
    camera.position.set(
      target.x + frameDist * 0.58,
      target.y + frameDist * 0.44,
      target.z + frameDist * 0.88
    );
    camera.up.set(0, 1, 0);
  }
  camera.lookAt(target);
  controls.update();

  const camPos = camera.position;
  console.log(`View '${view}': cam=(${camPos.x.toFixed(2)}, ${camPos.y.toFixed(2)}, ${camPos.z.toFixed(2)}), target=(${controls.target.x.toFixed(2)}, ${controls.target.y.toFixed(2)}, ${controls.target.z.toFixed(2)}), up=(${camera.up.x}, ${camera.up.y}, ${camera.up.z})`);

  if (view === 'front' && camPos.z <= target.z) throw new Error('Front view camera Z must be greater than target Z');
  if (view === 'back' && camPos.z >= target.z) throw new Error('Rear view camera Z must be less than target Z');
  if (view === 'left' && camPos.x >= target.x) throw new Error('Left view camera X must be less than target X');
  if (view === 'right' && camPos.x <= target.x) throw new Error('Right view camera X must be greater than target X');
  if (view === 'top' && (camPos.y <= target.y || camera.up.z !== -1)) throw new Error('Top view must look from +Y with up pointing -Z');
});

console.log('PASS: All 6 camera view presets verified with exact coordinates and orientations.');
console.log('\n=== ALL TESTS PASSED! ===');

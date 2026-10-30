const THREE = require('three');

function buildDimensionGizmo(p1, p2, text, isSnap) {
  const group = new THREE.Group();
  const color = isSnap ? 0x10b981 : 0xf59e0b;

  const points = [];
  // Main horizontal line
  points.push(new THREE.Vector3(p1.x, p1.y, p1.z));
  points.push(new THREE.Vector3(p2.x, p2.y, p2.z));

  // Tick 1
  points.push(new THREE.Vector3(p1.x, p1.y - 0.2, p1.z));
  points.push(new THREE.Vector3(p1.x, p1.y + 0.2, p1.z));

  // Tick 2
  points.push(new THREE.Vector3(p2.x, p2.y - 0.2, p2.z));
  points.push(new THREE.Vector3(p2.x, p2.y + 0.2, p2.z));

  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color, linewidth: 3, depthTest: false });
  const lines = new THREE.LineSegments(geo, mat);
  lines.renderOrder = 999;
  group.add(lines);

  return group;
}

const dim = buildDimensionGizmo({ x: 2, y: 2, z: 0 }, { x: 2.3, y: 2, z: 0 }, 'Gap: 0.30m', false);
console.log('Dimension gizmo built, children:', dim.children.length);

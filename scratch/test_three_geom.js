const THREE = require('three');

// Test creating Box Truss
const group = new THREE.Group();
const chordGeo = new THREE.CylinderGeometry(0.025, 0.025, 3.0, 8);
chordGeo.rotateZ(Math.PI / 2);
const chordMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });

const c1 = new THREE.Mesh(chordGeo, chordMat); c1.position.set(0, 0.15, 0.15); group.add(c1);
const c2 = new THREE.Mesh(chordGeo, chordMat); c2.position.set(0, 0.15, -0.15); group.add(c2);
const c3 = new THREE.Mesh(chordGeo, chordMat); c3.position.set(0, -0.15, 0.15); group.add(c3);
const c4 = new THREE.Mesh(chordGeo, chordMat); c4.position.set(0, -0.15, -0.15); group.add(c4);

console.log('Truss group created, children:', group.children.length);

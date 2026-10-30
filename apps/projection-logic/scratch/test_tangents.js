const THREE = require('three');

function verifyTangents(curveDeg) {
  const widthM = 10;
  const cols = 8;
  const colW = widthM / cols;
  const curveRad = THREE.MathUtils.degToRad(curveDeg);
  const radius = widthM / Math.abs(curveRad);
  const angleStep = curveRad / cols;

  for (let c = 0; c < cols; c++) {
    const k = c - (cols - 1) / 2;
    const colAngle = k * angleStep;

    const x = radius * Math.sin(colAngle);
    // If curveDeg < 0 (concave), wings are forward (Z > 0)
    // If curveDeg > 0 (convex), wings are backward (Z < 0)
    const z = (curveDeg < 0 ? 1 : -1) * radius * (1 - Math.cos(colAngle));
    
    // The normal to the circle at angle colAngle:
    // For a circle centered at (0, R) or (0, -R):
    // The panel rotation angle around Y:
    const rotY = colAngle;
    
    // Front normal of panel after rotY:
    // A flat panel faces +Z (0, 0, 1). After rotY: (sin(rotY), 0, cos(rotY))
    const nx = Math.sin(rotY);
    const nz = Math.cos(rotY);
    console.log(`c=${c}: x=${x.toFixed(2)}, z=${z.toFixed(2)}, rotY=${THREE.MathUtils.radToDeg(rotY).toFixed(1)}°, norm=(${nx.toFixed(2)}, ${nz.toFixed(2)})`);
  }
}

console.log('--- CONCAVE (-60 deg): ---');
verifyTangents(-60);
console.log('--- CONVEX (+60 deg): ---');
verifyTangents(60);

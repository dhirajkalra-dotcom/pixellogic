const THREE = require('three');

function testCorrectCurve(curveDeg) {
  const widthM = 10;
  const cols = 8;
  const colW = widthM / cols;
  const absCurveRad = THREE.MathUtils.degToRad(Math.abs(curveDeg));
  const radius = widthM / absCurveRad;
  const angleStep = absCurveRad / cols;

  for (let c = 0; c < cols; c++) {
    const k = c - (cols - 1) / 2;
    const alpha = k * angleStep; // negative on left, positive on right

    const x = radius * Math.sin(alpha);
    const z = (curveDeg < 0 ? 1 : -1) * radius * (1 - Math.cos(alpha));
    const rotY = (curveDeg < 0 ? -1 : 1) * alpha;

    const nx = -Math.sin(rotY); // normal pointing toward audience
    const nz = Math.cos(rotY);
    console.log(`c=${c}: x=${x.toFixed(2)}, z=${z.toFixed(2)}, rotY=${THREE.MathUtils.radToDeg(rotY).toFixed(1)}°`);
  }
}

console.log('--- CONCAVE (-75 deg): ---');
testCorrectCurve(-75);
console.log('--- CONVEX (+75 deg): ---');
testCorrectCurve(75);

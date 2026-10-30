const THREE = require('three');

function testCurve(widthM, cols, curveDeg) {
  const isCurved = Math.abs(curveDeg) >= 1;
  const colW = widthM / cols;
  const curveRad = THREE.MathUtils.degToRad(curveDeg);
  const radius = widthM / Math.abs(curveRad);
  const angleStep = curveRad / cols;

  const positions = [];

  for (let c = 0; c < cols; c++) {
    const k = c - (cols - 1) / 2;
    const colAngle = k * angleStep;

    // Angle of column center
    // Concave (curveDeg < 0): wings curve toward +Z (forward) or -Z?
    // In staging, when an LED wall curves inward (concave), the side wings curve toward the front (audience / +Z)
    // or toward the back (-Z) if wrapping away.
    // Let's check both:
    // With Z = (curveDeg < 0 ? 1 : -1) * radius * (1 - Math.cos(colAngle))
    const x = radius * Math.sin(colAngle);
    const z = (curveDeg < 0 ? 1 : -1) * radius * (1 - Math.cos(colAngle));
    const rotY = (curveDeg < 0 ? -1 : 1) * colAngle;

    positions.push({ c, x, z, rotY: THREE.MathUtils.radToDeg(rotY) });
  }

  // Check distances between adjacent column centers
  for (let i = 0; i < cols - 1; i++) {
    const p1 = positions[i];
    const p2 = positions[i + 1];
    const dist = Math.hypot(p2.x - p1.x, p2.z - p1.z);
    console.log(`Col ${i}->${i+1} distance:`, dist.toFixed(4), 'vs colW:', colW.toFixed(4), 'diff:', Math.abs(dist - colW).toFixed(4));
  }
}

console.log('Testing 10m wall with 10 columns (colW = 1.0m) at -75 deg:');
testCurve(10, 10, -75);

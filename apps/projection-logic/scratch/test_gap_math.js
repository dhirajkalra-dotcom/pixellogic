const THREE = require('three');

function calculateWallGap(wallA, wallB) {
  const wA = wallA.widthM;
  const wB = wallB.widthM;
  const posA = wallA.pos;
  const posB = wallB.pos;

  const leftA = posA.x - wA / 2;
  const rightA = posA.x + wA / 2;
  const leftB = posB.x - wB / 2;
  const rightB = posB.x + wB / 2;

  let gapX = 0;
  let side = 'left';

  if (posA.x < posB.x) {
    // A is to the left of B
    gapX = leftB - rightA;
    side = 'left';
  } else {
    // A is to the right of B
    gapX = leftA - rightB;
    side = 'right';
  }

  const deltaTrim = Math.abs(posA.y - posB.y);
  const deltaZ = Math.abs(posA.z - posB.z);

  return { gapX, side, deltaTrim, deltaZ };
}

const wall1 = { widthM: 4.0, pos: { x: 0, y: 1.0, z: 0 } };
const wall2 = { widthM: 3.0, pos: { x: 3.8, y: 1.0, z: 0 } }; // rightA = 2.0, leftB = 3.8 - 1.5 = 2.3 -> gap = 0.3m

const res = calculateWallGap(wall1, wall2);
console.log('Gap result:', res);

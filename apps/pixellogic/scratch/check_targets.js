const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const checks = [
  'maskMode: null, // null | "rect" | "ellipse" | "polygon" | "select"',
  'ellipse: document.getElementById("mask-ellipse-btn"),',
  '<button id="mask-ellipse-btn"',
  'const maskEllipseBtn = document.getElementById("mask-ellipse-btn");',
  'if (maskEllipseBtn) maskEllipseBtn.addEventListener("click", () => setMaskMode("ellipse"));',
  'if (mask.id === selectedId && (mask.type === "rect" || mask.type === "ellipse") && !options.hideDimensions)',
  'if (mask.type === "ellipse") {',
  'if (mask.type !== "rect" && mask.type !== "ellipse") return null;',
  'if (state.canvasState.maskMode === "rect" || state.canvasState.maskMode === "ellipse") {'
];

checks.forEach(c => {
  console.log(c, '=>', content.includes(c));
});

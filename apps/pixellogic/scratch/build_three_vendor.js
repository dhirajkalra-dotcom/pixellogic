const fs = require('fs');
const path = require('path');

const cjsPath = path.join(__dirname, '..', 'node_modules', 'three', 'build', 'three.cjs');
const outPath = path.join(__dirname, '..', 'vendor', 'three.min.js');

const cjs = fs.readFileSync(cjsPath, 'utf8');
const wrapper = `(function(global) {
  var exports = {};
  var module = { exports: exports };
  ${cjs}
  global.THREE = module.exports || exports;
})(typeof window !== 'undefined' ? window : this);
`;

fs.writeFileSync(outPath, wrapper, 'utf8');
console.log('Successfully written vendor/three.min.js, size:', fs.statSync(outPath).size);

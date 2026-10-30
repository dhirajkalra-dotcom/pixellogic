const fs = require('fs');
const path = require('path');
const s = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = s.indexOf('const handleCanvasMouseDown = (e) => {');
const end = s.indexOf('const handleCanvasMouseMove = (e) => {', start);
const sub = s.slice(start, end);
console.log(sub.slice(7000, 9000));

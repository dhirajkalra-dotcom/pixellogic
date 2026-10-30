const fs = require('fs');
const path = require('path');
const s = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const idx = 2507999;
console.log(s.slice(idx - 50, idx + 2000));

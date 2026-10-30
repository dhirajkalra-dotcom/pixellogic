const fs = require('fs');
const path = require('path');
const s = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const idx = s.indexOf('const deleteSelectedMapFromCanvas =');
console.log('deleteSelectedMapFromCanvas at:', idx);
console.log(s.slice(idx, idx + 1000));

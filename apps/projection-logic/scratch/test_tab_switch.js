const fs = require('fs');

// We will extract script 20 (the main app script) and check what happens when renderCanvas is called
const content = fs.readFileSync('d:/pixellogic/index.html', 'utf8');

// Let's inspect around lines 31450 to 31800 where we made edits to see if any variable was removed or broken
console.log('Testing script integrity...');

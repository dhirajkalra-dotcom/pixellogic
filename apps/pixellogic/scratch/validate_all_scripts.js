const fs = require('fs');
const path = require('path');
const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match, count = 0;
while ((match = scriptRegex.exec(html)) !== null) {
    count++;
    const code = match[1];
    if (code.trim().length > 0) {
        try {
            new vm.Script(code, { filename: `inline-script-${count}.js` });
            console.log(`Script ${count} valid. Length: ${code.length}`);
        } catch (err) {
            console.error(`Syntax error in script ${count}:`, err);
            process.exit(1);
        }
    }
}
console.log(`All ${count} scripts validated successfully with 0 errors!`);

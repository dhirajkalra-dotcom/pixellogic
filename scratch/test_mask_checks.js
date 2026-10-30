const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8').replace(/\r\n/g, '\n');

// 1. Check for any leftover maskMode = "select"
const selectMatches = content.match(/maskMode\s*=\s*['"]select['"]/g);
console.log('Matches for maskMode = "select":', selectMatches ? selectMatches.length : 0);
if (selectMatches) {
    console.error('ERROR: maskMode is still assigned "select"!');
    process.exit(1);
}

// 2. Check that maskDeleteBtn resets maskMode to null
const delBtnCheck = content.includes('state.canvasState.maskMode = null;\n                    state.canvasState.maskDrawing = false;');
console.log('maskDeleteBtn resets maskMode to null:', delBtnCheck);
if (!delBtnCheck) { process.exit(1); }

// 3. Check that maskMode is reset to null upon rect/ellipse commit
const rectCommitCheck = content.includes('state.canvasState.maskMode = null;\n                updateMaskModeButtons();\n                syncSelectedMaskProperties();');
console.log('rect/ellipse mouseUp resets maskMode to null:', rectCommitCheck);
if (!rectCommitCheck) { process.exit(1); }

// 4. Check that polygon close resets maskMode to null
const polyCloseCheck = content.includes('state.canvasState.maskPolygonPoints = [];\n                        state.canvasState.maskMode = null;\n                        updateMaskModeButtons();');
console.log('polygon close resets maskMode to null:', polyCloseCheck);
if (!polyCloseCheck) { process.exit(1); }

// 5. Check that fall-through happens when clicking outside mask
const fallthroughCheck = content.includes('// Clicked outside any mask: if a mask was selected, deselect it and fall through to map hit-test');
console.log('Clicked outside mask falls through to map selection:', fallthroughCheck);
if (!fallthroughCheck) { process.exit(1); }

// 6. Check that Delete key resets maskMode to null
const keydownCheck = content.includes('state.canvasState.maskMode = null;\n                            state.canvasState.maskDrawing = false;');
console.log('Keydown delete resets maskMode to null:', keydownCheck);
if (!keydownCheck) { process.exit(1); }

console.log('ALL VERIFICATION CHECKS PASSED PERFECTLY!');

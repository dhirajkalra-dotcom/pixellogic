const fs = require('fs');
let content = fs.readFileSync('main.js', 'utf8');

const target = `  app.commandLine.appendSwitch('use-angle', 'd3d11');
  app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
}`;

const replacement = `  app.commandLine.appendSwitch('use-angle', 'd3d11');
  app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
  app.commandLine.appendSwitch('enable-accelerated-video-decode');
  app.commandLine.appendSwitch('gpu-rasterization-msaa-sample-count', '4');
}`;

if (!content.includes(target)) {
  // Try CRLF
  const targetCRLF = target.replace(/\n/g, '\r\n');
  const replacementCRLF = replacement.replace(/\n/g, '\r\n');
  if (content.includes(targetCRLF)) {
    content = content.replace(targetCRLF, replacementCRLF);
    fs.writeFileSync('main.js', content, 'utf8');
    console.log('Successfully updated main.js (CRLF)!');
    process.exit(0);
  }
  console.error('Target not found in main.js');
  process.exit(1);
}

content = content.replace(target, replacement);
fs.writeFileSync('main.js', content, 'utf8');
console.log('Successfully updated main.js!');

const fs = require('fs');
let content = fs.readFileSync('main.js', 'utf8');

const target = [
  "// Electron requires this override before app readiness; normal startup keeps GPU acceleration enabled.",
  "const gpuDisabledByEnvironment = process.env.PIXELLOGIC_DISABLE_GPU === '1';",
  "if (gpuDisabledByEnvironment) app.disableHardwareAcceleration();"
].join('\r\n');

const replacement = [
  "// Electron requires this override before app readiness; normal startup keeps GPU acceleration enabled.",
  "const gpuDisabledByEnvironment = process.env.PIXELLOGIC_DISABLE_GPU === '1';",
  "if (gpuDisabledByEnvironment) {",
  "  app.disableHardwareAcceleration();",
  "} else {",
  "  // DEDICATED HIGH-PERFORMANCE GPU ALLOCATION (NVIDIA / Discrete GPU)",
  "  // Forces Chromium, ANGLE, and Windows DirectX to route Pixelogic to the high-performance dedicated NVIDIA GPU",
  "  app.commandLine.appendSwitch('force_high_performance_gpu');",
  "  app.commandLine.appendSwitch('enable-gpu-rasterization');",
  "  app.commandLine.appendSwitch('enable-zero-copy');",
  "  app.commandLine.appendSwitch('ignore-gpu-blocklist');",
  "  app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');",
  "  app.commandLine.appendSwitch('use-angle', 'd3d11');",
  "  app.commandLine.appendSwitch('enable-accelerated-2d-canvas');",
  "}",
  "",
  "// Ensure Windows OS DirectX layer assigns Pixelogic executable to High-Performance dedicated GPU (NVIDIA)",
  "if (process.platform === 'win32' && !gpuDisabledByEnvironment) {",
  "  try {",
  "    const { exec } = require('child_process');",
  "    const exePath = process.execPath;",
  "    exec(`reg add \"HKCU\\\\Software\\\\Microsoft\\\\DirectX\\\\UserGpuPreferences\" /v \"${exePath}\" /t REG_SZ /d \"GpuPreference=2;\" /f`, () => {});",
  "  } catch (_) {}",
  "}"
].join('\r\n');

if (!content.includes(target)) {
  console.error('Target not found!');
  process.exit(1);
}
content = content.replace(target, replacement);
fs.writeFileSync('main.js', content, 'utf8');
console.log('Successfully updated main.js with dedicated GPU switches!');

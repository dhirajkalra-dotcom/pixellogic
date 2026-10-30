# Build the current desktop application as a browser-compatible bundle, then
# mirror that bundle into www/ for Capacitor to package.
$ErrorActionPreference = 'Stop'
$mobileRoot = $PSScriptRoot | Split-Path -Parent   # ...\mobile
$projectRoot = $mobileRoot | Split-Path -Parent    # repository root
$src = Join-Path $projectRoot 'web-app'
$dst = Join-Path $mobileRoot 'www'

Push-Location $projectRoot
try {
  npm run build:web
  if ($LASTEXITCODE -ne 0) {
    throw "The web build failed with exit code $LASTEXITCODE."
  }
}
finally {
  Pop-Location
}

if (-not (Test-Path $src)) {
  throw "Expected web build output was not found: $src"
}
if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Path $dst | Out-Null }

# /MIR mirrors; /XD excludes dirs; /XF excludes files.
robocopy $src $dst `
  /MIR `
  /XD (Join-Path $src 'node_modules') (Join-Path $src '.git') `
  /XF 'README.md' `
  /NFL /NDL /NJH /NJS /NP | Out-Null

# Robocopy uses exit codes 0-7 for successful copies and minor differences.
if ($LASTEXITCODE -gt 7) {
  throw "Failed to sync the web build into Capacitor assets (robocopy exit code $LASTEXITCODE)."
}

Write-Host "Synced current web build -> $dst"

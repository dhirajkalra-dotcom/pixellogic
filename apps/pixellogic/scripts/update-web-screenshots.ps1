$src = "d:\pixellogic\scripts\screenshots"
$dst = "d:\pixellogic\website\screenshots"

$map = @(
  @{ from = "03-Pixel-Designer.png";        to = "02-Pixel-Designer.png" },
  @{ from = "04-Special-Effects.png";        to = "03-Special-Effects.png" },
  @{ from = "05-2D-Visualizer.png";          to = "04-Visualizer.png" },
  @{ from = "06-3D-Visualizer.png";          to = "06-3D-Visualizer.png" },
  @{ from = "07-Output-Maps.png";            to = "05-Output-Maps.png" },
  @{ from = "08-Signal-Patching.png";        to = "06-Signal-Patching.png" },
  @{ from = "09-AV-Schematics.png";          to = "07-AV-Schematics.png" },
  @{ from = "10-PDF-Export.png";             to = "08-PDF-Export.png" },
  @{ from = "11-Power-Calc.png";             to = "11-Power-Calc.png" },
  @{ from = "12-Misc-Tools.png";             to = "09-Tools.png" },
  @{ from = "13-Projector-Test-Pattern.png"; to = "13-Projector-Test-Pattern.png" }
)

foreach ($m in $map) {
  $source = Join-Path $src $m.from
  $dest   = Join-Path $dst $m.to
  Copy-Item $source $dest -Force
  Write-Host "OK: $($m.from) -> $($m.to)"
}
Write-Host "All done."

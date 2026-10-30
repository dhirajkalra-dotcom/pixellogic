$f = "d:\pixellogic\src\av-engineering-pro.js"
$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
Write-Host "Loaded $($c.Length) bytes"

$crlf = "`r`n"

# 1. Schematic button label (CRLF before >)
$old = $crlf + "              > Schematic</button>"
$new = $crlf + "              > SCHEMATIC</button>"
$c2 = $c.Replace($old, $new)
if ($c2 -eq $c) { Write-Host "FAIL: schematic label" } else { Write-Host "OK: schematic label"; $c = $c2 }

# 2. Rack button label
$old = $crlf + "              > Rack</button>"
$new = $crlf + "              > RACK</button>"
$c2 = $c.Replace($old, $new)
if ($c2 -eq $c) { Write-Host "FAIL: rack label" } else { Write-Host "OK: rack label"; $c = $c2 }

# 3. Schematic active gradient
$old = "background: viewMode==='schematic' ? '#1d4ed8' : 'transparent'"
$new = "background: viewMode==='schematic' ? 'linear-gradient(160deg,#1d4ed8,#1e40af)' : '#040b18'"
$c2 = $c.Replace($old, $new)
if ($c2 -eq $c) { Write-Host "FAIL: schematic gradient" } else { Write-Host "OK: schematic gradient"; $c = $c2 }

# 4. Rack active gradient
$old = "background: viewMode==='rack' ? '#1d4ed8' : 'transparent'"
$new = "background: viewMode==='rack' ? 'linear-gradient(160deg,#1d4ed8,#1e40af)' : '#040b18'"
$c2 = $c.Replace($old, $new)
if ($c2 -eq $c) { Write-Host "FAIL: rack gradient" } else { Write-Host "OK: rack gradient"; $c = $c2 }

# 5. Button padding (x2)
$old = "padding:'4px 11px', cursor:'pointer', fontSize:10, fontWeight:700, letterSpacing:'0.03em'"
$new = "padding:'5px 14px', cursor:'pointer', fontSize:10, fontWeight:700, letterSpacing:'0.08em'"
$count = ([regex]::Matches($c, [regex]::Escape($old))).Count
if ($count -eq 0) { Write-Host "FAIL: button padding" } else { Write-Host "OK: button padding ($count rep)"; $c = $c.Replace($old, $new) }

# 6. Scroll hint shorter
$old = "Scroll = zoom Alt+drag = pan Drag ports = connect Del = delete"
$new = "scroll=zoom  alt+drag=pan  del=delete"
$c2 = $c.Replace($old, $new)
if ($c2 -eq $c) { Write-Host "FAIL: scroll hint" } else { Write-Host "OK: scroll hint"; $c = $c2 }

# 7. Replace Reset View button with zoom group + FIT ALL + RESET
$resetOld = "<button onClick=`${() => setViewport({x:0,y:0,scale:1})} style=`${{ " + $crlf + "background:'#0b1629', border:'1px solid #1e3a5f', color:'#475569', borderRadius:4, padding:'3px 9px', cursor:'pointer', fontSize:9, fontWeight:600 }}>Reset View</button>"
$zoomGroup = "<div style=`${{ display:'flex', alignItems:'stretch', border:'1px solid #1a3354', borderRadius:5, overflow:'hidden', flexShrink:0 }}>" + $crlf +
"                <button onClick=`${zoomOut} title=`"Zoom Out`" style=`${{ background:'#091421', border:'none', borderRight:'1px solid #1a3354', color:'#94a3b8', width:26, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', padding:0, lineHeight:1 }}>–</button>" + $crlf +
"                <span style=`${{ background:'#060f1e', color:'#64748b', padding:'0 8px', fontSize:9, fontWeight:700, fontFamily:'monospace', display:'flex', alignItems:'center', letterSpacing:'0.05em', minWidth:44, justifyContent:'center' }}>`${Math.round(viewport.scale*100)}%</span>" + $crlf +
"                <button onClick=`${zoomIn} title=`"Zoom In`" style=`${{ background:'#091421', border:'none', borderLeft:'1px solid #1a3354', color:'#94a3b8', width:26, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', padding:0, lineHeight:1 }}>+</button>" + $crlf +
"              </div>" + $crlf +
"              <button onClick=`${fitAll} style=`${{ background:'#091421', border:'1px solid #1a3354', color:'#60a5fa', borderRadius:4, padding:'3px 10px', cursor:'pointer', fontSize:9, fontWeight:700, letterSpacing:'0.05em', flexShrink:0 }}> FIT ALL</button>" + $crlf +
"              <button onClick=`${() => setViewport({x:0,y:0,scale:1})} style=`${{ background:'#091421', border:'1px solid #1a3354', color:'#475569', borderRadius:4, padding:'3px 10px', cursor:'pointer', fontSize:9, fontWeight:600, flexShrink:0 }}>RESET</button>"
$c2 = $c.Replace($resetOld, $zoomGroup)
if ($c2 -eq $c) { Write-Host "FAIL: zoom+reset group" } else { Write-Host "OK: zoom+reset group"; $c = $c2 }

[System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)
Write-Host "=== DONE. Size: $($c.Length) ==="

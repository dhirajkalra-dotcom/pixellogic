$f = "d:\pixellogic\src\av-engineering-pro.js"
$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
$crlf = [char]13 + [char]10

$old = "Scroll = zoom Alt+drag = pan Drag ports = connect Del = delete"
$new = "scroll=zoom  alt+drag=pan  del=delete"
$c2 = $c.Replace($old, $new)
if ($c2 -eq $c) { "FAIL scroll" } else { "OK scroll"; $c = $c2 }

$btnFull = "<button onClick=${() => setViewport({x:0,y:0,scale:1})} style=${{ " + $crlf + "background:'#0b1629', border:'1px solid #1e3a5f', color:'#475569', borderRadius:4, padding:'3px 9px', cursor:'pointer', fontSize:9, fontWeight:600 }}>Reset View</button>"
"Reset found: " + $c.Contains($btnFull)
$zg = "<div style=${{ display:'flex', alignItems:'stretch', border:'1px solid #1a3354', borderRadius:5, overflow:'hidden', flexShrink:0 }}>" + $crlf + "                <button onClick=${zoomOut} style=${{ background:'#091421', border:'none', borderRight:'1px solid #1a3354', color:'#94a3b8', width:26, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>-</button>" + $crlf + "                <span style=${{ background:'#060f1e', color:'#64748b', padding:'0 8px', fontSize:9, fontWeight:700, fontFamily:'monospace', display:'flex', alignItems:'center', letterSpacing:'0.05em', minWidth:44, justifyContent:'center' }}>${Math.round(viewport.scale*100)}%</span>" + $crlf + "                <button onClick=${zoomIn} style=${{ background:'#091421', border:'none', borderLeft:'1px solid #1a3354', color:'#94a3b8', width:26, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>+</button>" + $crlf + "              </div>" + $crlf + "              <button onClick=${fitAll} style=${{ background:'#091421', border:'1px solid #1a3354', color:'#60a5fa', borderRadius:4, padding:'3px 10px', cursor:'pointer', fontSize:9, fontWeight:700, letterSpacing:'0.05em', flexShrink:0 }}>FIT ALL</button>" + $crlf + "              <button onClick=${() => setViewport({x:0,y:0,scale:1})} style=${{ background:'#091421', border:'1px solid #1a3354', color:'#475569', borderRadius:4, padding:'3px 10px', cursor:'pointer', fontSize:9, fontWeight:600, flexShrink:0 }}>RESET</button>"
$c3 = $c.Replace($btnFull, $zg)
if ($c3 -eq $c) { "FAIL reset" } else { "OK reset+zoom"; $c = $c3 }

[System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)
"=== DONE ==="

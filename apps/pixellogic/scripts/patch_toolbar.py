#!/usr/bin/env python3
"""Patch AV Engineering toolbar with professional design + zoom controls."""

f = r"d:\pixellogic\src\av-engineering-pro.js"
with open(f, "r", encoding="utf-8") as fh:
    c = fh.read()

orig_len = len(c)
print(f"Loaded {orig_len} bytes")

def replace_once(c, old, new, label):
    if old not in c:
        print(f"FAIL: {label!r}")
        # Show snippet for debug
        words = old.strip()[:50]
        idx = c.find(words)
        if idx > 0:
            print(f"  Partial match at {idx}: {repr(c[idx:idx+80])}")
        return c
    c2 = c.replace(old, new, 1)
    print(f"OK: {label}")
    return c2

# ──────────────────────────────────────────────
# 1. Scroll hint → shorter
# ──────────────────────────────────────────────
# Note: separators are \u2003 (em-space) per actual file content
c = replace_once(c,
    "Scroll = zoom\u2003Alt+drag = pan\u2003Drag ports = connect\u2003Del = delete",
    "scroll=zoom  \u00b7  alt+drag=pan  \u00b7  del=delete",
    "scroll hint"
)

# ──────────────────────────────────────────────
# 2. Replace Reset View button with zoom group + FIT ALL + RESET
# File uses LF (\n) line endings; button is ONE long line
# ──────────────────────────────────────────────
reset_old = (
    "<button onClick=${() => setViewport({x:0,y:0,scale:1})} style=${{ "
    "background:'#0b1629', border:'1px solid #1e3a5f', color:'#475569', "
    "borderRadius:4, padding:'3px 9px', cursor:'pointer', fontSize:9, "
    "fontWeight:600 }}>Reset View</button>"
)

zoom_new = (
    "<div style=${{ display:'flex', alignItems:'stretch', border:'1px solid #1a3354', borderRadius:5, overflow:'hidden', flexShrink:0 }}>\n"
    "                <button onClick=${zoomOut} title=\"Zoom Out\" style=${{ background:'#091421', border:'none', borderRight:'1px solid #1a3354', color:'#94a3b8', width:26, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>&#8722;</button>\n"
    "                <span style=${{ background:'#060f1e', color:'#64748b', padding:'0 8px', fontSize:9, fontWeight:700, fontFamily:'monospace', display:'flex', alignItems:'center', letterSpacing:'0.05em', minWidth:44, justifyContent:'center' }}>${Math.round(viewport.scale*100)}%</span>\n"
    "                <button onClick=${zoomIn} title=\"Zoom In\" style=${{ background:'#091421', border:'none', borderLeft:'1px solid #1a3354', color:'#94a3b8', width:26, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>+</button>\n"
    "              </div>\n"
    "              <button onClick=${fitAll} style=${{ background:'#091421', border:'1px solid #1a3354', color:'#60a5fa', borderRadius:4, padding:'3px 10px', cursor:'pointer', fontSize:9, fontWeight:700, letterSpacing:'0.05em', flexShrink:0 }}>FIT ALL</button>\n"
    "              <button onClick=${() => setViewport({x:0,y:0,scale:1})} style=${{ background:'#091421', border:'1px solid #1a3354', color:'#475569', borderRadius:4, padding:'3px 10px', cursor:'pointer', fontSize:9, fontWeight:600, flexShrink:0 }}>RESET</button>"
)

c = replace_once(c, reset_old, zoom_new, "zoom+reset group")

with open(f, "w", encoding="utf-8") as fh:
    fh.write(c)

print(f"=== DONE. {orig_len} -> {len(c)} bytes ===")

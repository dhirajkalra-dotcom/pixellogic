#!/usr/bin/env python3
"""Patch AV Engineering:
1. Better drag visual - port glow/scale on compatible snap target
2. Directional arrows on connection lines (fwd/bwd/bidi)
3. Configurable cable label font size
"""

f = r"d:\pixellogic\src\av-engineering-pro.js"
with open(f, "r", encoding="utf-8") as fh:
    c = fh.read()

orig = len(c)
fails = []

def rep(c, old, new, label):
    if old not in c:
        fails.append(label)
        print(f"FAIL: {label}")
        return c
    print(f"OK:   {label}")
    return c.replace(old, new, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 1. onPortMouseDown — include portType in pendingConn so NodeCard can use it
# ─────────────────────────────────────────────────────────────────────────────
c = rep(c,
    """    function onPortMouseDown(e, nodeId, portId, isOutput) {
      e.stopPropagation();
      e.preventDefault();
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      const { x, y } = portCoords(node, portId, isOutput, nodeOverrides);
      setPendingConn({ nodeId, portId, isOutput, wx: x, wy: y });
    }""",
    """    function onPortMouseDown(e, nodeId, portId, isOutput) {
      e.stopPropagation();
      e.preventDefault();
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      const { x, y } = portCoords(node, portId, isOutput, nodeOverrides);
      const { inputs, outputs } = resolveNodePorts(node, nodeOverrides);
      const portObj = (isOutput ? outputs : inputs).find(p => p.id === portId);
      setPendingConn({ nodeId, portId, isOutput, wx: x, wy: y, portType: portObj?.type });
    }""",
    "onPortMouseDown portType"
)

# ─────────────────────────────────────────────────────────────────────────────
# 2. NodeCard — replace highlight logic with portType-aware version
# ─────────────────────────────────────────────────────────────────────────────
c = rep(c,
    """            // highlight compatible ports when in pending-connection mode
            const inpHighlight = pendingConn && pendingConn.isOutput && inp
              ? (validateConn(getPort(getNode([], pendingConn.nodeId)||{}, pendingConn.portId)?.type, inp.type).ok ? '#22c55e44' : '#ef444422')
              : '';
            const outHighlight = pendingConn && !pendingConn.isOutput && out
              ? (validateConn(out.type, getPort(getNode([], pendingConn.nodeId)||{}, pendingConn.portId)?.type).ok ? '#22c55e44' : '#ef444422')
              : '';""",
    """            // highlight compatible ports when in pending-connection mode
            const pendType = pendingConn?.portType;
            const inpCompat = pendingConn?.isOutput && inp  ? validateConn(pendType, inp.type).ok  : null;
            const outCompat = pendingConn && !pendingConn.isOutput && out ? validateConn(out.type, pendType).ok : null;
            const inpHighlight = inpCompat === true ? 'compat' : inpCompat === false ? 'incompat' : '';
            const outHighlight = outCompat === true ? 'compat' : outCompat === false ? 'incompat' : '';""",
    "NodeCard highlight logic"
)

# ─────────────────────────────────────────────────────────────────────────────
# 3. Input row background
# ─────────────────────────────────────────────────────────────────────────────
c = rep(c,
    "background: inpHighlight || 'transparent', borderRadius:'3px 0 0 3px', height:'100%' }}>",
    "background: inpHighlight==='compat' ? 'rgba(34,197,94,0.1)' : inpHighlight==='incompat' ? 'rgba(239,68,68,0.07)' : 'transparent', borderRadius:'3px 0 0 3px', height:'100%' }}>",
    "input row bg"
)

# ─────────────────────────────────────────────────────────────────────────────
# 4. Input port handle style
# ─────────────────────────────────────────────────────────────────────────────
c = rep(c,
    """                      style=${{
                        position:'absolute', left:-8,
                        width:14, height:14, borderRadius:'50%',
                        background: inpSig?.color || '#9ca3af',
                        border:'2px solid #0b1629',
                        cursor:'crosshair', flexShrink:0, zIndex:30,
                        boxShadow:`0 0 6px ${inpSig?.color || '#9ca3af'}66`,
                      }}""",
    """                      style=${{
                        position:'absolute', left:-8,
                        width:14, height:14, borderRadius:'50%',
                        background: inpHighlight==='compat' ? '#22c55e' : inpSig?.color || '#9ca3af',
                        border: inpHighlight==='compat' ? '2px solid #22c55e' : inpHighlight==='incompat' ? '2px solid rgba(239,68,68,0.5)' : '2px solid #0b1629',
                        cursor:'crosshair', flexShrink:0, zIndex:30,
                        boxShadow: inpHighlight==='compat' ? '0 0 0 5px rgba(34,197,94,0.3), 0 0 18px rgba(34,197,94,0.65)' : inpHighlight==='incompat' ? '0 0 4px rgba(239,68,68,0.3)' : `0 0 6px ${inpSig?.color || '#9ca3af'}66`,
                        transform: inpHighlight==='compat' ? 'scale(1.45)' : 'scale(1)',
                        transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                        opacity: inpHighlight==='incompat' ? 0.35 : 1,
                      }}""",
    "input port handle style"
)

# ─────────────────────────────────────────────────────────────────────────────
# 5. Output row background
# ─────────────────────────────────────────────────────────────────────────────
c = rep(c,
    "background: outHighlight || 'transparent', borderRadius:'0 3px 3px 0', height:'100%' }}>",
    "background: outHighlight==='compat' ? 'rgba(34,197,94,0.1)' : outHighlight==='incompat' ? 'rgba(239,68,68,0.07)' : 'transparent', borderRadius:'0 3px 3px 0', height:'100%' }}>",
    "output row bg"
)

# ─────────────────────────────────────────────────────────────────────────────
# 6. Output port handle style
# ─────────────────────────────────────────────────────────────────────────────
c = rep(c,
    """                      style=${{
                        position:'absolute', right:-8,
                        width:14, height:14, borderRadius:'50%',
                        background: outSig?.color || '#9ca3af',
                        border:'2px solid #0b1629',
                        cursor:'crosshair', flexShrink:0, zIndex:30,
                        boxShadow:`0 0 6px ${outSig?.color || '#9ca3af'}66`,
                      }}""",
    """                      style=${{
                        position:'absolute', right:-8,
                        width:14, height:14, borderRadius:'50%',
                        background: outHighlight==='compat' ? '#22c55e' : outSig?.color || '#9ca3af',
                        border: outHighlight==='compat' ? '2px solid #22c55e' : outHighlight==='incompat' ? '2px solid rgba(239,68,68,0.5)' : '2px solid #0b1629',
                        cursor:'crosshair', flexShrink:0, zIndex:30,
                        boxShadow: outHighlight==='compat' ? '0 0 0 5px rgba(34,197,94,0.3), 0 0 18px rgba(34,197,94,0.65)' : outHighlight==='incompat' ? '0 0 4px rgba(239,68,68,0.3)' : `0 0 6px ${outSig?.color || '#9ca3af'}66`,
                        transform: outHighlight==='compat' ? 'scale(1.45)' : 'scale(1)',
                        transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                        opacity: outHighlight==='incompat' ? 0.35 : 1,
                      }}""",
    "output port handle style"
)

# ─────────────────────────────────────────────────────────────────────────────
# 7. ConnectionLines — replace circles+label block with directional arrows + configurable font size
# ─────────────────────────────────────────────────────────────────────────────
c = rep(c,
    """              <!-- direction arrow at destination -->
              <circle cx=${x2} cy=${y2} r="3.5" fill=${strokeColor} opacity="0.95"/>
              <circle cx=${x1} cy=${y1} r="2.5" fill=${strokeColor} opacity="0.7"/>
              <!-- cable label badge -->
              ${cLabel && html`
                <g filter="url(#label-shadow)">
                  <rect
                    x=${lp.x - 4} y=${lp.y - 11}
                    width=${cLabel.length * 7.5 + 12} height="16"
                    rx="3" ry="3"
                    fill=${isSelected ? strokeColor : '#0f172a'}
                    stroke=${strokeColor} strokeWidth="1"
                    opacity=${isSelected ? 0.95 : 0.9}
                  />
                  <text
                    x=${lp.x} y=${lp.y + 1}
                    fontSize="9" fontWeight="700"
                    fill=${isSelected ? '#000' : strokeColor}
                    fontFamily="'Courier New',monospace"
                    letterSpacing="0.04em"
                    dominantBaseline="auto"
                  >${cLabel}</text>
                </g>
              `}""",
    """              <!-- directional arrows — fwd/bwd/bidi -->
              ${(() => {
                const dir = c.direction || 'fwd';
                // arrowhead pointing → at destination (final segment always arrives from left)
                const fwdArr = `M ${x2-11} ${y2-7} L ${x2-1} ${y2} L ${x2-11} ${y2+7} Z`;
                // arrowhead pointing ← at source (first segment always leaves going right)
                const bwdArr = `M ${x1+11} ${y1-7} L ${x1+1} ${y1} L ${x1+11} ${y1+7} Z`;
                const fs = c.cableLabelSize || 9;
                const bh = Math.ceil(fs * 2.1);
                const bw = Math.ceil(cLabel.length * fs * 0.67 + 14);
                return html\`
                  ${(dir === 'fwd' || dir === 'bidi') && html\`<path d=${fwdArr} fill=${strokeColor} opacity="0.9"/>\`}
                  ${(dir === 'bwd' || dir === 'bidi') && html\`<path d=${bwdArr} fill=${strokeColor} opacity="0.9"/>\`}
                  ${dir === 'fwd'  && html\`<circle cx=${x1} cy=${y1} r="2.5" fill=${strokeColor} opacity="0.55"/>\`}
                  ${dir === 'bwd'  && html\`<circle cx=${x2} cy=${y2} r="2.5" fill=${strokeColor} opacity="0.55"/>\`}
                  ${cLabel && html\`
                    <g filter="url(#label-shadow)">
                      <rect x=${lp.x-4} y=${lp.y - Math.round(bh*0.78)}
                        width=${bw} height=${bh} rx="3" ry="3"
                        fill=${isSelected ? strokeColor : '#0f172a'}
                        stroke=${strokeColor} strokeWidth="1"
                        opacity=${isSelected ? 0.95 : 0.9}/>
                      <text x=${lp.x} y=${lp.y + Math.round(bh*0.22)}
                        fontSize=${fs} fontWeight="700"
                        fill=${isSelected ? '#000' : strokeColor}
                        fontFamily="'Courier New',monospace"
                        letterSpacing="0.04em" dominantBaseline="auto"
                      >${cLabel}</text>
                    </g>
                  \`}
                \`;
              })()}""",
    "ConnectionLines arrows+label"
)

# ─────────────────────────────────────────────────────────────────────────────
# 8. Temp wire — thicker, glowing, with cursor indicator
# ─────────────────────────────────────────────────────────────────────────────
c = rep(c,
    """        <!-- temp in-progress wire -->
        ${tempConn && html`
          <path
            d=${orthoPath(tempConn.x1, tempConn.y1, tempConn.x2, tempConn.y2)}
            stroke="#60a5fa" strokeWidth="1.5" fill="none" strokeDasharray="8 6"
            strokeLinecap="square" opacity="0.65"
          />
        `}""",
    """        <!-- temp in-progress wire -->
        ${tempConn && html`
          <path d=${orthoPath(tempConn.x1, tempConn.y1, tempConn.x2, tempConn.y2)}
            stroke="#0f2a4a" strokeWidth="5" fill="none" strokeDasharray="11 8"
            strokeLinecap="round" opacity="0.6"/>
          <path d=${orthoPath(tempConn.x1, tempConn.y1, tempConn.x2, tempConn.y2)}
            stroke="#60a5fa" strokeWidth="2" fill="none" strokeDasharray="11 8"
            strokeLinecap="round" opacity="0.92" filter="url(#glow-sel)"/>
          <circle cx=${tempConn.x2} cy=${tempConn.y2} r="6" fill="none"
            stroke="#60a5fa" strokeWidth="1.5" opacity="0.7" filter="url(#glow-sel)"/>
          <circle cx=${tempConn.x2} cy=${tempConn.y2} r="3" fill="#60a5fa" opacity="0.9"/>
          <circle cx=${tempConn.x1} cy=${tempConn.y1} r="3" fill="#3b82f6" opacity="0.6"/>
        `}""",
    "tempConn wire"
)

# ─────────────────────────────────────────────────────────────────────────────
# 9. Add updateConn function in App right after renameConn
# ─────────────────────────────────────────────────────────────────────────────
c = rep(c,
    """    function renameConn(connId, newLabel) {
      setConnections(cs => cs.map(c => c.id === connId ? { ...c, cableLabel: newLabel } : c));
    }""",
    """    function renameConn(connId, newLabel) {
      setConnections(cs => cs.map(c => c.id === connId ? { ...c, cableLabel: newLabel } : c));
    }

    function updateConn(connId, patch) {
      setConnections(cs => cs.map(c => c.id === connId ? { ...c, ...patch } : c));
    }""",
    "updateConn function"
)

# ─────────────────────────────────────────────────────────────────────────────
# 10. Pass onUpdateConn to RightPanel in JSX
# ─────────────────────────────────────────────────────────────────────────────
c = rep(c,
    """          onRenameConn=${renameConn}
          onLoadProject=${loadProject}""",
    """          onRenameConn=${renameConn}
          onUpdateConn=${updateConn}
          onLoadProject=${loadProject}""",
    "pass onUpdateConn to RightPanel"
)

# ─────────────────────────────────────────────────────────────────────────────
# 11. Add onUpdateConn to RightPanel props signature
# ─────────────────────────────────────────────────────────────────────────────
c = rep(c,
    "function RightPanel({ mode, selectedNode, selectedConn, nodes, connections, nodeOverrides, viewport, onClose, onLabelChange, onUpgradeDevice, onDeleteConn, onRenameConn, onLoadProject, onConfigurePorts }) {",
    "function RightPanel({ mode, selectedNode, selectedConn, nodes, connections, nodeOverrides, viewport, onClose, onLabelChange, onUpgradeDevice, onDeleteConn, onRenameConn, onUpdateConn, onLoadProject, onConfigurePorts }) {",
    "RightPanel props signature"
)

# ─────────────────────────────────────────────────────────────────────────────
# 12. RightPanel conn section — add DIRECTION & LABEL SIZE after Cable ID block
# ─────────────────────────────────────────────────────────────────────────────
c = rep(c,
    """              style=${{ background:'#0f172a', border:'1px solid #334155', borderRadius:5,
                         color:'#f1f5f9', fontSize:12, fontWeight:700,
                         fontFamily:"'Courier New',monospace", padding:'6px 8px',
                         width:'100%', boxSizing:'border-box', outline:'none' }}
            />
          </div>
          <div style=${{ background:'#0f172a', borderRadius:6, border:'1px solid #1e2d40', padding:10 }}>
            <div style=${{ fontSize:10, color:'#64748b', marginBottom:4 }}>FROM</div>""",
    """              style=${{ background:'#0f172a', border:'1px solid #334155', borderRadius:5,
                         color:'#f1f5f9', fontSize:12, fontWeight:700,
                         fontFamily:"'Courier New',monospace", padding:'6px 8px',
                         width:'100%', boxSizing:'border-box', outline:'none' }}
            />
          </div>

          <!-- SIGNAL DIRECTION -->
          <div style=${{ display:'flex', flexDirection:'column', gap:4 }}>
            <label style=${{ fontSize:10, color:'#64748b', fontWeight:600, letterSpacing:'0.06em' }}>SIGNAL DIRECTION</label>
            <div style=${{ display:'flex', border:'1px solid #1e3a5f', borderRadius:6, overflow:'hidden' }}>
              ${['fwd','bidi','bwd'].map(dir => html`
                <button key=${dir}
                  onClick=${() => onUpdateConn(selectedConn.id, { direction: dir })}
                  style=${{ flex:1, background:(selectedConn.direction||'fwd')===dir ? 'linear-gradient(160deg,#1d4ed8,#1e40af)' : '#0a1628',
                    border:'none', borderRight: dir!=='bwd' ? '1px solid #1e3a5f' : 'none',
                    color:(selectedConn.direction||'fwd')===dir ? '#fff' : '#64748b',
                    padding:'6px 0', cursor:'pointer', fontSize:12, fontWeight:700, letterSpacing:'0.02em' }}
                >${dir==='fwd' ? '→' : dir==='bidi' ? '↔' : '←'}</button>
              `)}
            </div>
            <div style=${{ fontSize:9, color:'#334155', textAlign:'center' }}>
              ${(selectedConn.direction||'fwd')==='fwd' ? 'Output → Input (default)' : (selectedConn.direction||'fwd')==='bidi' ? 'Bidirectional signal' : 'Input → Output (return)'}
            </div>
          </div>

          <!-- LABEL FONT SIZE -->
          <div style=${{ display:'flex', flexDirection:'column', gap:4 }}>
            <label style=${{ fontSize:10, color:'#64748b', fontWeight:600, letterSpacing:'0.06em' }}>LABEL SIZE</label>
            <div style=${{ display:'flex', alignItems:'center', gap:4 }}>
              <button onClick=${() => onUpdateConn(selectedConn.id, { cableLabelSize: Math.max(7, (selectedConn.cableLabelSize||9)-1) })}
                style=${{ background:'#0a1628', border:'1px solid #1e3a5f', color:'#94a3b8', borderRadius:4, width:28, height:28, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>−</button>
              <span style=${{ flex:1, textAlign:'center', fontSize:14, fontWeight:700, color:'#f1f5f9', fontFamily:'monospace', background:'#0a1628', border:'1px solid #1e3a5f', borderRadius:4, padding:'4px 0' }}>${selectedConn.cableLabelSize||9}px</span>
              <button onClick=${() => onUpdateConn(selectedConn.id, { cableLabelSize: Math.min(22, (selectedConn.cableLabelSize||9)+1) })}
                style=${{ background:'#0a1628', border:'1px solid #1e3a5f', color:'#94a3b8', borderRadius:4, width:28, height:28, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>+</button>
            </div>
          </div>

          <div style=${{ background:'#0f172a', borderRadius:6, border:'1px solid #1e2d40', padding:10 }}>
            <div style=${{ fontSize:10, color:'#64748b', marginBottom:4 }}>FROM</div>""",
    "RightPanel direction+labelsize"
)

# ─────────────────────────────────────────────────────────────────────────────
with open(f, "w", encoding="utf-8") as fh:
    fh.write(c)

print(f"\n=== DONE. {orig} -> {len(c)} bytes. {len(fails)} failures: {fails} ===")

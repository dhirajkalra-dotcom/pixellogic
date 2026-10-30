#!/usr/bin/env python3
"""Add multiple distributed arrows along connection lines."""

f = r"d:\pixellogic\src\av-engineering-pro.js"
with open(f, "r", encoding="utf-8") as fh:
    c = fh.read()

orig = len(c)

# ─────────────────────────────────────────────────────────────────────────────
# 1. Add segmentArrows helper right after orthoLabelPos function
# ─────────────────────────────────────────────────────────────────────────────
OLD_ANCHOR = """  // ── Cable auto-label ─────────────────────────────────────────"""

NEW_HELPER = """  // ── Distributed segment arrows ──────────────────────────────
  //  Returns array of {x, y, angle} for chevrons placed every ~ARROW_STEP px
  //  along each segment of the orthogonal path, skipping very short segments.
  const ARROW_STEP = 58;  // pixels between arrows on a segment
  const ARROW_MIN_SEG = 36; // minimum segment length to draw an arrow on

  function segmentArrows(x1, y1, x2, y2, midXOffset = 0) {
    let segs;
    if (x2 > x1 + ORTHO_GAP * 2) {
      const mid = (x1 + x2) / 2 + midXOffset;
      segs = [
        { ax: x1, ay: y1, bx: mid, by: y1 },   // horizontal →
        { ax: mid, ay: y1, bx: mid, by: y2 },   // vertical
        { ax: mid, ay: y2, bx: x2, by: y2 },    // horizontal →
      ];
    } else {
      const ex1 = x1 + ORTHO_GAP + Math.max(0, midXOffset);
      const ex2 = x2 - ORTHO_GAP + Math.min(0, midXOffset);
      const topY = Math.min(y1, y2) - 44 - Math.abs(midXOffset) * 0.4;
      segs = [
        { ax: x1,  ay: y1,   bx: ex1, by: y1   },
        { ax: ex1, ay: y1,   bx: ex1, by: topY  },
        { ax: ex1, ay: topY, bx: ex2, by: topY  },
        { ax: ex2, ay: topY, bx: ex2, by: y2    },
        { ax: ex2, ay: y2,   bx: x2,  by: y2    },
      ];
    }

    const arrows = [];
    for (const { ax, ay, bx, by } of segs) {
      const dx = bx - ax, dy = by - ay;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < ARROW_MIN_SEG) continue;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      // place arrows at 1/3 and 2/3 for segments >= 2*ARROW_STEP, else at 1/2
      if (len >= ARROW_STEP * 1.7) {
        arrows.push({ x: ax + dx * 0.33, y: ay + dy * 0.33, angle });
        arrows.push({ x: ax + dx * 0.67, y: ay + dy * 0.67, angle });
      } else {
        arrows.push({ x: ax + dx * 0.5, y: ay + dy * 0.5, angle });
      }
    }
    return arrows;
  }

  // ── Cable auto-label ─────────────────────────────────────────"""

if OLD_ANCHOR in c:
    c = c.replace(OLD_ANCHOR, NEW_HELPER, 1)
    print("OK: segmentArrows helper added")
else:
    print("FAIL: anchor not found")

# ─────────────────────────────────────────────────────────────────────────────
# 2. Replace arrow rendering inside ConnectionLines IIFE
# ─────────────────────────────────────────────────────────────────────────────
OLD_ARROWS = """              ${(() => {
                const dir = c.direction || 'fwd';
                // arrowhead pointing → at destination (final segment always arrives from left)
                const fwdArr = `M ${x2-11} ${y2-7} L ${x2-1} ${y2} L ${x2-11} ${y2+7} Z`;
                // arrowhead pointing ← at source (first segment always leaves going right)
                const bwdArr = `M ${x1+11} ${y1-7} L ${x1+1} ${y1} L ${x1+11} ${y1+7} Z`;
                const fs = c.cableLabelSize || 9;
                const bh = Math.ceil(fs * 2.1);
                const bw = Math.ceil(cLabel.length * fs * 0.67 + 14);
                return html`
                  ${(dir === 'fwd' || dir === 'bidi') && html`<path d=${fwdArr} fill=${strokeColor} opacity="0.9"/>`}
                  ${(dir === 'bwd' || dir === 'bidi') && html`<path d=${bwdArr} fill=${strokeColor} opacity="0.9"/>`}
                  ${dir === 'fwd'  && html`<circle cx=${x1} cy=${y1} r="2.5" fill=${strokeColor} opacity="0.55"/>`}
                  ${dir === 'bwd'  && html`<circle cx=${x2} cy=${y2} r="2.5" fill=${strokeColor} opacity="0.55"/>`}
                  ${cLabel && html`
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
                  `}
                `;
              })()}"""

NEW_ARROWS = """              ${(() => {
                const dir = c.direction || 'fwd';
                const fs  = c.cableLabelSize || 9;
                const bh  = Math.ceil(fs * 2.1);
                const bw  = Math.ceil(cLabel.length * fs * 0.67 + 14);
                const arrowPts = segmentArrows(x1, y1, x2, y2, midXOffset);
                // For bwd, flip all angles 180°; for bidi show both directions
                const ao = isSelected ? 1 : 0.82;
                const chevron = (x, y, ang, flip) => {
                  const a = flip ? ang + 180 : ang;
                  // Chevron: two lines meeting at a point
                  const hw = 6, hh = 5;
                  return `M ${-hw} ${-hh} L ${hw*0.3} 0 L ${-hw} ${hh}`;
                };
                return html`
                  <!-- endpoint dot at source -->
                  <circle cx=${x1} cy=${y1} r="3" fill=${strokeColor} opacity="0.6"/>
                  <!-- distributed arrows along segments -->
                  ${arrowPts.map((pt, i) => html`
                    <g key=${i} transform=${`translate(${pt.x},${pt.y}) rotate(${dir==='bwd' ? pt.angle+180 : pt.angle})`}>
                      <path d="M -7 -5 L 1 0 L -7 5"
                        stroke=${strokeColor} strokeWidth=${isSelected ? 2.2 : 1.8}
                        fill="none" strokeLinecap="round" strokeLinejoin="round"
                        opacity=${ao}/>
                      ${dir === 'bidi' && html`
                        <path d="M 7 -5 L -1 0 L 7 5"
                          stroke=${strokeColor} strokeWidth=${isSelected ? 2.2 : 1.8}
                          fill="none" strokeLinecap="round" strokeLinejoin="round"
                          opacity=${ao}/>
                      `}
                    </g>
                  `)}
                  <!-- arrowhead at destination for fwd/bidi -->
                  ${(dir === 'fwd' || dir === 'bidi') && html`
                    <path d=${`M ${x2-12} ${y2-6} L ${x2-1} ${y2} L ${x2-12} ${y2+6}`}
                      stroke=${strokeColor} strokeWidth=${isSelected ? 2.4 : 2}
                      fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.95"/>
                  `}
                  <!-- arrowhead at source for bwd/bidi -->
                  ${(dir === 'bwd' || dir === 'bidi') && html`
                    <path d=${`M ${x1+12} ${y1-6} L ${x1+1} ${y1} L ${x1+12} ${y1+6}`}
                      stroke=${strokeColor} strokeWidth=${isSelected ? 2.4 : 2}
                      fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.95"/>
                  `}
                  <!-- cable label badge -->
                  ${cLabel && html`
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
                  `}
                `;
              })()}"""

if OLD_ARROWS in c:
    c = c.replace(OLD_ARROWS, NEW_ARROWS, 1)
    print("OK: multi-arrow rendering replaced")
else:
    print("FAIL: arrow block not found")

with open(f, "w", encoding="utf-8") as fh:
    fh.write(c)

print(f"=== DONE. {orig} -> {len(c)} bytes ===")

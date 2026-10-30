#!/usr/bin/env python3
"""Fix port cursor (+crosshair) and temp wire (flowing arrow)."""

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

# ─────────────────────────────────────────────────────────────────────
# 1. Add @keyframes animation to SVG <defs>
# ─────────────────────────────────────────────────────────────────────
c = rep(c,
    """        <defs>
          <filter id="glow-sel">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="label-shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.6"/>
          </filter>
        </defs>""",
    """        <defs>
          <filter id="glow-sel">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-wire">
            <feGaussianBlur stdDeviation="3.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="label-shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.6"/>
          </filter>
          <style>
            @keyframes wire-flow { to { stroke-dashoffset: -38; } }
            .wire-anim { animation: wire-flow 0.45s linear infinite; }
          </style>
          <marker id="arrow-tip" markerWidth="10" markerHeight="7"
            refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#60a5fa" opacity="0.95"/>
          </marker>
          <marker id="arrow-tip-dot" markerWidth="5" markerHeight="5"
            refX="2.5" refY="2.5" orient="auto">
            <circle cx="2.5" cy="2.5" r="2.5" fill="#60a5fa" opacity="0.7"/>
          </marker>
        </defs>""",
    "SVG defs animation + marker"
)

# ─────────────────────────────────────────────────────────────────────
# 2. Fix input port cursor: crosshair → pointer
# ─────────────────────────────────────────────────────────────────────
# There are 2 occurrences (input + output) - replace both
count = c.count("cursor:'crosshair', flexShrink:0, zIndex:30,")
if count == 0:
    fails.append("crosshair cursor")
    print("FAIL: cursor crosshair (not found)")
else:
    c = c.replace("cursor:'crosshair', flexShrink:0, zIndex:30,",
                  "cursor:'pointer', flexShrink:0, zIndex:30,")
    print(f"OK:   cursor crosshair -> pointer ({count} replacements)")

# ─────────────────────────────────────────────────────────────────────
# 3. Replace the temp wire block with animated flowing wire + arrowhead
# ─────────────────────────────────────────────────────────────────────
OLD_TEMP = """<!-- temp in-progress wire -->
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
        `}"""

NEW_TEMP = """<!-- temp in-progress wire -->
        ${tempConn && (() => {
          const td = orthoPath(tempConn.x1, tempConn.y1, tempConn.x2, tempConn.y2);
          const segs = segmentArrows(tempConn.x1, tempConn.y1, tempConn.x2, tempConn.y2);
          return html`
            <!-- glow shadow track -->
            <path d=${td} stroke="#0f2a4a" strokeWidth="6" fill="none"
              strokeDasharray="14 10" strokeLinecap="round" opacity="0.55"/>
            <!-- animated flowing wire -->
            <path d=${td} stroke="#60a5fa" strokeWidth="2.2" fill="none"
              strokeDasharray="14 10" strokeLinecap="round"
              opacity="0.95" filter="url(#glow-wire)" class="wire-anim"/>
            <!-- direction chevrons along path -->
            ${segs.map((pt, i) => html`
              <g key=${i} transform=${`translate(${pt.x},${pt.y}) rotate(${pt.angle})`}>
                <path d="M -8 -5.5 L 1 0 L -8 5.5"
                  stroke="#60a5fa" strokeWidth="2" fill="none"
                  strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>
              </g>
            `)}
            <!-- source dot -->
            <circle cx=${tempConn.x1} cy=${tempConn.y1} r="4"
              fill="#3b82f6" opacity="0.7" filter="url(#glow-sel)"/>
            <!-- destination: pulsing target ring + arrowhead -->
            <circle cx=${tempConn.x2} cy=${tempConn.y2} r="10" fill="none"
              stroke="#60a5fa" strokeWidth="1.5" opacity="0.5" filter="url(#glow-wire)"/>
            <circle cx=${tempConn.x2} cy=${tempConn.y2} r="5" fill="none"
              stroke="#60a5fa" strokeWidth="1.5" opacity="0.85"/>
            <circle cx=${tempConn.x2} cy=${tempConn.y2} r="2.5"
              fill="#60a5fa" opacity="1" filter="url(#glow-sel)"/>
          `;
        })()}"""

c = rep(c, OLD_TEMP, NEW_TEMP, "temp wire block")

# ─────────────────────────────────────────────────────────────────────
with open(f, "w", encoding="utf-8") as fh:
    fh.write(c)

print(f"\n=== DONE. {orig} -> {len(c)} bytes. Failures: {fails} ===")

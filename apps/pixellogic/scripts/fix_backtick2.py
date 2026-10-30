#!/usr/bin/env python3
"""Fix all remaining backslash-backtick sequences in the arrows IIFE block."""
f = r"d:\pixellogic\src\av-engineering-pro.js"
with open(f, "r", encoding="utf-8") as fh:
    c = fh.read()

# The arrows block is between 'const fwdArr' and the closing '})()}'
start = c.find('const fwdArr')
end   = c.find('})()}', start) + 5
block_old = c[start:end]

# Replace all backslash+backtick → just backtick
WRONG = "\\" + "`"   # backslash + backtick
RIGHT = "`"
block_new = block_old.replace(WRONG, RIGHT)

print(f"Fixed {block_old.count(WRONG)} occurrences in arrows block")
c2 = c[:start] + block_new + c[end:]
with open(f, "w", encoding="utf-8") as fh:
    fh.write(c2)
print("Done")

# show the result
start2 = c2.find('const fwdArr')
print(c2[start2:start2+1200])

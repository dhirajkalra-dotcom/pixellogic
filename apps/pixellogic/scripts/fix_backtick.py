#!/usr/bin/env python3
f = r"d:\pixellogic\src\av-engineering-pro.js"
with open(f, "r", encoding="utf-8") as fh:
    c = fh.read()

bs_bt = "html\\" + "`"   # html\`  (wrong - backslash before backtick)
bt    = "html`"           # html`   (correct)

count = c.count(bs_bt)
print(f"Found {count} occurrences of html\\`")

c2 = c.replace(bs_bt, bt)
with open(f, "w", encoding="utf-8") as fh:
    fh.write(c2)
print("Fixed. Remaining:", c2.count(bs_bt))

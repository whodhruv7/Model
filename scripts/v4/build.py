#!/usr/bin/env python3
"""Assemble Saathy v.4 — the OLD chat-only front end (v1 shell, exact) powered by
the full v3.1 backend engine (268 verified video links, plan pipeline, 5 games,
12 labs, reports, founder corpus). Front end = chat + instructions; everything
else is engine code (backend) reachable from the chat."""
import json, subprocess, sys, os

ROOT = "/home/z/my-project"
V4 = f"{ROOT}/scripts/v4"
V3 = f"{ROOT}/scripts/v3"
OUTS = [f"{ROOT}/public/Saathy.html", f"{ROOT}/download/Saathy.html"]

def read(p): return open(p, encoding="utf-8").read()

head   = read(f"{V4}/p0_head_html.txt")                       # <head> up to first <style>
css_a  = read(f"{V4}/p1_css_a.html")                          # v1 css block 1 (shell/sidebar)
css_d  = read(f"{V4}/p1_css_d.html")                          # NEW: stage/cards/instructions css
css_b  = read(f"{V4}/p1_css_b.html")                          # v1 css block 2 (chat)
css_c  = read(f"{V4}/p1_css_c.html")                          # v1 css block 3 (drawer/modals) + </style></head>
body   = read(f"{V4}/p2_body.html")                           # v1 body + instructions + stage + corpus

data   = read(f"{V3}/part3_videos.js") + "\n" + read(f"{V3}/part3_data.js")
eng    = read(f"{V4}/p4_engine.js")
chatjs = read(f"{V4}/p5_v1_js.html")                          # v1 js (3 script blocks, verbatim)
feat   = read(f"{V4}/p6_features.js") + "\n" + read(f"{V4}/p6b_labs.js")
catch_ = read(f"{V4}/p7a_catch.js")
glue   = read(f"{V4}/p7b_glue.js")

kbs = {
    "KB_gm": f"{ROOT}/src/data/books/ganita-manjari.json",
    "KB_sc": f"{ROOT}/src/data/books/science-exploration.json",
    "KB_us": f"{ROOT}/src/data/books/understanding-society.json",
}
islands = "\n".join(
    f'<script type="application/json" id="{k}">' + json.dumps(json.load(open(p, encoding="utf-8")), ensure_ascii=False, separators=(",", ":")) + "</script>"
    for k, p in kbs.items())

html = (
    head + "\n" + css_d + "\n" + css_a + css_b + css_c + "\n" + body + "\n" + islands + "\n"
    + "<script>\n" + data + "\n" + eng + "\n</script>\n"
    + chatjs + "\n"
    + "<script>\n" + feat + "\n</script>\n"
    + "<script>\n" + catch_ + "\n</script>\n"
    + "<script>\n" + glue + "\n</script>\n"
    + "</body>\n</html>\n"
)

for out in OUTS:
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"wrote {out} ({len(html):,} bytes)")

# syntax check each JS chunk
for name, src in [("data+engine", data + "\n" + eng), ("features", feat), ("catch", catch_), ("glue", glue)]:
    p = f"/tmp/v4_{name.replace('+','_')}.js"
    open(p, "w", encoding="utf-8").write(src)
    r = subprocess.run(["node", "--check", p], capture_output=True, text=True)
    print(f"JS {name}: {'OK' if r.returncode == 0 else 'SYNTAX ERROR'}")
    if r.returncode: print(r.stderr[:800]); sys.exit(1)
print("build complete")

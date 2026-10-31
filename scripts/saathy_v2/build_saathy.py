#!/usr/bin/env python3
"""Assemble Saathy v2 standalone HTML: books KB (condensed) + mascot assets + authored app code."""
import base64, json, os, re, sys

ROOT = "/home/z/my-project"
SRC = os.path.join(ROOT, "scripts", "saathy_v2")
BOOKS = ["ganita-manjari", "science-exploration", "understanding-society"]

MAX_SEC = 760
MAX_INTRO = 420

def one_line(s):
    return re.sub(r"\s+", " ", (s or "")).strip()

def trim(s, n):
    s = one_line(s)
    if len(s) <= n:
        return s
    return s[:n].rsplit(" ", 1)[0] + "…"

def condense_book(path):
    data = json.load(open(path))
    out = []
    for ch in data:
        secs = []
        for s in ch.get("sections", []):
            body = one_line(s.get("content") or "")
            if len(body) < 60:
                continue
            secs.append({"id": one_line(s.get("id", "")), "t": trim(s.get("title", ""), 120), "x": trim(body, MAX_SEC)})
        if not secs:
            continue
        out.append({
            "n": ch.get("number"), "g": ch.get("grade"), "t": one_line(ch.get("title", "")),
            "b": one_line(ch.get("book", "")), "i": trim(ch.get("intro", ""), MAX_INTRO), "s": secs,
        })
    return out

def b64(path):
    return "data:image/png;base64," + base64.b64encode(open(path, "rb").read()).decode()

def read(name):
    return open(os.path.join(SRC, name), encoding="utf-8").read()

def main():
    books = {}
    for b in BOOKS:
        books[b] = condense_book(os.path.join(ROOT, "src", "data", "books", b + ".json"))
        nsec = sum(len(c["s"]) for c in books[b])
        print(f"  {b}: {len(books[b])} chapters, {nsec} sections")

    assets = {}
    a_dir = os.path.join(ROOT, "download", "saathy-assets")
    for f in sorted(os.listdir(a_dir)):
        if f.endswith(".png"):
            assets[f[:-4]] = b64(os.path.join(a_dir, f))
    print(f"  assets: {len(assets)} poses/logo embedded")

    head = read("head.html")
    body = read("body.html")
    product_kb = read("product_kb.js")
    concepts = read("concepts.js") + read("concepts_part2.js")
    app_core = read("app_core.js")
    app_engine = read("app_engine.js")
    app_founder = read("app_founder.js")
    app_ai = read("app_ai.js")
    app_views = read("app_views.js")

    kb_json = json.dumps(books, ensure_ascii=False, separators=(",", ":"))
    assets_js = "window.ASSETS=" + json.dumps(assets) + ";"

    html = head
    html += body
    html += '\n<script type="application/json" id="KB_BOOKS">' + kb_json + "</script>\n"
    html += "<script>" + assets_js + "</script>\n"
    html += "<script>" + product_kb + "</script>\n"
    html += "<script>" + concepts + "</script>\n"
    html += "<script>" + app_core + "</script>\n"
    html += "<script>" + app_engine + "</script>\n"
    html += "<script>" + app_founder + "</script>\n"
    html += "<script>" + app_ai + "</script>\n"
    html += "<script>" + app_views + "</script>\n"
    html += "</body>\n</html>\n"

    for outp in [os.path.join(ROOT, "public", "Saathy.html"), os.path.join(ROOT, "download", "Saathy.html")]:
        open(outp, "w", encoding="utf-8").write(html)
        print(f"  wrote {outp} ({os.path.getsize(outp)//1024} KB)")

if __name__ == "__main__":
    main()

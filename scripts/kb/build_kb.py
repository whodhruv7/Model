#!/usr/bin/env python3
"""Build Ganita Manjari knowledge base JSON from extracted chapter texts.

Parses each chapter into numbered sections (N.N Title), keeps trimmed content,
emits src/data/books/ganita-manjari.json for the Saathy backend retrieval layer.
"""
import json, os, re, sys

ROOT = "/home/z/my-project"
OUT = os.path.join(ROOT, "src/data/books/ganita-manjari.json")

CHAPTERS = [
    # (file, grade, number, title)
    ("g9_ch101.txt", 9, 1, "Orienting Yourself: The Use of Coordinates"),
    ("g9_ch102.txt", 9, 2, "Introduction to Linear Polynomials"),
    ("g9_ch103.txt", 9, 3, "The World of Numbers"),
    ("g9_ch104.txt", 9, 4, "Exploring Algebraic Identities"),
    ("g9_ch105.txt", 9, 5, "Circles: Chords, Arcs and Angles"),
    ("g9_ch106.txt", 9, 6, "Measuring Space: Perimeter and Area"),
    ("g9_ch107.txt", 9, 7, "The Mathematics of Maybe: Probability"),
    ("g9_ch108.txt", 9, 8, "Predicting What Comes Next: Sequences and Progressions"),
    ("g10_ch201.txt", 10, 9, "Propositions and Number Patterns"),
    ("g10_ch202.txt", 10, 10, "How Quantities Combine: Understanding Data"),
    ("g10_ch203.txt", 10, 11, "The World of Algorithms"),
    ("g10_ch204.txt", 10, 12, "Quadrilaterals"),
    ("g10_ch205.txt", 10, 13, "Two Variables, One Line: Linear Equations"),
    ("g10_ch206.txt", 10, 14, "Math of Space: Surface Area and Volume"),
]

SEC_RE = re.compile(r"^(?:­)?(\d{1,2}\.\d+)\.?[\s\x00-\x1f]+([A-Z][^\n]{2,70})\s*$", re.M)

NOISE = re.compile(r"(Chapter \d+\.indd|Ganita Manjari|Part I+|\d{1,2}/\d{1,2}/\d{4})")

def quality(s: str) -> bool:
    """Reject junk 'sections' (page artefacts, exercise lists, near-empty)."""
    if len(s) < 350:
        return False
    letters = sum(c.isalpha() for c in s)
    return letters / max(len(s), 1) > 0.55 and not NOISE.search(s[:200])

def clean(t: str) -> str:
    t = t.replace("\u00ad", "")          # soft hyphen
    t = t.replace("\ufb01", "fi").replace("\ufb02", "fl")
    t = re.sub(r"Fig\.\s*\d+(\.\d+)?", "", t)
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()

def fix_title(t: str) -> str:
    # joined words like "aLine" from PDF extraction artefacts
    t = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", t)
    return re.sub(r"\s+", " ", t).strip()

def find_title_end(text: str, ch_num: int) -> int:
    """Content really starts after the big chapter-title block."""
    m = re.search(rf"\n{ch_num}\.1\s", text)
    return m.start() if m else 0

def parse_chapter(path: str, num: int) -> dict:
    raw = open(path, encoding="utf-8").read()
    raw = clean(raw)
    start = find_title_end(raw, num)
    body = raw[start:] if start else raw

    marks = [(m.start(), m.group(1), fix_title(m.group(2))) for m in SEC_RE.finditer(body)]
    # keep only sections whose first number == chapter number (top-level N.x)
    marks = [m for m in marks if m[1].split(".")[0] == str(num)]

    if marks:
        intro = body[: marks[0][0]].strip()
    else:
        intro = ""

    sections = []
    if marks:
        for i, (pos, sid, title) in enumerate(marks):
            end = marks[i + 1][0] if i + 1 < len(marks) else len(body)
            content = body[pos:end].strip()
            # drop the duplicated "N.N Title" heading line from content
            content = re.sub(rf"^{sid}\.?[\s\x00-\x1f]+{re.escape(title)}\s*\n", "", content)
            if quality(content):
                sections.append({"id": sid, "title": title, "content": content[:2400]})
    else:
        # Fallback: no numbered sections (e.g. proposition-style chapters) —
        # chunk the body at paragraph boundaries so retrieval still works.
        paras = [p.strip() for p in body.split("\n\n") if len(p.strip()) > 120]
        chunks, cur = [], ""
        for p in paras:
            cur += ("\n\n" if cur else "") + p
            if len(cur) >= 1800:
                chunks.append(cur); cur = ""
        if cur.strip():
            chunks.append(cur.strip())
        for i, ctext in enumerate(chunks[:8]):
            sections.append({"id": f"{num}.{i+1}", "title": f"Part {i+1}", "content": ctext[:2400]})

    return {"intro": intro[:1600], "sections": sections}

def main():
    kb = []
    for fname, grade, num, title in CHAPTERS:
        path = os.path.join(ROOT, "scripts/kb", fname)
        if not os.path.exists(path):
            print(f"!! missing {fname}", file=sys.stderr); continue
        ch = parse_chapter(path, num)
        entry = {"grade": grade, "number": num, "title": title, "file": fname, **ch}
        kb.append(entry)
        sec_ids = [s["id"] for s in ch["sections"]]
        print(f"Ch{num:>2} G{grade} {title[:46]:<48} sections={len(sec_ids)} intro={len(ch['intro'])}c")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(kb, f, ensure_ascii=False, indent=1)
    total = sum(len(c["sections"]) for c in kb)
    print(f"\nWROTE {OUT} — {len(kb)} chapters, {total} sections, {os.path.getsize(OUT)//1024} KB")

if __name__ == "__main__":
    main()

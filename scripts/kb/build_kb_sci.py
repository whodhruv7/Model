#!/usr/bin/env python3
"""Build the Science ("Exploration", NCERT Grade 9) knowledge base JSON.

Source: OCR text of every page (scripts/kb/ocr/sci/NNN.txt, 1-indexed pages).
Chapters are sliced by page ranges; sections are found via the book's own
numbered headings ("3.2 Tissues for Growth in Plants", "12.6.4 Kingdom Plantae").
Emits src/data/books/science-exploration.json — same shape as the other KBs.
"""
import glob, json, os, re, sys, unicodedata

ROOT = "/home/z/my-project"
OCR_DIR = os.path.join(ROOT, "scripts/kb/ocr/sci")
OUT = os.path.join(ROOT, "src/data/books/science-exploration.json")

# (firstPage, lastPage, number, title) — inclusive 1-indexed book pages
CHAPTERS = [
    (21, 32, 1, "Exploration: Entering the World of Secondary Science"),
    (33, 48, 2, "Cell: The Building Block of Life"),
    (49, 78, 3, "Tissues in Action"),
    (79, 96, 4, "Describing Motion Around Us"),
    (97, 112, 5, "Exploring Mixtures and their Separation"),
    (113, 142, 6, "How Forces Affect Motion"),
    (143, 164, 7, "Work, Energy, and Simple Machines"),
    (165, 186, 8, "Journey Inside the Atom"),
    (187, 204, 9, "Atomic Foundations of Matter"),
    (205, 228, 10, "Sound Waves: Characteristics and Applications"),
    (229, 256, 11, "Reproduction: How Life Continues"),
    (257, 270, 12, "Patterns in Life: Diversity and Classification"),
    (271, 284, 13, "Earth as a System: Energy, Matter, and Life"),
]

BOOK = "Exploration: Science G9"

def clean(t: str) -> str:
    t = unicodedata.normalize("NFKC", t)
    t = (t.replace("\r", "\n").replace("\u00ad", "")
          .replace("\ufb01", "fi").replace("\ufb02", "fl")
          .replace("’", "'").replace("“", '"').replace("”", '"')
          .replace("–", "-").replace("—", "-"))
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r" ?\n ?", "\n", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()

def fix_title(t: str) -> str:
    t = re.sub(r"\s+", " ", t).strip(" -–.:")
    t = re.sub(r"\s*Fig\.? \d+.*$", "", t)
    return t.strip()

def quality(text: str) -> bool:
    body = text.strip()
    if len(body) < 380:
        return False
    letters = sum(ch.isalpha() for ch in body)
    if letters / max(len(body), 1) < 0.62:
        return False
    words = body.split()
    if len(words) < 60:
        return False
    avg = len(body) / max(len(words), 1)
    if avg > 14:  # OCR garbage: absurd "words"
        return False
    return True

def sec_heading_re(num: int):
    # "6.2 Force", "12.6.4 Kingdom Plantae— ...", possibly split across lines
    n = num
    return re.compile(rf"(?m)^({n}\.\d+(?:\.\d+)?)\.?\s+([^\n]{{4,80}})$")

def parse_chapter(pages_text: str, num: int):
    body = pages_text
    marks = []
    for m in sec_heading_re(num).finditer(body):
        sid, title = m.group(1), fix_title(m.group(2))
        # heading sanity: mostly letters, not an activity/exercise label
        letters = sum(c.isalpha() for c in title)
        if letters < max(3, int(len(title) * 0.55)):
            continue
        if re.match(r"(?i)^(activity|exercise|let us|pause|revise|fig|table|example)", title):
            continue
        # top-level first (N.x) preferred; deep N.x.y also kept but ordered
        marks.append((m.start(), sid, title))
    if not marks:
        return None
    seen, uniq = set(), []
    for pos, sid, title in marks:
        key = sid + "|" + title.lower()[:24]
        if key in seen:
            continue
        seen.add(key)
        uniq.append((pos, sid, title))
    marks = uniq

    intro = body[: marks[0][0]].strip()
    sections = []
    for i, (pos, sid, title) in enumerate(marks):
        end = marks[i + 1][0] if i + 1 < len(marks) else len(body)
        content = body[pos:end].strip()
        content = re.sub(rf"^{re.escape(sid)}\.?\s*{re.escape(title)}\s*\n", "", content)
        content = re.sub(r"\n{3,}", "\n\n", content)
        if quality(content):
            sections.append({"id": sid, "title": title, "content": content[:2600]})
    return {"intro": intro[:1500], "sections": sections}

def main():
    files = {int(os.path.basename(p)[:3]): p for p in glob.glob(os.path.join(OCR_DIR, "*.txt"))}
    kb = []
    for first, last, num, title in CHAPTERS:
        pages = []
        for p in range(first, last + 1):
            if p in files:
                pages.append(clean(open(files[p], encoding="utf-8").read()))
        body = "\n\n".join(pages)
        parsed = parse_chapter(body, num)
        if not parsed or not parsed["sections"]:
            # fallback: paragraph chunking so retrieval still works (intro chapters)
            paras = [p.strip() for p in body.split("\n\n") if len(p.strip()) > 140]
            chunks, cur = [], ""
            for p in paras:
                cur += ("\n\n" if cur else "") + p
                if len(cur) >= 1700:
                    chunks.append(cur); cur = ""
            if cur.strip():
                chunks.append(cur.strip())
            if not chunks:
                print(f"!! Ch{num} {title[:40]} -> NO sections", file=sys.stderr)
                continue
            parsed = {"intro": "", "sections": [
                {"id": f"{num}.{i+1}", "title": f"Part {i+1}", "content": c[:2600]}
                for i, c in enumerate(chunks[:8]) if quality(c)]}
        entry = {"grade": 9, "number": num, "title": title, "book": BOOK,
                 "part": 1, "file": f"sci_pages_{first}-{last}", **parsed}
        kb.append(entry)
        print(f"Ch{num:>2} {title[:48]:<50} sections={len(entry['sections'])} intro={len(parsed['intro'])}c")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(kb, f, ensure_ascii=False, indent=1)
    total = sum(len(c["sections"]) for c in kb)
    print(f"\nWROTE {OUT} - {len(kb)} chapters, {total} sections, {os.path.getsize(OUT)//1024} KB")

if __name__ == "__main__":
    main()

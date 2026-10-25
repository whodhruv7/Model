#!/usr/bin/env python3
"""Build Understanding Society (SST) knowledge base JSON.

The NCERT "Understanding Society: India and Beyond" books use unnumbered
headings, so each chapter carries a curated ordered list of section titles;
the parser locates each heading in the extracted text and slices sections.
Emits src/data/books/understanding-society.json (same shape as ganita-manjari
plus book metadata) for the Saathy backend retrieval layer.
"""
import json, os, re, sys

ROOT = "/home/z/my-project"
OUT = os.path.join(ROOT, "src/data/books/understanding-society.json")
KB_DIR = os.path.join(ROOT, "scripts/kb")

# (file, grade, part, bookChapter, uniqueNumber, title, [section titles])
CHAPTERS = [
    ("sst_g9p1_ch3.txt", 9, 1, 3, 101, "Atmosphere and Climate", [
        "Composition of the Atmosphere",
        "Structure of the Atmosphere",
        "Weather and Climate",
        "Elements of Weather and Climate",
        "Seasons in India",
    ]),
    ("sst_g9p1_ch8.txt", 9, 1, 8, 102, "Building Blocks in Economics: The Problem of Choice", [
        "Choices and Limited Resources",
        "Key Questions in Economics",
        "Factors of Production",
        "Economic Systems and How Choices are Made",
        "Economic Survey: A Report on Indian Economy",
    ]),
    ("sst_g9p1_ch9.txt", 9, 1, 9, 103, "The Price Puzzle: What Drives the Market", [
        "Demand",
        "Demand Schedule",
        "Demand Curve",
        "Other Determinants of Demand",
        "Supply",
        "Supply Schedule",
        "Supply Curve",
        "Market Equilibrium",
        "Provision of Public Goods",
        "Limitations of Government Intervention",
    ]),
    ("sst_g9p2_ch1.txt", 9, 2, 1, 104, "Oceans and Life", [
        "Ocean Relief",
        "Movement of Ocean Water",
        "Waves",
        "Tides",
        "Ocean Currents",
        "Cyclones and Tsunamis",
        "Early Warning Systems",
        "Marine Resources and Their Significance",
        "Blue Economy",
        "Maritime Zones",
        "International Maritime Rules and Regulations",
    ]),
    ("sst_g9p2_ch2.txt", 9, 2, 2, 105, "Life on Earth", [
        "Types of Biomes",
        "Terrestrial Biomes",
        "Aquatic Biomes",
        "Biome Pyramid",
        "Interconnectedness between Biomes and Living Beings",
        "Biodiversity",
        "Forest Ecotourism",
        "Forests and Livelihoods",
        "Geographical Indication",
        "Challenges Faced by People Living in Forests",
        "Government Efforts to Support Forest Dwellers",
        "Ecological Commons",
    ]),
    ("sst_g9p2_ch3.txt", 9, 2, 3, 106, "Resistance and Resilience (1000-1700 CE)", [
        "Safeguarding Sovereignty",
        "Rajput Dynasties",
        "Rajput-Mughal Dynamics",
        "Mewar's Resistance against Mughals",
        "The Ahom Kingdom",
        "Vijayanagara Empire",
        "Marathas",
        "The Sikhs",
        "Jat Resistance",
        "Bhakti Tradition",
        "Sulh-i-Kul",
        "Temples",
        "Indian Economy: Agriculture, Trading Networks, and Merchant Communities",
    ]),
    ("sst_g9p2_ch4.txt", 9, 2, 4, 107, "Governance and Public Policy", [
        "Governance",
        "Understanding Government and Governance",
        "Evolution of Governance in India",
        "Good Governance",
        "Challenges to Good Governance",
        "E-Governance",
        "Public Policy",
        "The Meaning of Public Policy",
        "Participants in the Public Policy Process",
        "The Making of a Public Policy",
        "Policy Coordination",
    ]),
    ("sst_g9p2_ch5.txt", 9, 2, 5, 108, "Managing Your Personal Finances", [
        "Pillars of Personal Finance",
        "Budgeting",
        "Saving",
        "Investing",
        "Common Investment Options",
        "Insurance",
        "Borrowing and Credit",
        "Risk and Return",
        "Taxes",
        "Personal Income Tax",
    ]),
    ("sst_g9p2_ch6.txt", 9, 2, 6, 109, "From Ideas to Startups", [
        "Business Plan",
        "Functional Areas of a Business",
        "Management and Operations",
        "Finance and Accounting",
        "Human Resources",
        "Marketing and Sales",
        "India's Traditional Entrepreneurial Community",
        "Startups and Their Contribution to the Nation",
    ]),
]

NOISE = re.compile(r"(Chapter \d+\.indd|Understanding Society|Grade 9 Part|\d{1,2}/\d{1,2}/\d{4})")

def clean(t: str) -> str:
    t = t.replace("\u00ad", "")
    t = t.replace("\ufb01", "fi").replace("\ufb02", "fl")
    t = t.replace("\u2019", "'").replace("\u2018", "'")
    t = re.sub(r"[\u2010-\u2015\u2212]", "-", t)
    # Students type "shivaji", the book prints "Śhivājī" — fold all IAST
    # diacritics to plain ASCII so retrieval matches how kids actually type.
    import unicodedata as _ud
    t = _ud.normalize("NFD", t)
    t = "".join(c for c in t if not _ud.combining(c))
    t = _ud.normalize("NFC", t)
    t = re.sub(r"Fig\.\s*\d+(\.\d+)?", "", t)
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()

def quality(s: str) -> bool:
    if len(s) < 320:
        return False
    letters = sum(c.isalpha() for c in s)
    return letters / max(len(s), 1) > 0.5 and not NOISE.search(s[:160])

def heading_rx(title: str) -> re.Pattern:
    """Heading regex: words may wrap, dashes/quotes normalised, and the
    printed heading may continue on the same line after the matched words
    (e.g. 'Bhakti Tradition: Affirmation of the Spirit')."""
    words = [re.escape(w) for w in re.split(r"\s+", title) if w]
    return re.compile(r"^" + r"[\s\x00-\x1f]+".join(words) + r"[\s\x00-\x1f]*:?[ \t]?[^\n]{0,80}$", re.M | re.I)

def parse_chapter(path: str, num_unique: int, book_chapter: int, titles: list[str]) -> dict:
    raw = clean(open(path, encoding="utf-8").read())

    # Body starts after the chapter title block / Big Questions.
    start = 0
    m = re.search(r"Big\s+Questions", raw)
    if m:
        # skip the questions list: content usually resumes after the last "N." item
        tail = raw[m.start(): m.start() + 2600]
        lastq = None
        for qm in re.finditer(r"(?m)^\s*\d\.\s*$", tail):
            lastq = qm
        start = m.start() + (lastq.end() + 40 if lastq else 200)
        start = min(start, len(raw) - 1)
    body = raw[start:]

    # locate every curated heading (in document order, strictly increasing)
    marks: list[tuple[int, str]] = []
    cursor = 0
    for t in titles:
        rx = heading_rx(t)
        found = None
        for m2 in rx.finditer(body):
            if m2.start() >= cursor:
                found = m2
                break
        if found:
            marks.append((found.start(), t))
            cursor = found.end()
        else:
            print(f"   .. miss: {t!r}", file=sys.stderr)

    # always-end section: Questions and activities
    qm = None
    for m3 in re.finditer(r"^Questions\s+and\s+activities\s*:?\s*$", body, re.M | re.I):
        if not marks or m3.start() > marks[-1][0]:
            qm = m3
    if qm:
        marks.append((qm.start(), "Questions and Activities"))

    if not marks:
        return {"intro": body[:1500], "sections": []}

    intro = body[: marks[0][0]].strip()
    # drop the Big Questions list from intro tail if present
    intro = re.sub(r"Big\s+Questions[\s\S]*", "", intro) if "Big Questions" in intro[:400] else intro

    sections = []
    for i, (pos, title) in enumerate(marks):
        end = marks[i + 1][0] if i + 1 < len(marks) else len(body)
        content = body[pos:end].strip()
        content = re.sub(rf"^{re.escape(title)}\s*:?\s*\n", "", content, flags=re.I)
        if quality(content):
            sections.append({"id": f"{num_unique}.{len(sections)+1}", "title": title, "content": content[:2600]})

    return {"intro": intro[:1500], "sections": sections}

def main():
    kb = []
    for fname, grade, part, bch, unum, title, titles in CHAPTERS:
        path = os.path.join(KB_DIR, fname)
        if not os.path.exists(path):
            print(f"!! missing {fname}", file=sys.stderr); continue
        ch = parse_chapter(path, unum, bch, titles)
        entry = {
            "grade": grade, "part": part, "number": unum, "bookChapter": bch,
            "book": "Understanding Society", "title": title, **ch,
        }
        kb.append(entry)
        ids = [s["id"] for s in ch["sections"]]
        print(f"Ch{unum} G{grade}P{part} {title[:44]:<46} sections={len(ids)} intro={len(ch['intro'])}c")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(kb, f, ensure_ascii=False, indent=1)
    total = sum(len(c["sections"]) for c in kb)
    print(f"\nWROTE {OUT} — {len(kb)} chapters, {total} sections, {os.path.getsize(OUT)//1024} KB")

if __name__ == "__main__":
    main()

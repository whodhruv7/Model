# Saathy Artifact Spec — read fully before writing your chapter file

You are one of many parallel content agents building the VidhyaSaathy learning modules.
You write ONE JSON file for ONE chapter (or a part of a big chapter). The file is consumed
directly by the Next.js app (`/learn` modules), so the schema must be EXACT.

## Source of truth (HARD RULES)
1. Your chapter's real textbook content lives in `/home/z/my-project/src/data/books/<file>.json`
   - gm  → `ganita-manjari.json`   (chapters array, `number` = 1..14)
   - sc  → `science-exploration.json`
   - us  → `understanding-society.json`  (`number` = 101..109)
   Find your chapter by `number`. Each chapter has `sections: [{id, title, content}]`.
2. Every fact, number, name, definition, story reference MUST come from that content.
   NEVER invent facts, dates, formulas or examples that are not grounded in the book text.
   You may add ONE tiny everyday analogy per item, but the teaching content stays from the book.
3. No markdown symbols in any string: no `**`, no `#`, no `|---|`, no bullet chars.
   Plain sentences. Math like x^2, a/b, sqrt(a^2+b^2) written in plain text is fine.
4. Language: clear simple English a 13–15 year old enjoys. Short sentences. The book's own
   characters (e.g. Reiaan, Shalini) and Bhaaratiya heritage references (Baudhāyana etc.)
   should appear where the book uses them — judges must feel the book's soul.
   `kicker` and `note` fields may have a light friendly Hinglish line; body stays English.
5. Every string field is REQUIRED unless marked optional. No empty strings.

## File schema (exact)
```json
{
  "book": "gm|sc|us",
  "chapter": 3,
  "part": "a",                                  // ONLY for split chapters, else omit
  "title": "exact chapter title from the book",
  "grade": 9,
  "sections": [ { "id": "3.1", "title": "..." } ],   // the sections THIS FILE covers, same order as book
  "slides": [
    { "id": "sc-ch03a-s1", "sec": "3.1",
      "title": "short slide title (max 6 words)",
      "kicker": "one-line hook, max 10 words",
      "bullets": ["2 to 4 bullets, each max 140 chars"],
      "visual": { "kind": "steps|compare|flow|labels|tree|plot", ...data },   // optional, see below
      "note": "optional 1-line margin scribble, friendly" }
  ],
  "flashcards": [
    { "id": "sc-ch03a-f1", "sec": "3.1",
      "front": "a sharp question (max 90 chars)",
      "back": "the answer in 1-2 sentences (max 160 chars)",
      "tag": "definition|formula|concept|example|trivia" }
  ],
  "quiz": [
    { "id": "sc-ch03a-q1", "sec": "3.1",
      "q": "question text (max 160 chars)",
      "options": ["exactly 4 options"],
      "answer": 0,                                // index 0..3 of the correct option
      "why": "one-line reason grounded in the book (max 140 chars)",
      "difficulty": "easy|medium|hard" }
  ],
  "examples": [
    { "id": "sc-ch03a-e1", "title": "worked example title",
      "problem": "the full problem statement",
      "steps": ["step 1", "step 2", "step 3+"],
      "answer": "final answer" }
  ],
  "conceptMap": {                                 // ONLY in the file covering the FIRST sections of a chapter (part "a" or single file)
    "center": "chapter short name",
    "groups": [ { "id": "g1", "label": "..." } ],       // 3 to 5 groups
    "nodes":  [ { "id": "n1", "label": "max 4 words", "group": "g1" } ],  // 10 to 14 nodes
    "edges":  [ { "from": "n1", "to": "n2", "label": "optional tiny label" } ]  // 10 to 16 edges
  },
  "flowchart": {                                  // same rule as conceptMap
    "title": "how this chapter flows",
    "steps": [ { "id": "s1", "label": "max 4 words", "detail": "one line" } ],  // 6 to 10 steps
    "edges": [ [0,1], [1,2] ]                     // indices into steps
  }
}
```

## Visual kinds (data shapes)
- steps:  { "kind":"steps",  "items":["first","then","finally"] }            // 3-5 items
- compare:{ "kind":"compare","left":{"title":"...","items":["a","b"]},"right":{"title":"...","items":["x","y"]} }
- flow:   { "kind":"flow",   "items":["box1","box2","box3","box4"] }         // 3-5 boxes, arrows auto-drawn
- labels: { "kind":"labels", "items":["keyword","keyword","keyword"] }       // 4-8 keyword pills
- tree:   { "kind":"tree",   "root":"...","children":["...","...","..."] }   // 3-6 children
- plot:   { "kind":"plot",   "type":"line|bar", "xlabel":"...", "ylabel":"...", "points":[[1,2],[2,4]] } // numbers only

## Required counts (validator enforces)
Per SECTION in your file:  >=3 slides, >=3 flashcards, >=3 quiz questions.
Per FILE:                  >=1 examples item (2-4 preferred).
Per CHAPTER (part "a" or single file): 1 conceptMap, 1 flowchart.
Mix quiz difficulty: roughly half easy, some medium, at least one hard per file.

## ID rules (must be globally unique)
Prefix = <book>-ch<NN><part>:  slides s1.., flashcards f1.., quiz q1.., examples e1..
Single-file chapter: "gm-ch05-s1". Split part: "sc-ch03a-s1", "sc-ch03b-s1".

## Quality bar (judges will read this)
- A slide should TEACH one idea, not dump the section. Bullets are complete thoughts.
- Flashcard fronts must be answerable without seeing options.
- Quiz wrong options must be plausible (common misconceptions), never silly.
- Examples must show full working, step by step, ending with a clear final answer.
- No placeholders, no "TODO", no "etc." laziness, no repeated identical items.

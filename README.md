# Saathy ☁️ — the AI Learning Companion of VidhyaSaathy

> **Learning, with you.**

Saathy is a production-grade, full-stack AI tutor built for Indian Class 9-10 students. It teaches **from the school's own textbook (Ganita Manjari, Grades 9-10 — 14 chapters, indexed locally)**, adapts to every student through a **4-tier internal banding system**, and gates every new concept behind a fun **Level Check** of cute interactive cards.

This repo is the complete working system: Next.js 16 frontend + streaming LLM backend + textbook knowledge engine + mastery database. It is architecturally ready to be embedded inside the VidhyaSaathy app — the backend already speaks clean JSON contracts (`/api/*`) that the parent app can call.

---

## The experience, end to end

1. **Student asks anything** — "explain factorisation", "solve this", "practise probability".
2. **Level Check first** — for any concept the student has never been assessed on, Saathy does NOT lecture immediately. It sends 2-3 **basics questions as cute, animated cards** (one at a time, mascot reacts, honest "why" after each answer). No numbers are ever shown — "this is just a start, not a score".
3. **4-tier classification** — answers map to the internal bands `0-25% / 25-50% / 50-75% / 75-100%` (VS-22). Students only ever see friendly concept statuses: *Let's fix this · Building up · Almost there · Mastered*.
4. **Tier-aware teaching** — the lesson is pitched to the band: band 0 gets smallest steps + everyday examples; band 2 gets application + exam traps; band 3 gets pushed one level beyond the textbook.
5. **Artifacts** — visual concepts arrive with interactive machines: parabola lab, AP/GP dot machine, probability dice simulator, Pythagoras square-cut, number line, slope-intercept line grapher — plus animated SVG charts from the lesson's own numbers.
6. **Quick Check loop** — every explanation ends with an adaptive MCQ; wrong answers trigger an honest reason → re-explain → fresh question loop, with a 2-level hint ladder that never gives the answer away.
7. **Download the chat** — any conversation exports to a standalone, styled HTML file (theme, mascot, math, sources, cards baked in).

## Honesty layer (non-negotiable)

- Answers grounded in the textbook cite it inline — `(Ganita Manjari, Ch 3)` + section chips.
- Anything beyond the book is flagged as general knowledge first.
- No fake "training succeeded" states, no invented sources, no invented authority.

## Architecture

```
src/
├── app/
│   ├── page.tsx                    # the single-user-visible route (chat app)
│   └── api/
│       ├── chat/route.ts           # SSE streaming chat + meta rescue + book grounding
│       ├── evidence/route.ts       # mastery updates (quick checks + level checks)
│       ├── context/route.ts        # student tree + mastery snapshot (integration contract)
│       ├── conversations/…         # history CRUD
│       ├── profile/route.ts        # student profile + preferences
│       ├── books/route.ts          # Ganita Manjari corpus tree
│       ├── export/html/route.ts    # standalone HTML export of any conversation
│       └── founder/…               # PIN-gated provider config (default PIN 2405)
├── components/saathy/
│   ├── chat-app.tsx                # orchestrator: streaming, mastery loop, layout
│   ├── level-check.tsx             # the cute-cards diagnostic (flagship)
│   ├── artifacts/artifact-card.tsx # chart renderer + 6 interactive concept machines
│   ├── quick-check.tsx             # adaptive MCQ card (hint ladder, why loop)
│   ├── mascot.tsx                  # interactive cloud mascot (poke → sparkle + bubble)
│   ├── message-bubble.tsx, composer.tsx, sidebar.tsx, settings-sheet.tsx, markdown.tsx
├── server/saathy/
│   ├── prompt.ts                   # identity, anti-AI-voice, tier directives, level-check gate, artifact contract, honesty layer
│   ├── books.ts                    # Ganita Manjari retrieval (tokenised index, chapter hints)
│   ├── providers.ts                # provider adapter: built-in GLM or any OpenAI-compatible key
│   └── context.ts                  # student context assembly (the only file to swap for real RAG)
├── lib/saathy-types.ts             # tiers, mastery math, artifact/levelcheck contracts
├── lib/saathy-meta.ts              # ```saathy meta-block parser + structural rescue
└── data/books/ganita-manjari.json  # the indexed textbook (14 chapters / 70 sections)
scripts/kb/                         # KB pipeline: build_kb.py + seed_books.ts
prisma/schema.prisma                # profile, subjects→chapters→concepts, mastery, evidence, notes, conversations, settings
```

## Integration contract (for the VidhyaSaathy app)

The parent app can drive Saathy without touching its internals:

| Endpoint | Purpose |
|---|---|
| `GET /api/context` | hydrate the student tree + mastery states |
| `POST /api/evidence` | push quiz/practice/levelcheck events (batch mode supported) |
| `POST /api/chat` | same streaming shapes the UI uses (`mode`, `focusConceptId`, hint/why sub-requests) |
| `GET /api/books` | the indexed textbook tree |
| `GET /api/export/html?conversationId=` | styled standalone HTML of a conversation |

Provider is swappable in Founder Settings (PIN-gated): built-in GLM or any OpenAI-compatible endpoint. Keys live only in the local DB, masked in UI, never logged.

## Running locally

```bash
bun install
bun run db:push                 # create SQLite DB
bun scripts/kb/seed_books.ts    # seed Ganita Manjari tree (14 chapters, 47 concepts)
bun run dev                     # http://localhost:3000
```

Environment: `DATABASE_URL` (SQLite) in `.env`. The built-in provider needs no key; custom providers are configured in-app.

## Content pipeline

The textbook text is extracted from the Ganita Manjari PDFs (`pdftotext`) and structured by `scripts/kb/build_kb.py` into `src/data/books/ganita-manjari.json`. Retrieval (`src/server/saathy/books.ts`) scores sections per query, boosts the hinted chapter, and injects the top excerpts as grounding. To extend to new books: add the PDF, extract text, extend the chapter table, rebuild the JSON.

---

VidhyaSaathy · Learning, with you. ☁️

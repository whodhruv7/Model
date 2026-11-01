// /api/learn/resolve — match a free-text topic to a chapter of the artifact
// library (all 3 books), so the chat can deep-link "learn <topic>" into the
// full-screen learning module.
import { NextRequest, NextResponse } from "next/server";
import { allChapters, bookInfo } from "@/lib/learn/artifacts";

export const dynamic = "force-dynamic";

const STOP = new Set(["learn", "module", "seekho", "padho", "padhna", "chapter", "the", "a", "an", "of", "me", "karo", "open", "please", "my", "ka", "ki", "ke", "about", "for"]);

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { topic?: string; book?: string };
    const raw = (body.topic ?? "").toLowerCase().trim();
    if (!raw) return NextResponse.json({ learn: null });

    // candidate tokens: drop stopwords
    const tokens = raw.split(/[^a-z0-9]+/i).filter(w => w.length > 2 && !STOP.has(w));
    if (tokens.length === 0) return NextResponse.json({ learn: null });

    let pool = allChapters();
    if (body.book && ["gm", "sc", "us"].includes(body.book)) pool = pool.filter(c => c.book === body.book);

    let best: { ch: (typeof pool)[number]; score: number } | null = null;
    for (const ch of pool) {
      const title = ch.title.toLowerCase();
      const secText = ch.sections.map(s => `${s.id} ${s.title}`.toLowerCase()).join(" ");
      let score = 0;
      for (const t of tokens) {
        if (title.includes(t)) score += 6;                     // chapter title hit = strongest
        if (secText.includes(t)) score += 2;                   // section title hit
        if (title.startsWith(t)) score += 3;                   // word-boundary start
      }
      // exact title containment bonus
      if (tokens.length >= 2 && tokens.every(t => title.includes(t))) score += 8;
      if (!best || score > best.score) best = { ch, score };
    }

    if (!best || best.score < 4) return NextResponse.json({ learn: null });
    const { ch } = best;
    const info = bookInfo(ch.book);
    return NextResponse.json({
      learn: {
        book: ch.book,
        bookName: info.name,
        chapter: ch.chapter,
        title: ch.title,
        slides: ch.slides.length,
        cards: ch.flashcards.length,
        quiz: ch.quiz.length,
      },
    });
  } catch {
    return NextResponse.json({ learn: null });
  }
}

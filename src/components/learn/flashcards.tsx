"use client";
// Flashcards — real flip cards on notebook paper, taped to the desk.
import { useMemo, useState } from "react";
import type { ChapterArtifacts } from "@/lib/learn/artifacts";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const TAG_COLORS: Record<string, string> = {
  definition: "#2a5298",
  formula: "#3e7d4d",
  concept: "#8a5aa8",
  example: "#b0552f",
  trivia: "#7a6a4a",
};

export function FlashcardDeck({ chapter, onDone, onExit }: { chapter: ChapterArtifacts; onDone: (res: { known: number; total: number }) => void; onExit: () => void }) {
  const [seed] = useState(0);
  const cards = useMemo(() => shuffle(chapter.flashcards).slice(0, Math.min(14, chapter.flashcards.length)), [chapter.flashcards, seed]);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<string[]>([]);
  const [notYet, setNotYet] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  if (done || cards.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto slide-stage px-4 py-8 sm:items-center">
        <div className="w-full max-w-lg">
          <div className="relative paper-sheet rounded-2xl px-6 py-8 text-center shadow-[0_18px_44px_rgba(16,43,76,0.14)]">
            <div className="tape left-1/2 top-[-12px]" aria-hidden />
            <div className="paper-body !pl-0">
              <p className="scribble text-[16px]">revision pouch se nikala ✎</p>
              <div className="font-hand text-[54px] font-bold leading-none text-[#16305b]">{known.length}<span className="text-[26px] text-[#637c96]">/{cards.length || chapter.flashcards.length}</span></div>
              <p className="mt-1 text-[14px] font-bold text-[#637c96]">cards aate hain ab tumhe</p>
              <p className="font-note mt-3 text-[16px] leading-relaxed text-[#2b3a67]">
                {notYet.length === 0 ? "Poori deck clear — quiz me ab top karoge!" : `${notYet.length} cards abhi "almost" hain — ek baar phir palto, phir games khelo.`}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                <button type="button" onClick={() => onDone({ known: known.length, total: cards.length })} className="rounded-full bg-[#16305b] px-6 py-2.5 text-[13.5px] font-extrabold text-white shadow-[0_6px_16px_rgba(22,48,91,0.35)] hover:bg-[#214F78]">Games pe chalo →</button>
                <button type="button" onClick={() => { setI(0); setFlipped(false); setKnown([]); setNotYet([]); setDone(false); }} className="rounded-full border border-[#d8dde7] bg-white px-5 py-2.5 text-[13.5px] font-extrabold text-[#17324f] hover:bg-[#f2f7fd]">Dobara palto</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const c = cards[i];
  const mark = (knewIt: boolean) => {
    if (knewIt) setKnown(k => [...k, c.id]); else setNotYet(k => [...k, c.id]);
    if (i + 1 >= cards.length) setDone(true);
    else { setI(i + 1); setFlipped(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col slide-stage">
      <div className="flex items-center justify-between gap-3 border-b border-[#e4e9f1] bg-white/80 px-4 py-2.5 backdrop-blur">
        <button type="button" onClick={onExit} className="rounded-full border border-[#d8dde7] bg-white px-3.5 py-1.5 text-[12.5px] font-extrabold text-[#17324f] hover:bg-[#f2f7fd]">✕ Exit cards</button>
        <p className="min-w-0 flex-1 truncate text-center text-[12.5px] font-bold text-[#637c96]">{chapter.title} — flashcards</p>
        <p className="shrink-0 rounded-full bg-[#eef4fb] px-3 py-1 text-[12px] font-extrabold text-[#2a5298]">{i + 1} / {cards.length}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-4 py-6">
        <div className="flex gap-4 text-[12px] font-extrabold text-[#637c96]">
          <span className="rounded-full bg-[#eef8f0] px-3 py-1 text-[#3e7d4d]">✓ {known.length}</span>
          <span className="rounded-full bg-[#fdf0ea] px-3 py-1 text-[#b0552f]">↻ {notYet.length}</span>
        </div>

        {/* the flip card */}
        <div className="flip-scene w-full max-w-lg" style={{ minHeight: 300 }}>
          <button
            type="button"
            aria-label={flipped ? "Show question side" : "Reveal answer"}
            onClick={() => setFlipped(f => !f)}
            className={`flip-inner block h-full w-full text-left ${flipped ? "flipped" : ""}`}
            style={{ minHeight: 300 }}
          >
            {/* FRONT — the question */}
            <div className="flip-face paper-sheet relative rounded-2xl px-6 py-8 shadow-[0_18px_44px_rgba(16,43,76,0.16)]" style={{ minHeight: 300 }}>
              <div className="tape left-8 top-[-12px]" aria-hidden />
              <div className="paper-body flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <span className="rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-widest text-white" style={{ background: TAG_COLORS[c.tag] ?? "#2a5298", fontFamily: "var(--font-manrope)" }}>{c.tag}</span>
                  <span className="font-hand text-[15px] text-[#637c96]">card {i + 1}</span>
                </div>
                <p className="font-hand mt-4 text-[26px] font-bold leading-snug text-[#16305b] sm:text-[30px]">{c.front}</p>
                <p className="scribble mt-auto text-[15px]">tap to flip →</p>
              </div>
            </div>
            {/* BACK — the answer, checked handwriting */}
            <div className="flip-face flip-back paper-sheet relative rounded-2xl px-6 py-8 shadow-[0_18px_44px_rgba(16,43,76,0.16)]" style={{ minHeight: 300, background: "linear-gradient(180deg,#fffdf6 0%,#fbf7ec 100%)" }}>
              <div className="tape right-8 top-[-12px] rotate-[3deg]" aria-hidden />
              <div className="paper-body flex h-full flex-col">
                <p className="scribble text-[15px]">answer</p>
                <p className="font-note mt-2 text-[17.5px] leading-relaxed text-[#2b3a67] sm:text-[19px]">{c.back}</p>
                <p className="scribble mt-auto text-[15px]">yaad hai? neeche batao ↓</p>
              </div>
            </div>
          </button>
        </div>

        {/* know / again */}
        <div className="flex w-full max-w-lg gap-3">
          <button type="button" onClick={() => mark(false)} disabled={!flipped} className="flex-1 rounded-2xl border-2 border-[#f0c9b4] bg-[#fff3ea] px-4 py-3 font-hand text-[19px] font-bold text-[#b0552f] shadow-[0_2px_8px_rgba(176,85,47,0.10)] transition enabled:hover:bg-[#ffe9da] disabled:opacity-40">↻ Dobara paltoonga</button>
          <button type="button" onClick={() => mark(true)} disabled={!flipped} className="flex-1 rounded-2xl border-2 border-[#b7ddbe] bg-[#eef8f0] px-4 py-3 font-hand text-[19px] font-bold text-[#3e7d4d] shadow-[0_2px_8px_rgba(62,125,77,0.10)] transition enabled:hover:bg-[#e2f3e5] disabled:opacity-40">✓ Yaad hai!</button>
        </div>
        <p className="text-[11.5px] font-semibold text-[#8a94a8]">pehle socho, phir flip karo — wahi asli revision hai</p>
      </div>
    </div>
  );
}

"use client";
// ChapterWorld — the full learning flow per chapter, exactly the promised loop:
//   level check (4 tiers) → Explore (map+flowchart) → Learn (slides) → Try (quiz)
//   → Fix (flashcards, auto-suggested when quiz < 75%) → Play (games) → Master (report).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ChapterArtifacts } from "@/lib/learn/artifacts";
import { bookInfo, chaptersOf } from "@/lib/learn/artifacts";
import { ConceptMapView } from "./concept-map";
import { FlowChartView } from "./flow-chart";
import { SlideStage } from "./slide-stage";
import { QuizPaper } from "./quiz-paper";
import { FlashcardDeck } from "./flashcards";
import { GameHub } from "./games";

type StepKey = "explore" | "learn" | "try" | "fix" | "play" | "master";
const STEPS: { key: StepKey; label: string; desc: string; icon: string }[] = [
  { key: "explore", label: "Explore", desc: "chapter ka naksha dekho", icon: "🗺️" },
  { key: "learn", label: "Learn", desc: "slides se concept samjho", icon: "📖" },
  { key: "try", label: "Try", desc: "worksheet quiz do", icon: "✍️" },
  { key: "fix", label: "Fix", desc: "flashcards se yaad pakka", icon: "🔁" },
  { key: "play", label: "Play", desc: "games me score banao", icon: "🎮" },
  { key: "master", label: "Master", desc: "report + aage ka plan", icon: "🏆" },
];

interface Progress { band: number | null; slidesViewed: number; quizBest: number; cardsKnown: number; xp: number; done: StepKey[] }
const EMPTY: Progress = { band: null, slidesViewed: 0, quizBest: 0, cardsKnown: 0, xp: 0, done: [] };

function loadProgress(book: string, ch: number): Progress {
  try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(`saathy.learn.${book}.${ch}`) ?? "{}") }; } catch { return EMPTY; }
}
function saveProgress(book: string, ch: number, p: Progress) {
  try { localStorage.setItem(`saathy.learn.${book}.${ch}`, JSON.stringify(p)); } catch { /* private mode */ }
}

export function ChapterWorld({ chapter }: { chapter: ChapterArtifacts }) {
  const info = bookInfo(chapter.book);
  const [prog, setProg] = useState<Progress>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [overlay, setOverlay] = useState<null | "slides" | "quiz" | "flash" | "games" | "gate">(null);
  const [gateDone, setGateDone] = useState(false);
  const [tab, setTab] = useState<"map" | "flow">("map");

  useEffect(() => {
    const p = loadProgress(chapter.book, chapter.chapter);
    // defer hydration to a microtask so the effect doesn't setState synchronously
    let alive = true;
    (async () => { await Promise.resolve(); if (!alive) return; setProg(p); setHydrated(true); if (p.band === null) setOverlay("gate"); })();
    return () => { alive = false; };
  }, [chapter]);
  useEffect(() => { if (hydrated) saveProgress(chapter.book, chapter.chapter, prog); }, [prog, hydrated, chapter]);

  const upd = (patch: Partial<Progress>) => setProg(p => ({ ...p, ...patch }));
  const markDone = (k: StepKey) => setProg(p => ({ ...p, done: p.done.includes(k) ? p.done : [...p.done, k] }));

  const bandLabel = prog.band === null ? "" : ["Basics se shuru", "Basic-plus", "Beech se", "Top se"][prog.band];
  const nextIdx = STEPS.findIndex(s => !prog.done.includes(s.key));
  const nextKey: StepKey = STEPS[Math.max(0, nextIdx === -1 ? STEPS.length - 1 : nextIdx)].key;

  const chapters = useMemo(() => chaptersOf(chapter.book), [chapter.book]);
  const chIdx = chapters.findIndex(c => c.chapter === chapter.chapter);
  const prevCh = chIdx > 0 ? chapters[chIdx - 1] : null;
  const nextCh = chIdx >= 0 && chIdx < chapters.length - 1 ? chapters[chIdx + 1] : null;

  if (!hydrated) return <div className="flex min-h-[60vh] items-center justify-center text-[13px] font-bold text-[#637c96]">khol rahe hain…</div>;

  /* ---------- LEVEL GATE (4 tiers) ---------- */
  if (overlay === "gate") return (
    <LevelGate chapter={chapter} onDone={band => { upd({ band }); setGateDone(true); setOverlay(null); }} />
  );

  /* ---------- OVERLAYS ---------- */
  return (
    <div className="min-h-screen bg-[#f6f9fc]">
      {/* ======== page header ======== */}
      <div className="sticky top-0 z-30 border-b border-[#e4e9f1] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/learn" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d8dde7] bg-white text-[15px] font-extrabold text-[#17324f] hover:bg-[#f2f7fd]" aria-label="All books">←</Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14.5px] font-extrabold leading-tight text-[#16305b]">{chapter.title}</p>
            <p className="truncate text-[11.5px] font-bold text-[#637c96]">{info.name} · Grade {chapter.grade} · {chapter.sections.length} sections · {chapter.slides.length} slides · {chapter.flashcards.length} cards · {chapter.quiz.length} quiz Qs</p>
          </div>
          {prog.band !== null && <span className="hidden shrink-0 rounded-full bg-[#eef4fb] px-3 py-1 text-[11.5px] font-extrabold text-[#2a5298] sm:block">Level {prog.band + 1}/4 · {bandLabel}</span>}
          <Link href="/" className="hidden shrink-0 rounded-full bg-[#16305b] px-4 py-1.5 text-[12px] font-extrabold text-white hover:bg-[#214F78] sm:block">Saathy chat</Link>
        </div>
        {/* flow ribbon */}
        <div className="mx-auto max-w-6xl overflow-x-auto px-4 pb-2.5">
          <div className="flex min-w-max items-center gap-1.5">
            {STEPS.map((s, i) => {
              const isDone = prog.done.includes(s.key);
              const isNext = s.key === nextKey;
              return (
                <div key={s.key} className="flex items-center gap-1.5">
                  <button type="button" onClick={() => {
                    if (s.key === "explore") return;
                    if (s.key === "learn") setOverlay("slides");
                    if (s.key === "try") setOverlay("quiz");
                    if (s.key === "fix") setOverlay("flash");
                    if (s.key === "play") setOverlay("games");
                    if (s.key === "master") setTab("map");
                  }}
                    className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-[12px] font-extrabold transition ${isDone ? "border-[#9fd8a8] bg-[#eef8f0] text-[#3e7d4d]" : isNext ? "border-[#f0b490] bg-[#fff1e7] text-[#b0552f]" : "border-[#e4e9f1] bg-white text-[#637c96] hover:border-[#c9d6e4]"}`}>
                    <span>{s.icon}</span>{s.label}{isDone && " ✓"}
                  </button>
                  {i < STEPS.length - 1 && <span aria-hidden className="font-hand text-[15px] text-[#b0552f] opacity-70">→</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ======== body ======== */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* hero flow cards (reference: "How You'll Learn") */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <HeroCard icon="🎯" title={`Level ${(prog.band ?? 0) + 1}/4`} sub={prog.band !== null ? bandLabel : "level check ho chuka"} />
          <HeroCard icon="📖" title={`${prog.slidesViewed}/${chapter.slides.length}`} sub="slides dekhi" />
          <HeroCard icon="✍️" title={prog.quizBest ? `${prog.quizBest}%` : "—"} sub="quiz best score" />
          <HeroCard icon="⭐" title={`${prog.xp} XP`} sub="game station se" />
        </div>

        {/* explore: concept map + flowchart */}
        <div className="rounded-3xl border border-[#e4e9f1] bg-white p-4 shadow-[0_10px_28px_rgba(16,43,76,0.07)] sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-hand text-[26px] font-bold leading-tight text-[#16305b]">{chapter.conceptMap ? chapter.conceptMap.center : chapter.title} — ka naksha</h2>
              <p className="text-[12.5px] font-semibold text-[#637c96]">Explore karo: poora chapter ek nazar me, phir flow pe chalo.</p>
            </div>
            <div className="flex rounded-full border border-[#d8dde7] bg-[#f6f9fc] p-1">
              <button type="button" onClick={() => setTab("map")} className={`rounded-full px-3.5 py-1.5 text-[12px] font-extrabold ${tab === "map" ? "bg-[#16305b] text-white" : "text-[#637c96]"}`}>Concept map</button>
              <button type="button" onClick={() => setTab("flow")} disabled={!chapter.flowchart} className={`rounded-full px-3.5 py-1.5 text-[12px] font-extrabold disabled:opacity-40 ${tab === "flow" ? "bg-[#16305b] text-white" : "text-[#637c96]"}`}>Chapter flow</button>
            </div>
          </div>
          {tab === "map" && chapter.conceptMap && <ConceptMapView map={chapter.conceptMap} />}
          {tab === "flow" && chapter.flowchart && <FlowChartView chart={chapter.flowchart} />}

          {/* sections list */}
          <div className="mt-5 border-t border-[#eef2f7] pt-4">
            <p className="scribble text-[16px]">is chapter me kya kya hai</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {chapter.sections.map(s => (
                <span key={s.id} className="rounded-full border border-[#e4d9c8] bg-[#fffaf0] px-3 py-1.5 text-[12px] font-bold text-[#7a5a2e]">{s.id} · {s.title}</span>
              ))}
            </div>
          </div>

          {/* CTA row */}
          <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-[#eef2f7] pt-5">
            <button type="button" onClick={() => setOverlay("slides")} className="rounded-full bg-[#16305b] px-6 py-2.5 text-[13.5px] font-extrabold text-white shadow-[0_6px_16px_rgba(22,48,91,0.35)] hover:bg-[#214F78]">📖 Slides se seekho →</button>
            <button type="button" onClick={() => setOverlay("quiz")} className="rounded-full border-2 border-[#16305b] bg-white px-5 py-2 text-[13px] font-extrabold text-[#16305b] hover:bg-[#f2f7fd]">✍️ Seedha quiz</button>
            <button type="button" onClick={() => setOverlay("flash")} className="rounded-full border-2 border-[#e4d9c8] bg-white px-5 py-2 text-[13px] font-extrabold text-[#7a5a2e] hover:bg-[#fffaf0]">🔁 Flashcards</button>
            <button type="button" onClick={() => setOverlay("games")} className="rounded-full border-2 border-[#e4d9c8] bg-white px-5 py-2 text-[13px] font-extrabold text-[#7a5a2e] hover:bg-[#fffaf0]">🎮 Games</button>
          </div>

          {/* honest recommendation */}
          {prog.quizBest > 0 && prog.quizBest < 75 && (
            <p className="mt-4 rounded-2xl border border-[#f3d9c4] bg-[#fff6ec] px-4 py-3 font-note text-[14.5px] leading-snug text-[#8a4a22]">
              <span className="font-hand text-[16px]">Saathy ki salah:</span> quiz {prog.quizBest}% aaya — flashcards ek baar palto (✓ Fix), phir quiz dobara. Wahi asli tarika hai.
            </p>
          )}
        </div>

        {/* prev / next chapter nav */}
        <div className="mt-6 flex items-center justify-between gap-3">
          {prevCh ? <Link href={`/learn/${chapter.book}/${prevCh.chapter}`} className="max-w-[46%] truncate rounded-full border border-[#d8dde7] bg-white px-4 py-2 text-[12.5px] font-extrabold text-[#17324f] hover:bg-[#f2f7fd]">← Ch {prevCh.chapter}: {prevCh.title}</Link> : <span />}
          {nextCh ? <Link href={`/learn/${chapter.book}/${nextCh.chapter}`} className="max-w-[46%] truncate rounded-full bg-[#16305b] px-4 py-2 text-[12.5px] font-extrabold text-white hover:bg-[#214F78]">Ch {nextCh.chapter}: {nextCh.title} →</Link> : <span />}
        </div>
      </div>

      {/* ======== full-screen overlays ======== */}
      {overlay === "slides" && (
        <SlideStage chapter={chapter}
          onDone={viewed => { upd({ slidesViewed: Math.max(prog.slidesViewed, viewed) }); markDone("learn"); markDone("explore"); setOverlay("quiz"); }}
          onExit={() => { markDone("explore"); if (prog.slidesViewed > 0) markDone("learn"); setOverlay(null); }} />
      )}
      {overlay === "quiz" && (
        <QuizPaper chapter={chapter}
          onDone={({ correct, total }) => { const pct = total ? Math.round((correct / total) * 100) : 0; upd({ quizBest: Math.max(prog.quizBest, pct) }); markDone("try"); setOverlay(pct < 75 ? "flash" : null); }}
          onExit={() => setOverlay(null)} />
      )}
      {overlay === "flash" && (
        <FlashcardDeck chapter={chapter}
          onDone={({ known }) => { upd({ cardsKnown: Math.max(prog.cardsKnown, known) }); markDone("fix"); setOverlay("games"); }}
          onExit={() => { if (prog.cardsKnown > 0) markDone("fix"); setOverlay(null); }} />
      )}
      {overlay === "games" && (
        <GameHub chapter={chapter} onExit={() => { markDone("play"); markDone("master"); setOverlay(null); }} onXp={n => upd({ xp: prog.xp + n })} />
      )}
    </div>
  );
}

function HeroCard({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-[#e4e9f1] bg-white px-4 py-3.5 shadow-[0_4px_14px_rgba(16,43,76,0.06)]">
      <p className="text-[18px] leading-none">{icon}</p>
      <p className="font-hand mt-1 text-[24px] font-bold leading-none text-[#16305b]">{title}</p>
      <p className="mt-1 text-[11.5px] font-bold text-[#637c96]">{sub}</p>
    </div>
  );
}

/* ================= Level Gate — 4-tier diagnostic ================= */
function LevelGate({ chapter, onDone }: { chapter: ChapterArtifacts; onDone: (band: number) => void }) {
  // diagnostic: mix of easy → hard from this chapter's own quiz
  const qs = useMemo(() => {
    const easy = shuffle(chapter.quiz.filter(q => q.difficulty === "easy")).slice(0, 3);
    const med = shuffle(chapter.quiz.filter(q => q.difficulty === "medium")).slice(0, 3);
    const hard = shuffle(chapter.quiz.filter(q => q.difficulty === "hard")).slice(0, 2);
    return [...shuffle(easy), ...shuffle(med), ...shuffle(hard)].slice(0, 6);
  }, [chapter.quiz]);
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  const q = qs[i];
  const pick = (k: number) => {
    if (picked !== null) return;
    setPicked(k);
    if (k === q.answer) setCorrect(c => c + 1);
    setTimeout(() => {
      if (i + 1 >= qs.length) {
        const pct = Math.round((correct + (k === q.answer ? 1 : 0)) / qs.length * 100);
        onDone(pct >= 75 ? 3 : pct >= 50 ? 2 : pct >= 25 ? 1 : 0);
      } else { setI(i + 1); setPicked(null); }
    }, 650);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#f6f9fc] px-4 py-8 sm:items-center">
      <div className="w-full max-w-xl">
        <div className="relative paper-sheet rounded-2xl px-5 py-7 shadow-[0_18px_44px_rgba(16,43,76,0.16)] sm:px-8">
          <div className="tape left-8 top-[-12px]" aria-hidden />
          <div className="paper-body">
            <p className="scribble text-[16px]">Ch {chapter.chapter} · {chapter.title}</p>
            <h1 className="font-hand text-[30px] font-bold leading-tight text-[#16305b]">Pehle dekhte hain, tum kahan ho</h1>
            <p className="font-note mt-1 text-[15px] leading-snug text-[#5a6b8c]">6 chhote sawal — isi chapter ke. Jitna aata hai utna sahi karo; level ke hisaab se plan banega. Koi marks ka dar nahi, yeh sirf mapping hai.</p>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e8e0cf]"><div className="h-full rounded-full bg-[#b0552f] transition-all" style={{ width: `${((i + (picked !== null ? 1 : 0)) / qs.length) * 100}%` }} /></div>

            {q && (
              <div className="mt-5">
                <p className="font-note text-[17.5px] font-bold leading-snug text-[#16305b]">{q.q}</p>
                <div className="mt-3 space-y-2">
                  {q.options.map((o, k) => (
                    <button key={k} type="button" onClick={() => pick(k)} disabled={picked !== null}
                      className={`w-full rounded-xl border-2 px-3.5 py-2.5 text-left font-note text-[15px] font-semibold transition ${picked !== null && k === q.answer ? "border-[#5fae6f] bg-[#eef8f0]" : picked === k ? "border-[#d96a4a] bg-[#fdf0ea]" : "border-[#e4d9c8] bg-white/85 hover:border-[#7fb3ff]"}`}>{o}</button>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-5 text-[11.5px] font-semibold text-[#8a94a8]">4 levels: Basics se · Basic-plus · Beech se · Top se — tumhara jawab wahi tay karega.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

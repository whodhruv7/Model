"use client";
// GameHub — the existing Saathy games (MCQ Rush, Match, Streak, Tiles) ported
// onto chapter artifacts. Same rules as the v3 standalone: timed rush, memory
// pairs, true/false streak, tile flips. XP + best scores persist locally.
import { useEffect, useMemo, useState } from "react";
import type { ChapterArtifacts } from "@/lib/learn/artifacts";
import { addXp as addGlobalXp } from "@/lib/saathy-progress";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function loadNum(key: string): number { try { return Number(localStorage.getItem(key) ?? "0") || 0; } catch { return 0; } }
function saveNum(key: string, v: number) { try { localStorage.setItem(key, String(v)); } catch { /* private mode */ } }

type GameKey = "mcq" | "match" | "streak" | "tiles";

const GAMES: { key: GameKey; name: string; desc: string; icon: string }[] = [
  { key: "mcq", name: "MCQ Rush", desc: "60 seconds. Kitne sahi? Best score save.", icon: "⚡" },
  { key: "match", name: "Match the Concept", desc: "Term ko uske matlab se milao — kam flips me.", icon: "🧩" },
  { key: "streak", name: "True / False Streak", desc: "Statement sahi ya galat? Streak banao.", icon: "🔥" },
  { key: "tiles", name: "Tile Flip", desc: "Cards palat kar jodi dhoondo.", icon: "🎴" },
];

export function GameHub({ chapter, onExit, onXp }: { chapter: ChapterArtifacts; onExit: () => void; onXp: (xp: number) => void }) {
  const [game, setGame] = useState<GameKey | null>(null);
  const [xp, setXp] = useState(0);
  const [best, setBest] = useState<Record<string, number>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      await Promise.resolve();
      if (!alive) return;
      setXp(loadNum(`saathy.games.xp.${chapter.book}${chapter.chapter}`));
      setBest(Object.fromEntries(GAMES.map(g => [g.key, loadNum(`saathy.games.best.${g.key}.${chapter.book}${chapter.chapter}`)])));
    })();
    return () => { alive = false; };
  }, [chapter]);

  const addXp = (n: number) => { setXp(x => { const v = x + n; saveNum(`saathy.games.xp.${chapter.book}${chapter.chapter}`, v); onXp(n); addGlobalXp(n); return v; }); };
  const setBestIf = (g: string, v: number) => setBest(b => { if (v > (b[g] ?? 0)) { saveNum(`saathy.games.best.${g}.${chapter.book}${chapter.chapter}`, v); return { ...b, [g]: v }; } return b; });

  return (
    <div className="fixed inset-0 z-50 flex flex-col slide-stage">
      <div className="flex items-center justify-between gap-3 border-b border-[#e4e9f1] bg-white/80 px-4 py-2.5 backdrop-blur">
        <button type="button" onClick={() => (game ? setGame(null) : onExit())} className="rounded-full border border-[#d8dde7] bg-white px-3.5 py-1.5 text-[12.5px] font-extrabold text-[#17324f] hover:bg-[#f2f7fd]">← {game ? "Games" : "Exit"}</button>
        <p className="min-w-0 flex-1 truncate text-center text-[12.5px] font-bold text-[#637c96]">{chapter.title} — game station</p>
        <p className="shrink-0 rounded-full bg-[#fff3ea] px-3 py-1 text-[12px] font-extrabold text-[#b0552f]">★ {xp} XP</p>
      </div>

      <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-4 py-6">
        {!game && (
          <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
            {GAMES.map(g => (
              <button key={g.key} type="button" onClick={() => setGame(g.key)}
                className="group relative overflow-hidden rounded-2xl border-2 border-[#e4e9f1] bg-white p-5 text-left shadow-[0_10px_24px_rgba(16,43,76,0.10)] transition-all hover:-translate-y-1 hover:border-[#f0b490] hover:shadow-[0_16px_34px_rgba(16,43,76,0.16)]">
                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[#fff1e7] transition-transform group-hover:scale-125" aria-hidden />
                <p className="text-[26px] leading-none">{g.icon}</p>
                <p className="font-hand mt-2 text-[22px] font-bold text-[#16305b]">{g.name}</p>
                <p className="mt-0.5 text-[12.5px] font-semibold leading-snug text-[#637c96]">{g.desc}</p>
                <p className="mt-2 text-[11.5px] font-extrabold text-[#b0552f]">best: {best[g.key] ?? 0}</p>
              </button>
            ))}
          </div>
        )}
        {game === "mcq" && <McqRush chapter={chapter} addXp={addXp} bestDone={v => setBestIf("mcq", v)} />}
        {game === "match" && <MatchGame chapter={chapter} addXp={addXp} bestDone={v => setBestIf("match", v)} />}
        {game === "streak" && <StreakGame chapter={chapter} addXp={addXp} bestDone={v => setBestIf("streak", v)} />}
        {game === "tiles" && <TilesGame chapter={chapter} addXp={addXp} bestDone={v => setBestIf("tiles", v)} />}
      </div>
    </div>
  );
}

/* ---- MCQ Rush: 60s, +1 per correct (faithful to v3 gameMCQ) ---- */
function McqRush({ chapter, addXp, bestDone }: { chapter: ChapterArtifacts; addXp: (n: number) => void; bestDone: (v: number) => void }) {
  const qs = useMemo(() => shuffle(chapter.quiz).slice(0, 20), [chapter.quiz]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [t, setT] = useState(60);
  const [over, setOver] = useState(false);
  useEffect(() => {
    if (over) return;
    const timer = setInterval(() => setT(v => { if (v <= 1) { clearInterval(timer); setOver(true); return 0; } return v - 1; }), 1000);
    return () => clearInterval(timer);
  }, [over]);
  useEffect(() => { if (over) { addXp(score); bestDone(score); } }, [over]);  

  if (over) return <ScoreCard big={score} line={`best ke barabar ya behtar? +${score} XP`} again={() => { setI(0); setScore(0); setT(60); setOver(false); }} />;
  const q = qs[i % qs.length];
  const pick = (k: number) => { if (k === q.answer) setScore(s => s + 1); setI(v => v + 1); };
  return (
    <div className="w-full max-w-xl">
      <div className="h-2 overflow-hidden rounded-full bg-[#e4e9f1]"><div className="h-full rounded-full bg-[#b0552f] transition-all duration-1000" style={{ width: `${(t / 60) * 100}%` }} /></div>
      <p className="mt-2 text-center text-[12.5px] font-extrabold text-[#637c96]">score {score} · {t}s bachhe</p>
      <div className="paper-sheet relative mt-4 rounded-2xl px-5 py-6 shadow-[0_12px_28px_rgba(16,43,76,0.14)]">
        <div className="tape left-8 top-[-12px]" aria-hidden />
        <div className="paper-body">
          <p className="font-note text-[18px] font-bold leading-snug text-[#16305b]">{q.q}</p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {q.options.map((o, k) => (
              <button key={k} type="button" onClick={() => pick(k)} className="rounded-xl border-2 border-[#e4d9c8] bg-white/85 px-3.5 py-2.5 text-left font-note text-[14.5px] font-semibold text-[#2b3a67] transition hover:-translate-y-0.5 hover:border-[#7fb3ff]">{o}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Match the Concept: term ↔ back pairs, fewest flips wins (v3 gameMatch) ---- */
function MatchGame({ chapter, addXp, bestDone }: { chapter: ChapterArtifacts; addXp: (n: number) => void; bestDone: (v: number) => void }) {
  const cards = useMemo(() => {
    const pool = shuffle(chapter.flashcards).slice(0, 5);
    return pool;
  }, [chapter.flashcards]);
  const left = useMemo(() => shuffle(cards.map(c => ({ id: c.id, t: c.front.length > 64 ? c.front.slice(0, 61) + "…" : c.front }))), [cards]);
  const right = useMemo(() => shuffle(cards.map(c => ({ id: c.id, t: c.back.length > 64 ? c.back.slice(0, 61) + "…" : c.back }))), [cards]);
  const [selL, setSelL] = useState<string | null>(null);
  const [selR, setSelR] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [flips, setFlips] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => { if (done) { addXp(cards.length * 5 + 10); bestDone(flips); } }, [done]);  

  if (done) return <ScoreCard big={flips} line={`flips to clear · +${cards.length * 5 + 10} XP`} again={() => { setSelL(null); setSelR(null); setMatched(new Set()); setFlips(0); setDone(false); }} />;

  const attempt = (l: string | null, r: string | null) => {
    if (l && r) {
      setFlips(f => f + 2);
      if (l === r) setMatched(m => new Set([...m, l]));
      setSelL(null); setSelR(null);
      if (l === r && matched.size + 1 === cards.length) setTimeout(() => setDone(true), 350);
    }
  };
  return (
    <div className="w-full max-w-3xl">
      <p className="text-center text-[12.5px] font-extrabold text-[#637c96]">{matched.size}/{cards.length} matched · {flips} flips</p>
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div className="space-y-2.5">
          {left.map(l => (
            <button key={l.id} type="button" disabled={matched.has(l.id)} onClick={() => { setSelL(l.id); attempt(l.id, selR); }}
              className={`w-full rounded-xl border-2 px-3.5 py-2.5 text-left font-note text-[13.5px] font-semibold leading-snug transition ${matched.has(l.id) ? "border-[#b7ddbe] bg-[#eef8f0] opacity-60" : selL === l.id ? "border-[#b0552f] bg-[#fff3ea]" : "border-[#e4d9c8] bg-white/85 hover:border-[#7fb3ff]"}`}>{l.t}</button>
          ))}
        </div>
        <div className="space-y-2.5">
          {right.map(r => (
            <button key={r.id} type="button" disabled={matched.has(r.id)} onClick={() => { setSelR(r.id); attempt(selL, r.id); }}
              className={`w-full rounded-xl border-2 px-3.5 py-2.5 text-left font-note text-[13.5px] font-semibold leading-snug transition ${matched.has(r.id) ? "border-[#b7ddbe] bg-[#eef8f0] opacity-60" : selR === r.id ? "border-[#b0552f] bg-[#fff3ea]" : "border-[#e4d9c8] bg-white/85 hover:border-[#7fb3ff]"}`}>{r.t}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- True/False Streak (v3 gameStreak) ---- */
function StreakGame({ chapter, addXp, bestDone }: { chapter: ChapterArtifacts; addXp: (n: number) => void; bestDone: (v: number) => void }) {
  const statements = useMemo(() => {
    const out: { text: string; truthy: boolean; why: string }[] = [];
    for (const q of chapter.quiz) {
      out.push({ text: `${q.q} — "${q.options[q.answer]}"`, truthy: true, why: q.why });
      const wrong = q.options.find((_, k) => k !== q.answer);
      if (wrong) out.push({ text: `${q.q} — "${wrong}"`, truthy: false, why: q.why });
    }
    return shuffle(out).slice(0, 15);
  }, [chapter.quiz]);
  const [i, setI] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState<{ ok: boolean; why: string } | null>(null);
  const [over, setOver] = useState(false);
  useEffect(() => { if (over) { addXp(bestStreak); bestDone(bestStreak); } }, [over]);  

  if (over || i >= statements.length) return <ScoreCard big={bestStreak} line={`best streak · +${bestStreak} XP`} again={() => { setI(0); setStreak(0); setBestStreak(0); setFeedback(null); setOver(false); }} />;
  const s = statements[i];
  const answer = (v: boolean) => {
    if (feedback) return;
    const ok = v === s.truthy;
    setFeedback({ ok, why: s.why });
    if (ok) { const ns = streak + 1; setStreak(ns); setBestStreak(b => Math.max(b, ns)); }
    else { setBestStreak(b => Math.max(b, streak)); setTimeout(() => setOver(true), 1400); setStreak(0); }
  };
  const next = () => { if (i + 1 >= statements.length) { setOver(true); } else { setI(i + 1); setFeedback(null); } };
  return (
    <div className="w-full max-w-xl">
      <p className="text-center text-[12.5px] font-extrabold text-[#637c96]">streak: <span className="text-[#b0552f]">{streak}</span> · {i + 1}/{statements.length}</p>
      <div className="paper-sheet relative mt-4 rounded-2xl px-5 py-6 shadow-[0_12px_28px_rgba(16,43,76,0.14)]">
        <div className="tape right-8 top-[-12px] rotate-[3deg]" aria-hidden />
        <div className="paper-body">
          <p className="scribble text-[15px]">sahi ya galat?</p>
          <p className="font-note mt-1 text-[17.5px] font-bold leading-snug text-[#16305b]">{s.text}</p>
        </div>
      </div>
      {!feedback ? (
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={() => answer(true)} className="flex-1 rounded-2xl border-2 border-[#b7ddbe] bg-[#eef8f0] px-4 py-3 font-hand text-[20px] font-bold text-[#3e7d4d] hover:bg-[#e2f3e5]">✓ Sach</button>
          <button type="button" onClick={() => answer(false)} className="flex-1 rounded-2xl border-2 border-[#f0c9b4] bg-[#fff3ea] px-4 py-3 font-hand text-[20px] font-bold text-[#b0552f] hover:bg-[#ffe9da]">✗ Jhooth</button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-2.5">
          <p className={`font-hand text-[22px] font-bold ${feedback.ok ? "text-[#3e7d4d]" : "text-[#b0552f]"}`}>{feedback.ok ? "Shi pakda! 🔥" : "Streak toot gaya"}</p>
          <p className="text-center font-note text-[14.5px] leading-snug text-[#5a6b8c]">{s.why}</p>
          {feedback.ok && <button type="button" onClick={next} className="rounded-full bg-[#16305b] px-6 py-2 text-[13px] font-extrabold text-white hover:bg-[#214F78]">Agla →</button>}
        </div>
      )}
    </div>
  );
}

/* ---- Tile Flip memory (v3 gameTiles) ---- */
function TilesGame({ chapter, addXp, bestDone }: { chapter: ChapterArtifacts; addXp: (n: number) => void; bestDone: (v: number) => void }) {
  const deck = useMemo(() => {
    const pool = shuffle(chapter.flashcards).slice(0, 4);
    return shuffle(pool.flatMap(c => [{ id: c.id, kind: "front" as const, text: c.front.length > 52 ? c.front.slice(0, 49) + "…" : c.front }, { id: c.id, kind: "back" as const, text: c.back.length > 52 ? c.back.slice(0, 49) + "…" : c.back }]));
  }, [chapter.flashcards]);
  const [openIdx, setOpenIdx] = useState<number[]>([]);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [flips, setFlips] = useState(0);
  const done = doneIds.size === deck.length / 2 && deck.length > 0;
  useEffect(() => { if (done) { addXp(20); bestDone(flips); } }, [done]);  

  if (done) return <ScoreCard big={flips} line={`flips to clear · +20 XP`} again={() => { setOpenIdx([]); setDoneIds(new Set()); setFlips(0); }} />;

  const flip = (i: number) => {
    if (openIdx.includes(i) || openIdx.length >= 2) return;
    const nx = [...openIdx, i];
    setFlips(f => f + 1);
    setOpenIdx(nx);
    if (nx.length === 2) {
      const [a, b] = nx.map(k => deck[k]);
      if (a.id === b.id && a.kind !== b.kind) {
        setTimeout(() => { setDoneIds(s => new Set([...s, a.id])); setOpenIdx([]); }, 550);
      } else setTimeout(() => setOpenIdx([]), 900);
    }
  };
  return (
    <div className="w-full max-w-xl">
      <p className="text-center text-[12.5px] font-extrabold text-[#637c96]">{doneIds.size}/{deck.length / 2} jodi · {flips} flips</p>
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {deck.map((t, i) => {
          const isOpen = openIdx.includes(i) || doneIds.has(t.id);
          return (
            <button key={i} type="button" onClick={() => flip(i)} className={`min-h-[96px] rounded-xl border-2 px-2.5 py-2.5 text-left font-note text-[11.5px] font-semibold leading-snug transition-all ${doneIds.has(t.id) ? "border-[#b7ddbe] bg-[#eef8f0] opacity-50" : isOpen ? "border-[#b0552f] bg-[#fff6ec] rotate-0" : "border-[#c9d6e4] bg-gradient-to-br from-[#16305b] to-[#214F78] hover:from-[#1c3a68] hover:to-[#2a5298]"}`}>
              {isOpen ? <span className="text-[#2b3a67]">{t.text}</span> : <span className="font-hand text-[17px] font-bold text-white opacity-90">✳</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-[11.5px] font-semibold text-[#8a94a8]">question aur uska answer mila do</p>
    </div>
  );
}

function ScoreCard({ big, line, again }: { big: number; line: string; again: () => void }) {
  return (
    <div className="w-full max-w-sm">
      <div className="paper-sheet relative rounded-2xl px-6 py-8 text-center shadow-[0_12px_28px_rgba(16,43,76,0.14)]">
        <div className="tape left-1/2 top-[-12px]" aria-hidden />
        <div className="paper-body !pl-0">
          <div className="font-hand text-[56px] font-bold leading-none text-[#16305b]">{big}</div>
          <p className="mt-1 text-[13px] font-bold text-[#637c96]">{line}</p>
          <button type="button" onClick={again} className="mt-5 rounded-full bg-[#16305b] px-6 py-2 text-[13px] font-extrabold text-white hover:bg-[#214F78]">Phir se</button>
        </div>
      </div>
    </div>
  );
}

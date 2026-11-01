"use client";
// QuizPaper — a real worksheet on school paper: pick an answer, instant honest feedback.
import { useMemo, useState } from "react";
import type { ChapterArtifacts, QuizQ } from "@/lib/learn/artifacts";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function QuizPaper({ chapter, onDone, onExit }: { chapter: ChapterArtifacts; onDone: (res: { correct: number; total: number; weak: string[] }) => void; onExit: () => void }) {
  const [seed] = useState(0);
  const qs = useMemo(() => shuffle(chapter.quiz).slice(0, Math.min(12, chapter.quiz.length)), [chapter.quiz, seed]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [weak, setWeak] = useState<Set<string>>(new Set());
  const [finished, setFinished] = useState(false);

  if (finished) {
    const pct = Math.round((correct / qs.length) * 100);
    const band = pct >= 75 ? 3 : pct >= 50 ? 2 : pct >= 25 ? 1 : 0;
    const verdict = pct >= 75 ? "Shabaash! Chapter pakka ho gaya." : pct >= 50 ? "Solid base hai — flashcards se polish karo." : pct >= 25 ? "Thoda aur mehnat — flashcards + dobara slides." : "Koi baat nahi — slides se shuru karte hain,ekdum basic se.";
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto slide-stage px-4 py-8 sm:items-center">
        <div className="w-full max-w-lg">
          <div className="relative paper-sheet rounded-2xl px-6 py-8 text-center shadow-[0_18px_44px_rgba(16,43,76,0.14)]">
            <div className="tape left-1/2 top-[-12px]" aria-hidden />
            <div className="paper-body !pl-0">
              <p className="scribble text-[16px]">checked by Saathy ✎</p>
              <div className="font-hand text-[64px] font-bold leading-none text-[#16305b]">{pct}%</div>
              <p className="mt-1 text-[14px] font-bold text-[#637c96]">{correct} / {qs.length} sahi · level band {band + 1}/4</p>
              <p className="font-note mt-3 text-[16px] leading-relaxed text-[#2b3a67]">{verdict}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                <button type="button" onClick={() => onDone({ correct, total: qs.length, weak: [...weak] })} className="rounded-full bg-[#16305b] px-6 py-2.5 text-[13.5px] font-extrabold text-white shadow-[0_6px_16px_rgba(22,48,91,0.35)] hover:bg-[#214F78]">Aage badho →</button>
                <button type="button" onClick={() => { setI(0); setPicked(null); setCorrect(0); setWeak(new Set()); setFinished(false); }} className="rounded-full border border-[#d8dde7] bg-white px-5 py-2.5 text-[13.5px] font-extrabold text-[#17324f] hover:bg-[#f2f7fd]">Dobara try</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const q: QuizQ = qs[i];
  const pick = (k: number) => {
    if (picked !== null) return;
    setPicked(k);
    if (k === q.answer) setCorrect(c => c + 1);
    else setWeak(w => new Set([...w, q.sec]));
  };
  const advance = () => {
    if (i + 1 >= qs.length) setFinished(true);
    else { setI(i + 1); setPicked(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col slide-stage">
      <div className="flex items-center justify-between gap-3 border-b border-[#e4e9f1] bg-white/80 px-4 py-2.5 backdrop-blur">
        <button type="button" onClick={onExit} className="rounded-full border border-[#d8dde7] bg-white px-3.5 py-1.5 text-[12.5px] font-extrabold text-[#17324f] hover:bg-[#f2f7fd]">✕ Exit quiz</button>
        <p className="min-w-0 flex-1 truncate text-center text-[12.5px] font-bold text-[#637c96]">{chapter.title} — worksheet</p>
        <p className="shrink-0 rounded-full bg-[#eef4fb] px-3 py-1 text-[12px] font-extrabold text-[#2a5298]">{i + 1} / {qs.length}</p>
      </div>

      <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-4 py-6 sm:items-center">
        <div className="w-full max-w-2xl">
          <div className="relative paper-sheet rounded-2xl px-5 py-6 shadow-[0_18px_44px_rgba(16,43,76,0.14)] sm:px-8">
            <div className="tape right-8 top-[-12px] rotate-[3deg]" aria-hidden />
            <div className="paper-body">
              <div className="flex items-center justify-between">
                <p className="scribble text-[15px]">Q{i + 1}. <span className="ml-1 rounded-full bg-[#eef4fb] px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-[#2a5298]" style={{ fontFamily: "var(--font-manrope)" }}>{q.difficulty}</span></p>
                <p className="font-hand text-[15px] text-[#637c96]">sec {q.sec}</p>
              </div>
              <h2 className="font-note mt-2 text-[19px] font-bold leading-snug text-[#16305b] sm:text-[21px]">{q.q}</h2>
              <div className="mt-4 space-y-2.5">
                {q.options.map((o, k) => {
                  const isPicked = picked === k;
                  const isRight = k === q.answer;
                  const show = picked !== null;
                  return (
                    <button key={k} type="button" onClick={() => pick(k)} disabled={show}
                      className={`flex w-full items-start gap-2.5 rounded-xl border-2 px-3.5 py-2.5 text-left transition-all
                        ${show && isRight ? "border-[#5fae6f] bg-[#eef8f0]" : show && isPicked ? "border-[#d96a4a] bg-[#fdf0ea]" : "border-[#e4d9c8] bg-white/85 hover:border-[#7fb3ff] hover:bg-[#f6fbff]"} ${show ? "cursor-default" : "cursor-pointer"}`}>
                      <span className={`font-hand mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[15px] font-bold ${show && isRight ? "border-[#5fae6f] text-[#3e7d4d]" : show && isPicked ? "border-[#d96a4a] text-[#b0552f]" : "border-[#c9bfa8] text-[#7a6a4a]"}`}>{"ABCD"[k]}</span>
                      <span className="font-note text-[15.5px] leading-snug text-[#2b3a67]">{o}</span>
                      {show && isRight && <span className="scribble ml-auto shrink-0 text-[17px]">✓</span>}
                      {show && isPicked && !isRight && <span className="scribble ml-auto shrink-0 text-[17px]">✗</span>}
                    </button>
                  );
                })}
              </div>
              {picked !== null && (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-note max-w-md text-[14.5px] leading-snug text-[#5a6b8c]"><span className="scribble text-[15px]">{picked === q.answer ? "Sahi! " : "Dekho — "}</span>{q.why}</p>
                  <button type="button" onClick={advance} className="shrink-0 rounded-full bg-[#16305b] px-6 py-2 text-[13px] font-extrabold text-white shadow-[0_6px_16px_rgba(22,48,91,0.35)] hover:bg-[#214F78]">{i + 1 >= qs.length ? "Result dekho" : "Agla →"}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

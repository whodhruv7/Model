'use client';

// Level Check — the cute-cards diagnostic that runs BEFORE teaching a concept
// the student has never been assessed on. 2-3 basics questions, one card at a
// time, mascot reactions, then a tier-reveal moment (never a number — the four
// internal bands only ever surface as the friendly concept status).
import { useMemo, useState } from 'react';
import { Check, ChevronRight, Sparkles, X } from 'lucide-react';
import { Mascot, type MascotPose } from './mascot';
import type { LevelCheckPlan, Tier } from '@/lib/saathy-types';

export interface LevelCheckCardProps {
  plan: LevelCheckPlan;
  animationsEnabled: boolean;
  onComplete: (correct: number, total: number, concept: string, results: boolean[]) => void;
}

// Friendly concept statuses (VS-22) — the ONLY thing students ever see.
const REVEAL: Record<Tier, { title: string; line: string; tint: string; ring: string }> = {
  0: {
    title: "Let's fix this",
    line: 'Perfect — now I know exactly where to start. We begin from zero, super simple.',
    tint: 'bg-[#fdf0f0] text-[#9c2c30] border-[#f3c1c2]',
    ring: '#E5484D',
  },
  1: {
    title: 'Building up',
    line: 'Good base! I will build on it step by step — nothing rushed.',
    tint: 'bg-[#fff6ea] text-[#8a5416] border-[#f5deb8]',
    ring: '#F19937',
  },
  2: {
    title: 'Almost there',
    line: 'Solid! We focus on application and exam-style thinking from here.',
    tint: 'bg-[#f3f9ff] text-[#2a5298] border-[#cfe3fb]',
    ring: '#7FB3FF',
  },
  3: {
    title: 'Mastered',
    line: 'Basics locked in. Let us push one level beyond the textbook.',
    tint: 'bg-[#edf7ee] text-[#227031] border-[#bfe3c4]',
    ring: '#46A758',
  },
};

const PRAISE = ['Nice!', 'Good instinct.', 'Exactly.', 'Sharp!', 'Yes — that is the idea.'];
const GENTLE = ['Almost — look again.', 'Not this one, and that is useful.', 'Close, but no.', 'Hmm, try the other logic.'];

export function LevelCheckCard({ plan, animationsEnabled, onComplete }: LevelCheckCardProps) {
  const qs = plan.questions;
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);

  const q = qs[idx];
  const correctCount = useMemo(() => results.filter(Boolean).length, [results]);
  const revealed = picked !== null;
  const wasCorrect = revealed && picked === q.answer;

  const pct = Math.round((correctCount / qs.length) * 100);
  const tier: Tier = pct < 25 ? 0 : pct < 50 ? 1 : pct < 75 ? 2 : 3;
  const reveal = REVEAL[tier];

  const pick = (i: number) => {
    if (revealed) return;
    setPicked(i);
    setResults((prev) => [...prev, i === q.answer]);
  };

  const next = () => {
    if (idx + 1 < qs.length) {
      setIdx(idx + 1);
      setPicked(null);
    } else {
      setDone(true);
    }
  };

  const pose: MascotPose = done ? 'cheering' : revealed ? (wasCorrect ? 'happy' : 'thinking') : 'explaining';
  const feedback = revealed ? (wasCorrect ? PRAISE[idx % PRAISE.length] : GENTLE[idx % GENTLE.length]) : '';

  return (
    <div className="lc-wrap mt-3 overflow-hidden rounded-2xl border border-[#ffd9c4] bg-gradient-to-br from-[#fff6ef] via-white to-[#f3f9ff] shadow-[0_4px_18px_rgba(30,58,138,0.08)]">
      {/* header */}
      <div className="flex items-center justify-between border-b border-[#ffe4d2] bg-[linear-gradient(90deg,rgba(246,213,198,0.35),rgba(169,206,232,0.3))] px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-[12px] font-extrabold tracking-wide text-[#a05c2e]">
          <Sparkles className="h-3.5 w-3.5" />
          LEVEL CHECK · {plan.concept}
        </span>
        <div className="flex items-center gap-1.5" aria-label={`Question ${idx + 1} of ${qs.length}`}>
          {qs.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === idx && !done ? 14 : 6,
                background: i < results.length ? (results[i] ? '#46a758' : '#f0a5a7') : i === idx ? '#f19937' : '#e2d8cf',
              }}
            />
          ))}
        </div>
      </div>

      {!done ? (
        <div className="px-4 pb-4 pt-3.5">
          {/* question card */}
          <div key={idx} className="lc-card">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[#8a94a8]">
              Card {idx + 1} of {qs.length} · {q.skill}
            </p>
            <p className="mt-1 text-[15px] font-bold leading-snug text-[#16305b]">{q.question}</p>

            <div className="mt-3 grid gap-2">
              {q.options.map((opt, i) => {
                const isAnswer = i === q.answer;
                const isPicked = i === picked;
                let style = 'border-[#e8e2da] bg-white hover:border-[#f19937] hover:bg-[#fff6ea] hover:-translate-y-px';
                let badge = 'border-[#e0c9b8] text-[#a05c2e] bg-[#fff9f4]';
                if (revealed && isAnswer) {
                  style = 'border-[#46a758] bg-[#edf7ee] scale-[1.01]';
                  badge = 'border-[#46a758] bg-[#46a758] text-white';
                } else if (revealed && isPicked && !isAnswer) {
                  style = 'border-[#e5484d] bg-[#fdf0f0] shake';
                  badge = 'border-[#e5484d] bg-[#e5484d] text-white';
                } else if (revealed) {
                  style = 'border-[#eee8e0] bg-white opacity-55';
                }
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={revealed}
                    onClick={() => pick(i)}
                    className={`lc-opt flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-150 disabled:cursor-default ${style}`}
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-extrabold ${badge}`}
                    >
                      {revealed && isAnswer ? <Check className="h-3.5 w-3.5" /> : revealed && isPicked ? <X className="h-3.5 w-3.5" /> : String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1 text-[13.5px] font-semibold text-[#1e3a5f]">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* reveal strip */}
          {revealed ? (
            <div className="lc-card mt-3 flex items-start gap-2.5">
              <Mascot pose={wasCorrect ? 'happy' : 'thinking'} size={40} animationsEnabled={animationsEnabled} pop={!animationsEnabled ? false : true} />
              <div className="min-w-0 flex-1 rounded-xl border px-3 py-2.5" style={{ borderColor: wasCorrect ? '#bfe3c4' : '#f3c1c2', background: wasCorrect ? '#edf7ee' : '#fdf0f0' }}>
                <p className="text-[13px] font-extrabold" style={{ color: wasCorrect ? '#227031' : '#9c2c30' }}>
                  {feedback}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed" style={{ color: wasCorrect ? '#3e6b46' : '#7c4042' }}>
                  {q.why}
                </p>
              </div>
            </div>
          ) : null}

          {revealed ? (
            <button
              type="button"
              onClick={next}
              className="lc-card mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#f6a97c] to-[#f19937] px-4 py-2.5 text-[13.5px] font-extrabold text-white shadow-[0_3px_10px_rgba(241,153,55,0.35)] transition hover:brightness-105 active:scale-[0.99]"
            >
              {idx + 1 < qs.length ? 'Next card' : 'See my level'}
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : (
        // ---------- tier reveal moment ----------
        <div className="px-4 pb-4 pt-4">
          {animationsEnabled ? (
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
              {Array.from({ length: 14 }).map((_, i) => (
                <span
                  key={i}
                  className="lc-confetti"
                  style={{
                    left: `${8 + (i * 6.3) % 88}%`,
                    background: ['#f6a97c', '#7fb3ff', '#f19937', '#46a758', '#a9cee8'][i % 5],
                    animationDelay: `${(i % 7) * 0.12}s`,
                    animationDuration: `${2 + (i % 3) * 0.5}s`,
                  }}
                />
              ))}
            </div>
          ) : null}
          <div className="relative flex flex-col items-center text-center">
            <Mascot pose="cheering" size={88} float animationsEnabled={animationsEnabled} alt="Saathy cheering" />
            <p className="mt-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#8a94a8]">
              {correctCount} of {qs.length} on basics · this is just a start, not a score
            </p>
            <div className={`mt-2 rounded-2xl border px-5 py-2.5 ${reveal.tint}`}>
              <p className="text-[17px] font-extrabold tracking-tight">{reveal.title}</p>
            </div>
            <p className="mt-2 max-w-[46ch] text-[13px] font-semibold leading-relaxed text-[#5c6f8a]">{reveal.line}</p>
            <button
              type="button"
              onClick={() => onComplete(correctCount, qs.length, plan.concept, results)}
              className="mt-3.5 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#7fb3ff] to-[#6aa6ff] px-5 py-2.5 text-[13.5px] font-extrabold text-[#0e2a5e] shadow-[0_3px_12px_rgba(127,179,255,0.4)] transition hover:brightness-105 active:scale-[0.99]"
            >
              Teach me my way <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

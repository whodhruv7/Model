'use client';

// Interactive Quick Check — the in-chat check-for-understanding (VS-18 loop):
// answer → honest feedback → "Why?" re-opens the idea → evidence recorded
// (AI-08) → mastery estimate updates everywhere. Hints follow the AI-10 ladder
// (nudge first, never the full answer).
import { useState } from 'react';
import { Lightbulb, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MasterySnapshot, QuickCheck } from '@/lib/saathy-types';

export interface QuickCheckProps {
  qc: QuickCheck;
  onEvidence: (correct: boolean, difficulty: number) => Promise<MasterySnapshot | null>;
  onWhy: () => void;
  onHint: (level: 1 | 2) => void;
  onRetry: () => void;
  busy?: boolean;
}

const DIFF_LABEL: Record<number, string> = { 1: 'L1 · Basic', 2: 'L2 · Medium', 3: 'L3 · Application' };

export function QuickCheckCard({ qc, onEvidence, onWhy, onHint, onRetry, busy }: QuickCheckProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<null | 'correct' | 'wrong'>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const answer = async (idx: number) => {
    if (revealed || submitting) return;
    setPicked(idx);
    setSubmitting(true);
    const correct = idx === qc.answer;
    setRevealed(correct ? 'correct' : 'wrong');
    await onEvidence(correct, qc.difficulty);
    setSubmitting(false);
  };

  const nextHint = () => {
    const lvl = (hintLevel + 1) as 1 | 2;
    setHintLevel(Math.min(2, lvl));
    onHint(lvl);
  };

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-[rgba(127,179,255,0.4)] bg-gradient-to-b from-[#f3f9ff] to-[#fff6ef] shadow-[0_2px_10px_rgba(30,58,138,0.06)]">
      <div className="flex items-center justify-between border-b border-[rgba(127,179,255,0.25)] bg-[rgba(127,179,255,0.12)] px-3.5 py-2">
        <span className="flex items-center gap-1.5 text-[12px] font-extrabold tracking-wide text-[#16305b]">
          <Sparkles className="h-3.5 w-3.5 text-[#5E97F0]" />
          QUICK CHECK
          {qc.concept ? <span className="font-bold text-[#5c6f8a]">· {qc.concept}</span> : null}
        </span>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-[#5c6f8a]">
          {DIFF_LABEL[qc.difficulty] ?? 'L2'}
        </span>
      </div>

      <div className="px-3.5 pb-3.5 pt-2.5">
        <p className="text-[14px] font-semibold leading-relaxed text-[#1e3a8a]">{qc.question}</p>

        <div className="mt-2.5 grid gap-1.5">
          {qc.options.map((opt, i) => {
            const isPicked = picked === i;
            const isAnswer = i === qc.answer;
            const showState = revealed !== null;
            const base =
              'flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-[13.5px] transition-all duration-150';
            let style = 'border-[#dfe4ee] bg-white hover:border-[#7fb3ff] hover:bg-[#f3f9ff]';
            if (showState && isAnswer) style = 'border-[#46a758] bg-[#edf7ee]';
            else if (showState && isPicked && !isAnswer) style = 'border-[#e5484d] bg-[#fdf0f0]';
            else if (showState) style = 'border-[#e6e2dc] bg-white opacity-60';
            else if (isPicked) style = 'border-[#7fb3ff] bg-[#f3f9ff]';
            return (
              <button
                key={i}
                type="button"
                disabled={revealed !== null || busy || submitting}
                onClick={() => answer(i)}
                className={`${base} ${style} disabled:cursor-default`}
              >
                <span
                  className={`flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full border text-[11px] font-extrabold ${
                    showState && isAnswer
                      ? 'border-[#46a758] bg-[#46a758] text-white'
                      : showState && isPicked && !isAnswer
                        ? 'border-[#e5484d] bg-[#e5484d] text-white'
                        : 'border-[#b9c8e4] text-[#1e3a8a]'
                  }`}
                  style={{ width: 22, height: 22 }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1 text-[#1e3a8a]">{opt}</span>
                {showState && isAnswer ? <CheckCircle2 className="h-4 w-4 text-[#46a758]" /> : null}
                {showState && isPicked && !isAnswer ? <XCircle className="h-4 w-4 text-[#e5484d]" /> : null}
              </button>
            );
          })}
        </div>

        {hintLevel > 0 && revealed === null ? (
          <div className="msg-in mt-2 rounded-lg border border-[#ffe0c7] bg-[#fff3ea] px-3 py-2 text-[12.5px] font-medium text-[#7a3b1d]">
            <span className="font-extrabold">Hint {hintLevel}: </span>
            {hintLevel === 1 ? qc.hint : (qc.hint2 || qc.hint)}
          </div>
        ) : null}

        {revealed === 'correct' ? (
          <div className="msg-in mt-3 rounded-lg border border-[#bfe3c4] bg-[#edf7ee] px-3 py-2.5">
            <p className="text-[13px] font-extrabold text-[#227031]">Great job! Sahi pakda. ☁️</p>
            <p className="mt-0.5 text-[12.5px] text-[#3e6b46]">
              Your answer is recorded — Saathy will pitch the next questions at this level.
            </p>
          </div>
        ) : null}

        {revealed === 'wrong' ? (
          <div className="msg-in mt-3 rounded-lg border border-[#f3c1c2] bg-[#fdf0f0] px-3 py-2.5">
            <p className="text-[13px] font-extrabold text-[#9c2c30]">Not quite — no problem, this is useful data.</p>
            <p className="mt-0.5 text-[12.5px] text-[#7c4042]">
              Correct answer: <span className="font-bold">{String.fromCharCode(65 + qc.answer)}. {qc.options[qc.answer]}</span>
            </p>
          </div>
        ) : null}

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {revealed === null ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || hintLevel >= 2}
              onClick={nextHint}
              className="h-7 gap-1 border-[#ffe0c7] bg-[#fff3ea] px-2.5 text-[12px] font-bold text-[#7a3b1d] hover:bg-[#ffe6d7]"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              {hintLevel === 0 ? 'Give me a hint' : 'Bigger hint'}
            </Button>
          ) : null}
          {revealed === 'wrong' ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={onWhy}
              className="h-7 gap-1 border-[#f3c1c2] bg-white px-2.5 text-[12px] font-bold text-[#9c2c30] hover:bg-[#fdf0f0]"
            >
              Why was I wrong?
            </Button>
          ) : null}
          {revealed !== null ? (
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={onRetry}
              className="h-7 bg-[#7fb3ff] px-3 text-[12px] font-bold text-[#0e2a5e] hover:bg-[#6aa6ff]"
            >
              Try a fresh question
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

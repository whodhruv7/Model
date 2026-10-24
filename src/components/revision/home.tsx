"use client";

import { DATA, chapterStat, readiness, type Progress } from "@/lib/revision";
import { Html, ProgressBar, Chip } from "./atoms";
import { Target, Flame, MoonStar, ChevronRight, RotateCcw } from "lucide-react";
import { useState } from "react";

export function Home({
  progress,
  onOpenChapter,
  onOpenPower,
  onReset,
}: {
  progress: Progress;
  onOpenChapter: (num: number) => void;
  onOpenPower: () => void;
  onReset: () => void;
}) {
  const [planOpen, setPlanOpen] = useState(false);
  const ready = readiness(DATA.chapters, progress);

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-28 pt-6 sm:max-w-2xl">
      {/* hero */}
      <div className="rounded-3xl border border-amber-400/20 bg-gradient-to-b from-amber-400/10 to-transparent p-6">
        <div className="flex items-center justify-between">
          <Chip className="bg-amber-400/15 text-amber-300">
            <Target className="h-3 w-3" /> Mission
          </Chip>
          <Chip className="bg-zinc-800 text-zinc-300">Ganita Manjari · Gr 9</Chip>
        </div>
        <div className="mt-4 flex items-end gap-3">
          <span className="text-6xl font-black leading-none tracking-tight text-amber-300">
            80<span className="text-zinc-500">/80</span>
          </span>
          <span className="pb-1 text-sm font-medium text-zinc-400">
            Final Revision ·<br className="hidden sm:block" /> ek ek concept, ek time pe
          </span>
        </div>
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1 font-semibold text-zinc-300">
              <Flame className="h-3.5 w-3.5 text-amber-400" /> Readiness meter
            </span>
            <span className="font-bold text-amber-300">{ready}%</span>
          </div>
          <ProgressBar value={ready} className="h-2.5" />
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            Concepts padho + IMP questions solve karo + MCQs maaro — meter khud bharta jayega.{" "}
            {ready >= 80
              ? "Tum exam ke liye ready ho, ab sirf revision!"
              : ready >= 30
              ? "Shuruat solid hai, aise hi chalte raho."
              : "Aaj raat 3 rounds ke saath poora syllabus cover karo."}
          </p>
        </div>
      </div>

      {/* night plan */}
      <button
        onClick={() => setPlanOpen((o) => !o)}
        className="mt-5 flex w-full items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-left transition-colors hover:border-zinc-700"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
            <MoonStar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-100">Aaj raat ka plan · 3 rounds</p>
            <p className="text-xs text-zinc-500">~2 ghante mein poora syllabus</p>
          </div>
        </div>
        <ChevronRight
          className={`h-5 w-5 text-zinc-500 transition-transform ${planOpen ? "rotate-90" : ""}`}
        />
      </button>
      {planOpen && (
        <div className="mt-2 space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          {DATA.plan.rounds.map((r, i) => (
            <div key={i} className="rounded-xl bg-zinc-950/60 p-3">
              <p className="text-xs font-black uppercase tracking-wider text-amber-300">
                {r.round}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-200">
                <Html html={r.do} />
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                <Html html={r.goal} />
              </p>
            </div>
          ))}
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
            <p className="text-xs font-black uppercase tracking-wider text-amber-300">
              Golden rule
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-300">
              <Html html={DATA.plan.golden} />
            </p>
          </div>
        </div>
      )}

      {/* chapters */}
      <h2 className="mb-3 mt-7 px-1 text-sm font-black uppercase tracking-widest text-zinc-500">
        Chapters · 7 total
      </h2>
      <div className="space-y-3">
        {DATA.chapters.map((ch) => {
          const s = chapterStat(ch, progress);
          return (
            <button
              key={ch.num}
              onClick={() => onOpenChapter(ch.num)}
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-left transition-all hover:border-amber-400/40 hover:bg-zinc-900 active:scale-[0.99]"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-sm font-black ${
                    ch.star
                      ? "bg-amber-400 text-zinc-950"
                      : "bg-zinc-800 text-zinc-300"
                  }`}
                >
                  {ch.num}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-zinc-100">{ch.short}</p>
                    {ch.star && (
                      <Chip className="bg-amber-400/15 text-amber-300">★ Most imp</Chip>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    <div>
                      <p className="mb-1">Learn</p>
                      <ProgressBar value={s.learnPct} barClass="bg-emerald-400" />
                    </div>
                    <div>
                      <p className="mb-1">IMP Qs</p>
                      <ProgressBar value={s.impPct} barClass="bg-fuchsia-400" />
                    </div>
                    <div>
                      <p className="mb-1">
                        MCQ {s.mcqCorrect}/{s.mcqTotal}
                      </p>
                      <ProgressBar value={s.mcqAccPct} barClass="bg-amber-400" />
                    </div>
                  </div>
                </div>
                <ChevronRight className="mt-3 h-5 w-5 shrink-0 text-zinc-600" />
              </div>
            </button>
          );
        })}
      </div>

      {/* power page */}
      <button
        onClick={onOpenPower}
        className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-left transition-colors hover:border-emerald-400/40"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
          <MoonStar className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-zinc-100">Exam Morning Power Page</p>
          <p className="text-xs text-zinc-500">
            12 killer formulas + 8 hall rules — subah sirf ye dekho
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-zinc-600" />
      </button>

      {/* reset */}
      <button
        onClick={() => {
          if (window.confirm("Sara progress reset ho jayega. Pakka?")) onReset();
        }}
        className="mx-auto mt-8 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:text-rose-400"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Progress reset
      </button>
    </div>
  );
}

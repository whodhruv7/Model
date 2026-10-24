"use client";

import { DATA } from "@/lib/revision";
import { Html, Chip } from "./atoms";
import { MoonStar, Zap, ShieldCheck, Timer, Heart } from "lucide-react";

export function PowerPage({ onBack }: { onBack: () => void }) {
  const f = DATA.final;
  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-28 pt-4 sm:max-w-2xl">
      <div className="rounded-3xl border border-emerald-400/20 bg-gradient-to-b from-emerald-400/10 to-transparent p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
            <MoonStar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-black text-zinc-100">{f.title}</p>
            <p className="text-xs text-zinc-500">Subah sirf ye page — 3 baar padho, phir exam dené jao</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          <Html html={f.body} />
        </p>
      </div>

      <h2 className="mb-3 mt-7 flex items-center gap-2 px-1 text-sm font-black uppercase tracking-widest text-zinc-500">
        <Zap className="h-4 w-4 text-amber-400" /> 12 Killer formulas
      </h2>
      <div className="space-y-2">
        {f.formulas.map((x, i) => (
          <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-[11px] font-black text-amber-300">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black leading-relaxed text-amber-200">
                  <Html html={x.f} />
                </p>
                <div className="mt-1.5 flex items-start gap-2">
                  <Chip className="shrink-0 bg-zinc-800 text-zinc-400">{x.ch}</Chip>
                  <p className="text-xs leading-relaxed text-zinc-500">
                    <Html html={x.use} />
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-7 flex items-center gap-2 px-1 text-sm font-black uppercase tracking-widest text-zinc-500">
        <ShieldCheck className="h-4 w-4 text-emerald-400" /> Exam hall ke 8 rules
      </h2>
      <div className="space-y-2">
        {f.rules.map((r, i) => (
          <div key={i} className="flex gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-400/15 text-[10px] font-black text-emerald-300">
              {i + 1}
            </span>
            <p className="text-xs leading-relaxed text-zinc-300">
              <Html html={r} />
            </p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-7 flex items-center gap-2 px-1 text-sm font-black uppercase tracking-widest text-zinc-500">
        <Timer className="h-4 w-4 text-fuchsia-400" /> Subah ka 10-minute drill
      </h2>
      <ol className="space-y-2">
        {f.drill.map((d, i) => (
          <li key={i} className="flex gap-3 rounded-2xl bg-zinc-900/60 p-4 border border-zinc-800">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-fuchsia-400/15 text-[10px] font-black text-fuchsia-300">
              {i + 1}
            </span>
            <p className="text-xs leading-relaxed text-zinc-300">
              <Html html={d} />
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-400/5 p-6 text-center">
        <Heart className="mx-auto h-6 w-6 text-amber-300" />
        <p className="mt-3 text-sm leading-relaxed text-zinc-300">
          <Html html={f.pep} />
        </p>
        <p className="mt-3 text-2xl font-black tracking-tight text-amber-300">80/80 is yours.</p>
      </div>

      <button
        onClick={onBack}
        className="mx-auto mt-6 block rounded-full border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-sm font-bold text-zinc-300 transition-colors hover:border-zinc-600"
      >
        ← Chapters pe wapas
      </button>
    </div>
  );
}

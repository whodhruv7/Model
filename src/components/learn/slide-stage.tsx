"use client";
// Full-screen slide stage — teaches one idea per slide, keyboard + tap nav.
import { useCallback, useEffect, useState } from "react";
import type { ChapterArtifacts } from "@/lib/learn/artifacts";
import { VisualBoard } from "./visuals";

export function SlideStage({ chapter, onDone, onExit }: { chapter: ChapterArtifacts; onDone: (viewed: number) => void; onExit: () => void }) {
  const [i, setI] = useState(0);
  const n = chapter.slides.length;
  const next = useCallback(() => setI(v => Math.min(v + 1, n - 1)), [n]);
  const prev = useCallback(() => setI(v => Math.max(v - 1, 0)), []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [next, prev, onExit]);

  const finish = () => { onDone(i + 1); };
  const s = chapter.slides[i];

  return (
    <div className="fixed inset-0 z-50 flex flex-col slide-stage">
      {/* top bar */}
      <div className="flex items-center justify-between gap-3 border-b border-[#e4e9f1] bg-white/80 px-4 py-2.5 backdrop-blur">
        <button type="button" onClick={onExit} className="rounded-full border border-[#d8dde7] bg-white px-3.5 py-1.5 text-[12.5px] font-extrabold text-[#17324f] transition hover:bg-[#f2f7fd]">✕ Exit slides</button>
        <p className="min-w-0 flex-1 truncate text-center text-[12.5px] font-bold text-[#637c96]">
          <span className="font-hand text-[15px] text-[#b0552f]">Ch {chapter.chapter}</span> · {chapter.title}
        </p>
        <p className="hidden shrink-0 rounded-full bg-[#eef4fb] px-3 py-1 text-[12px] font-extrabold text-[#2a5298] sm:block">{i + 1} / {n}</p>
      </div>

      {/* slide body */}
      <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-4 py-5 sm:items-center sm:px-8">
        <div className="w-full max-w-3xl" key={s.id}>
          <div className="relative paper-sheet rounded-2xl px-5 py-6 shadow-[0_18px_44px_rgba(16,43,76,0.14)] sm:px-8 sm:py-8">
            <div className="tape left-6 top-[-12px]" aria-hidden />
            <div className="paper-body">
              <p className="scribble text-[15px] font-semibold">{s.kicker}</p>
              <h2 className="font-hand mt-0.5 text-[30px] font-bold leading-tight text-[#16305b] sm:text-[38px]">{s.title}</h2>
              <ul className="mt-4 space-y-3">
                {s.bullets.map((b, k) => (
                  <li key={k} className="font-note flex gap-2.5 text-[16.5px] leading-[1.55] text-[#2b3a67] sm:text-[18px]">
                    <span className="scribble mt-[1px] shrink-0 text-[19px] leading-none">{["◦", "•", "◦", "•"][k % 4]}</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              {s.visual && <div className="mt-6"><VisualBoard visual={s.visual} /></div>}
              {s.note && <p className="mt-5 inline-block rotate-[-1deg] rounded-lg border border-[#f3d9c4] bg-[#fff6ec] px-3.5 py-1.5 font-hand text-[16px] font-semibold text-[#b0552f] shadow-[0_1px_4px_rgba(176,85,47,0.12)]">{s.note}</p>}
            </div>
          </div>

          {/* progress dots */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
            {chapter.slides.map((sl, k) => (
              <button key={sl.id} type="button" aria-label={`Go to slide ${k + 1}`} onClick={() => setI(k)}
                className={`slide-dot h-2 rounded-full ${k === i ? "w-6 bg-[#b0552f]" : k < i ? "w-2 bg-[#8fb6d9]" : "w-2 bg-[#d8dde7]"}`} />
            ))}
          </div>
        </div>
      </div>

      {/* bottom nav */}
      <div className="flex items-center justify-between gap-3 border-t border-[#e4e9f1] bg-white/85 px-4 py-3 backdrop-blur">
        <button type="button" onClick={prev} disabled={i === 0} className="rounded-full border border-[#d8dde7] bg-white px-5 py-2 text-[13px] font-extrabold text-[#17324f] transition enabled:hover:bg-[#f2f7fd] disabled:opacity-40">← Pichle</button>
        <p className="hidden text-[11.5px] font-semibold text-[#8a94a8] md:block">keyboard: ← → space · esc to exit</p>
        {i === n - 1
          ? <button type="button" onClick={finish} className="rounded-full bg-[#16305b] px-6 py-2 text-[13px] font-extrabold text-white shadow-[0_6px_16px_rgba(22,48,91,0.35)] transition hover:bg-[#214F78]">Quiz pe chalo →</button>
          : <button type="button" onClick={next} className="rounded-full bg-[#16305b] px-6 py-2 text-[13px] font-extrabold text-white shadow-[0_6px_16px_rgba(22,48,91,0.35)] transition hover:bg-[#214F78]">Agla →</button>}
      </div>
    </div>
  );
}

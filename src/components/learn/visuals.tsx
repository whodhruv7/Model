"use client";
// Renders a slide's VisualSpec as hand-sketched SVG/DOM — notebook style.
import type { VisualSpec } from "@/lib/learn/artifacts";

export function VisualBoard({ visual }: { visual: VisualSpec }) {
  if (!visual) return null;
  switch (visual.kind) {
    case "steps":
      return (
        <div className="flex flex-wrap items-stretch gap-2">
          {visual.items.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="paper-sheet flex min-h-[64px] max-w-[210px] items-center rounded-lg px-3 py-2 text-[13px] font-semibold leading-snug shadow-[0_2px_8px_rgba(16,43,76,0.10)]">
                <span className="paper-body flex items-center gap-2">
                  <span className="scribble text-[15px] leading-none">{i + 1}.</span>
                  <span>{t}</span>
                </span>
              </div>
              {i < visual.items.length - 1 && <span aria-hidden className="font-hand text-xl text-[#b0552f]">→</span>}
            </div>
          ))}
        </div>
      );
    case "compare":
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[visual.left, visual.right].map((col, c) => (
            <div key={c} className="paper-sheet rounded-lg p-3 shadow-[0_2px_8px_rgba(16,43,76,0.10)]">
              <p className="paper-body font-hand text-lg font-bold">{col.title}</p>
              <ul className="paper-body mt-1 space-y-1">
                {col.items.map((it, i) => (
                  <li key={i} className="flex gap-1.5 text-[13px] font-semibold leading-snug">
                    <span className="scribble shrink-0">{c === 0 ? "+" : "•"}</span><span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    case "flow":
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          {visual.items.map((t, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="rounded-lg border-2 border-[#b9d4ea] bg-white px-3 py-2 text-[12.5px] font-bold text-[#17324f] shadow-[0_2px_6px_rgba(16,43,76,0.10)]">{t}</div>
              {i < visual.items.length - 1 && <span aria-hidden className="font-hand text-lg text-[#b0552f]">→</span>}
            </div>
          ))}
        </div>
      );
    case "labels":
      return (
        <div className="flex flex-wrap gap-2">
          {visual.items.map((t, i) => (
            <span key={i} className="rounded-full border border-[#e3d9c6] bg-[#fffaf0] px-3 py-1.5 text-[12.5px] font-bold text-[#7a5a2e] shadow-[0_1px_4px_rgba(16,43,76,0.08)]" style={{ transform: `rotate(${((i * 37) % 7) - 3}deg)` }}>{t}</span>
          ))}
        </div>
      );
    case "tree":
      return (
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-xl border-2 border-[#b9d4ea] bg-white px-4 py-2 text-[13.5px] font-extrabold text-[#16305b] shadow-[0_3px_10px_rgba(16,43,76,0.14)]">{visual.root}</div>
          <span aria-hidden className="font-hand text-lg text-[#b0552f]">↓</span>
          <div className="flex flex-wrap justify-center gap-2">
            {visual.children.map((t, i) => (
              <div key={i} className="rounded-lg border border-[#d8dde7] bg-[#f4f9ff] px-3 py-1.5 text-[12.5px] font-semibold text-[#2a5298]">{t}</div>
            ))}
          </div>
        </div>
      );
    case "plot": {
      const pts = visual.points.filter(p => p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]));
      if (pts.length < 2) return null;
      const W = 460, H = 220, PAD = 38;
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const sx = (x: number) => PAD + ((x - x0) / (x1 - x0 || 1)) * (W - PAD - 16);
      const sy = (y: number) => H - PAD - ((y - y0) / (y1 - y0 || 1)) * (H - PAD - 20);
      if (visual.type === "bar") {
        const bw = (W - PAD - 16) / pts.length * 0.6;
        return (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[520px]" role="img" aria-label="bar plot">
            <line x1={PAD} y1={H - PAD} x2={W - 8} y2={H - PAD} stroke="#b0552f" strokeWidth="1.5" />
            <line x1={PAD} y1={12} x2={PAD} y2={H - PAD} stroke="#b0552f" strokeWidth="1.5" />
            {pts.map((p, i) => (
              <g key={i}>
                <rect x={sx(p[0]) - bw / 2} y={sy(p[1])} width={bw} height={H - PAD - sy(p[1])} rx="3" fill="#d7e9f5" stroke="#7fb3ff" />
                <text x={sx(p[0])} y={H - PAD + 14} textAnchor="middle" fontSize="10" fill="#637c96" fontFamily="var(--font-manrope)">{p[0]}</text>
              </g>
            ))}
            <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="#637c96" fontFamily="var(--font-manrope)">{visual.xlabel}</text>
            <text x={12} y={H / 2} textAnchor="middle" fontSize="10" fill="#637c96" transform={`rotate(-90 12 ${H / 2})`} fontFamily="var(--font-manrope)">{visual.ylabel}</text>
          </svg>
        );
      }
      const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join(" ");
      return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[520px]" role="img" aria-label="line plot">
          <line x1={PAD} y1={H - PAD} x2={W - 8} y2={H - PAD} stroke="#b0552f" strokeWidth="1.5" />
          <line x1={PAD} y1={12} x2={PAD} y2={H - PAD} stroke="#b0552f" strokeWidth="1.5" />
          <path d={path} fill="none" stroke="#2a5298" strokeWidth="2.5" className="sketch-line" />
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={sx(p[0])} cy={sy(p[1])} r="4" fill="#fff" stroke="#b0552f" strokeWidth="2" />
              <text x={sx(p[0])} y={H - PAD + 14} textAnchor="middle" fontSize="10" fill="#637c96" fontFamily="var(--font-manrope)">{p[0]}</text>
            </g>
          ))}
          <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="#637c96" fontFamily="var(--font-manrope)">{visual.xlabel}</text>
          <text x={12} y={H / 2} textAnchor="middle" fontSize="10" fill="#637c96" transform={`rotate(-90 12 ${H / 2})`} fontFamily="var(--font-manrope)">{visual.ylabel}</text>
        </svg>
      );
    }
  }
}

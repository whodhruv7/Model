"use client";
// FlowChart — the chapter's journey drawn as a winding notebook path of steps.
import { useState } from "react";
import type { FlowChart } from "@/lib/learn/artifacts";

export function FlowChartView({ chart }: { chart: FlowChart }) {
  const [open, setOpen] = useState<number | null>(0);
  // snake layout: rows of 3, alternate direction
  const COLS = 3;
  const rows: number[][] = [];
  chart.steps.forEach((_, i) => { const r = Math.floor(i / COLS); if (!rows[r]) rows[r] = []; rows[r].push(i); });

  const posOf = (i: number) => {
    const r = Math.floor(i / COLS), c = i % COLS;
    const col = r % 2 === 0 ? c : COLS - 1 - c;
    return { x: 90 + col * 250, y: 80 + r * 150 };
  };

  const W = 90 + (COLS - 1) * 250 + 190;
  const H = 80 + (rows.length - 1) * 150 + 140;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block w-full min-w-[720px] max-w-[1000px]" role="img" aria-label={chart.title}>
        <text x={W / 2} y={34} textAnchor="middle" fontSize="21" fontWeight="800" fill="#16305b" fontFamily="var(--font-hand)">{chart.title}</text>
        {/* edges */}
        {chart.edges.map(([a, b], i) => {
          const p1 = posOf(a), p2 = posOf(b);
          if (!p1 || !p2) return null;
          const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2 - 34 + ((i % 3) - 1) * 10;
          return (
            <g key={i}>
              <path d={`M${p1.x},${p1.y + 30} Q${mx},${my + 30} ${p2.x},${p2.y - 30}`} fill="none" stroke="#b0552f" strokeWidth="2" className="sketch-line" opacity="0.75" />
              <polygon points={`${p2.x - 5},${p2.y - 26} ${p2.x + 6},${p2.y - 30} ${p2.x},${p2.y - 18}`} fill="#b0552f" opacity="0.8" />
            </g>
          );
        })}
        {/* nodes */}
        {chart.steps.map((s, i) => {
          const p = posOf(i);
          const isOpen = open === i;
          return (
            <g key={s.id} onClick={() => setOpen(isOpen ? null : i)} style={{ cursor: "pointer" }}>
              <g transform={`rotate(${((i * 17) % 5) - 2} ${p.x} ${p.y})`}>
                <ellipse cx={p.x} cy={p.y} rx="92" ry="42" fill={isOpen ? "#fff1e7" : "#ffffff"} stroke={isOpen ? "#dd9a72" : "#b9d4ea"} strokeWidth={isOpen ? 3 : 2.2} />
                <ellipse cx={p.x} cy={p.y} rx="98" ry="47" fill="none" stroke="#d7e9f5" strokeWidth="1.2" opacity="0.8" />
                <text x={p.x} y={p.y + 6} textAnchor="middle" fontSize="14.5" fontWeight="800" fill="#16305b" fontFamily="var(--font-manrope)">{s.label}</text>
                <text x={p.x} y={p.y - 20} textAnchor="middle" fontSize="12" fontWeight="800" fill="#b0552f" fontFamily="var(--font-hand)">{i + 1}</text>
              </g>
              {isOpen && (
                <foreignObject x={p.x - 105} y={p.y + 48} width="210" height="84">
                  <div className="rounded-lg bg-[#16305b] px-3 py-2 text-center">
                    <p className="text-[11.5px] font-semibold leading-snug text-white">{s.detail}</p>
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-center text-[11.5px] font-semibold text-[#8a94a8]">kisi bhi island pe tap karo — detail khulegi</p>
    </div>
  );
}

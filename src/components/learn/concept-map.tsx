"use client";
// ConceptMap — radial hand-drawn map: center hub, grouped satellites, sketch edges.
import { useMemo, useState } from "react";
import type { ConceptMap } from "@/lib/learn/artifacts";

const GROUP_FILL = ["#d7e9f5", "#f6d5c6", "#d9f2dd", "#f3e6f7", "#fff3c9"];
const GROUP_STROKE = ["#7fa8d0", "#dd9a72", "#7cb98a", "#b58cc9", "#d4b45a"];

export function ConceptMapView({ map }: { map: ConceptMap }) {
  const [hover, setHover] = useState<string | null>(null);
  const W = 900, H = 620, CX = W / 2, CY = H / 2;

  const layout = useMemo(() => {
    const groups = map.groups.map((g, gi) => ({ ...g, idx: gi }));
    const byGroup = new Map<string, typeof map.nodes>();
    for (const n of map.nodes) { const l = byGroup.get(n.group) ?? []; l.push(n); byGroup.set(n.group, l); }
    // fan groups around the hub
    const positions = new Map<string, { x: number; y: number }>();
    const gAngles: number[] = [];
    groups.forEach((g, gi) => {
      const base = (gi / Math.max(1, groups.length)) * Math.PI * 2 - Math.PI / 2;
      gAngles.push(base);
      const nodes = byGroup.get(g.id) ?? [];
      const spread = Math.min(0.9, 0.34 * nodes.length);
      nodes.forEach((n, ni) => {
        const a = base + (nodes.length === 1 ? 0 : (ni / (nodes.length - 1) - 0.5) * spread);
        const r = 175 + (ni % 2) * 55;
        positions.set(n.id, { x: CX + Math.cos(a) * r * 1.25, y: CY + Math.sin(a) * r * 0.92 });
      });
    });
    return { groups, positions, gAngles };
  }, [map, CX, CY]);

  const groupIdx = (gid: string) => layout.groups.findIndex(g => g.id === gid);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block w-full min-w-[680px] max-w-[980px]" role="img" aria-label={`Concept map: ${map.center}`}>
        {/* edges */}
        {map.edges.map((e, i) => {
          const a = layout.positions.get(e.from), b = layout.positions.get(e.to);
          if (!a || !b) return null;
          const mx = (a.x + b.x) / 2 + ((i % 3) - 1) * 26, my = (a.y + b.y) / 2 + ((i % 2) - 0.5) * 30;
          const active = hover && (hover === e.from || hover === e.to);
          return (
            <g key={i}>
              <path d={`M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`} fill="none" stroke={active ? "#b0552f" : "#a9bdd4"} strokeWidth={active ? 2.4 : 1.6} className={active ? "sketch-line" : ""} />
              {e.label && (
                <text x={mx} y={my - 6} textAnchor="middle" fontSize="11" fill="#8a94a8" fontFamily="var(--font-hand)" transform={`rotate(${((i * 23) % 5) - 2} ${mx} ${my})`}>{e.label}</text>
              )}
            </g>
          );
        })}
        {/* center hub */}
        <g>
          <ellipse cx={CX} cy={CY} rx={Math.max(74, map.center.length * 7.2)} ry="44" fill="#16305b" stroke="#214F78" strokeWidth="3" />
          <text x={CX} y={CY + 7} textAnchor="middle" fontSize="19" fontWeight="800" fill="#ffffff" fontFamily="var(--font-manrope)">{map.center}</text>
          <ellipse cx={CX} cy={CY} rx={Math.max(80, map.center.length * 7.2 + 6)} ry="50" fill="none" stroke="#b0552f" strokeWidth="1.4" className="sketch-line" opacity="0.6" />
        </g>
        {/* group satellites */}
        {map.nodes.map((n, i) => {
          const p = layout.positions.get(n.id); if (!p) return null;
          const gi = groupIdx(n.group); const w = Math.max(84, n.label.length * 8.4);
          const active = hover === n.id;
          return (
            <g key={n.id} onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} style={{ cursor: "default" }} transform={`rotate(${((i * 31) % 5) - 2} ${p.x} ${p.y})`}>
              <rect x={p.x - w / 2} y={p.y - 19} width={w} height={38} rx="19" fill={GROUP_FILL[gi % GROUP_FILL.length]} stroke={GROUP_STROKE[gi % GROUP_STROKE.length]} strokeWidth={active ? 3 : 2} />
              <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill="#2b3a67" fontFamily="var(--font-manrope)">{n.label}</text>
            </g>
          );
        })}
      </svg>
      {/* legend */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {layout.groups.map((g, i) => (
          <span key={g.id} className="flex items-center gap-1.5 text-[12px] font-bold text-[#637c96]">
            <span className="inline-block h-3 w-5 rounded-full" style={{ background: GROUP_FILL[i % GROUP_FILL.length], border: `2px solid ${GROUP_STROKE[i % GROUP_STROKE.length]}` }} />
            {g.label}
          </span>
        ))}
      </div>
    </div>
  );
}

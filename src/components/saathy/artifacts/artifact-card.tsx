'use client';

// Artifacts — interactive visuals attached to Saathy's replies.
// type chart: animated SVG line/bar chart from the model's own numbers.
// type demo: one of six built-in concept machines (no model code is executed —
// every widget is deterministic, hand-built React/SVG).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Expand, Minimize2, MousePointerClick } from 'lucide-react';
import type { Artifact, ChartSpec } from '@/lib/saathy-types';
import { MotionWidget, WaveWidget, AtomWidget, AnglesWidget, FractionWidget, MarketWidget, PyramidWidget } from './demo-widgets';

const NAVY = '#16305b';
const BLUE = '#5E97F0';
const PEACH = '#f6a97c';
const GOLD = '#f19937';
const GREEN = '#46a758';
const GRID = '#e6ecf4';

// ---------------- Chart (line / bar) ----------------

function niceRange(min: number, max: number): [number, number] {
  if (min === max) return [min - 1, max + 1];
  const pad = (max - min) * 0.08;
  return [min - pad, max + pad];
}

function ChartView({ spec }: { spec: ChartSpec }) {
  const W = 560;
  const H = 320;
  const M = { l: 46, r: 14, t: 16, b: 36 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;

  const allY = spec.series.flatMap((s) => s.points.map((p) => p.y));
  const yMin0 = spec.yMin ?? Math.min(...allY, 0);
  const yMax0 = spec.yMax ?? Math.max(...allY, 1);
  const [y0, y1] = niceRange(yMin0, yMax0);

  const isBar = spec.kind === 'bar';
  const nCats = spec.categories?.length ?? 0;

  const xFor = useCallback(
    (i: number, n: number) => {
      if (isBar) return M.l + (i + 0.5) * (iw / Math.max(n, 1));
      const p0 = spec.series[0]?.points ?? [];
      const xMin = spec.xMin ?? Math.min(...p0.map((p) => p.x), 0);
      const xMax = spec.xMax ?? Math.max(...p0.map((p) => p.x), 1);
      const t = xMax === xMin ? 0.5 : (i - xMin) / (xMax - xMin);
      return M.l + t * iw;
    },
    [isBar, iw, spec.series, spec.xMin, spec.xMax]
  );

  const yFor = useCallback((y: number) => M.t + ih - ((y - y0) / (y1 - y0)) * ih, [ih, y0, y1]);

  const yTicks = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i <= 4; i++) out.push(y0 + ((y1 - y0) * i) / 4);
    return out;
  }, [y0, y1]);

  const colors = [BLUE, PEACH, GREEN];
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={spec.xLabel + ' vs ' + spec.yLabel}>
      {/* grid */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={M.l} x2={W - M.r} y1={yFor(t)} y2={yFor(t)} stroke={GRID} strokeWidth={1} />
          <text x={M.l - 8} y={yFor(t) + 3.5} textAnchor="end" fontSize={10} fill="#8a94a8" fontWeight={600}>
            {Math.abs(t) >= 1000 ? `${Math.round(t / 100) / 10}k` : Math.round(t * 100) / 100}
          </text>
        </g>
      ))}
      {/* axes */}
      <line x1={M.l} x2={W - M.r} y1={M.t + ih} y2={M.t + ih} stroke="#c8d2e0" strokeWidth={1.5} />
      <line x1={M.l} x2={M.l} y1={M.t} y2={M.t + ih} stroke="#c8d2e0" strokeWidth={1.5} />
      <text x={W - M.r} y={H - 6} textAnchor="end" fontSize={11} fill="#5c6f8a" fontWeight={700}>{spec.xLabel}</text>
      <text x={M.l - 34} y={M.t + 4} fontSize={11} fill="#5c6f8a" fontWeight={700}>{spec.yLabel}</text>

      {/* bars */}
      {isBar &&
        spec.series.map((s, si) =>
          s.points.map((p, i) => {
            const bw = (iw / Math.max(nCats || s.points.length, 1)) * 0.62;
            const x = xFor(i, nCats || s.points.length) - bw / 2;
            const y = yFor(p.y);
            return (
              <rect
                key={`${si}-${i}`}
                className="chart-bar"
                x={x}
                y={y}
                width={bw}
                height={M.t + ih - y}
                rx={5}
                fill={colors[si % 3]}
                opacity={0.88}
                style={{ animationDelay: `${i * 80}ms`, transformOrigin: `${x + bw / 2}px ${M.t + ih}px` }}
                onMouseEnter={() => setHover({ x: x + bw / 2, y: y - 8, text: `${spec.categories?.[i] ?? i}: ${p.y}` })}
                onMouseLeave={() => setHover(null)}
              />
            );
          })
        )}

      {/* lines */}
      {!isBar &&
        spec.series.map((s, si) => {
          const d = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(p.x, s.points.length)},${yFor(p.y)}`).join(' ');
          return (
            <g key={si}>
              <path d={d} fill="none" stroke={colors[si % 3]} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" className="chart-line" />
              {s.points.map((p, i) => (
                <circle
                  key={i}
                  className="chart-dot"
                  cx={xFor(p.x, s.points.length)}
                  cy={yFor(p.y)}
                  r={4}
                  fill="#fff"
                  stroke={colors[si % 3]}
                  strokeWidth={2.4}
                  style={{ animationDelay: `${i * 90}ms` }}
                  onMouseEnter={() => setHover({ x: xFor(p.x, s.points.length), y: yFor(p.y) - 10, text: `(${p.x}, ${p.y})` })}
                  onMouseLeave={() => setHover(null)}
                />
              ))}
            </g>
          );
        })}

      {/* x labels */}
      {isBar && spec.categories
        ? spec.categories.map((c, i) => (
            <text key={i} x={xFor(i, spec.categories!.length)} y={M.t + ih + 16} textAnchor="middle" fontSize={10.5} fill="#5c6f8a" fontWeight={700}>
              {c}
            </text>
          ))
        : null}

      {/* legend */}
      {spec.series.length > 1
        ? spec.series.map((s, i) => (
            <g key={i} transform={`translate(${M.l + 8 + i * 110}, ${M.t + 10})`}>
              <rect width={10} height={10} rx={3} fill={colors[i % 3]} />
              <text x={15} y={9} fontSize={10.5} fill="#5c6f8a" fontWeight={700}>{s.name}</text>
            </g>
          ))
        : null}

      {hover ? (
        <g>
          <rect x={hover.x - 34} y={hover.y - 22} width={68} height={20} rx={6} fill={NAVY} opacity={0.92} />
          <text x={hover.x} y={hover.y - 8} textAnchor="middle" fontSize={10.5} fill="#fff" fontWeight={700}>
            {hover.text.length > 12 ? hover.text.slice(0, 12) : hover.text}
          </text>
        </g>
      ) : null}
    </svg>
  );
}

// ---------------- Demo widgets ----------------

function Slider({ label, value, min, max, step, onChange, color = GOLD }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; color?: string }) {
  return (
    <label className="flex items-center gap-2 text-[11.5px] font-bold text-[#5c6f8a]">
      <span className="w-6">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-[#e8e2da] accent-[#f19937] sm:w-32"
        style={{ accentColor: color }}
      />
      <span className="w-9 rounded-md bg-white px-1 text-center font-extrabold text-[#16305b]" style={{ border: `1px solid ${color}44` }}>
        {value}
      </span>
    </label>
  );
}

// numberline — drag the dot
function NumberLine({ params, prompt }: { params: Record<string, number | string>; prompt?: string }) {
  const W = 560;
  const H = 150;
  const mid = W / 2;
  const unit = 46;
  const [val, setVal] = useState(typeof params.value === 'number' ? params.value : 2.5);
  const ref = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const xToVal = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return val;
    const x = ((clientX - r.left) / r.width) * W;
    return Math.round(((x - mid) / unit) * 20) / 20; // 0.05 steps
  };

  const frac = (v: number) => {
    const den = 20;
    const num = Math.round(v * den);
    const g = (a: number, b: number): number => (b === 0 ? a : g(b, a % b));
    const d = g(Math.abs(num), den) || 1;
    return `${num / d}/${den / d}`;
  };

  return (
    <div>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-ew-resize touch-none select-none"
        onPointerDown={(e) => {
          dragging.current = true;
          setVal(xToVal(e.clientX));
        }}
        onPointerMove={(e) => dragging.current && setVal(xToVal(e.clientX))}
        onPointerUp={() => (dragging.current = false)}
        onPointerLeave={() => (dragging.current = false)}
      >
        <line x1={20} x2={W - 20} y1={86} y2={86} stroke={NAVY} strokeWidth={2.5} strokeLinecap="round" />
        {Array.from({ length: 21 }, (_, i) => i - 10).map((n) => {
          const x = mid + n * unit;
          const major = n % 2 === 0;
          return (
            <g key={n}>
              <line x1={x} x2={x} y1={major ? 78 : 81} y2={91} stroke={NAVY} strokeWidth={major ? 2 : 1.2} opacity={major ? 0.8 : 0.4} />
              {major ? (
                <text x={x} y={108} textAnchor="middle" fontSize={11} fontWeight={700} fill="#5c6f8a">
                  {n / 2}
                </text>
              ) : null}
            </g>
          );
        })}
        <line x1={mid + val * unit} x2={mid + val * unit} y1={40} y2={86} stroke={PEACH} strokeWidth={2} strokeDasharray="4 3" />
        <circle cx={mid + val * unit} cy={86} r={9} fill={PEACH} stroke="#fff" strokeWidth={2.5} className="nl-dot" />
        <text x={mid + val * unit} y={30} textAnchor="middle" fontSize={15} fontWeight={800} fill={NAVY}>
          {Math.round(val * 100) / 100}
        </text>
      </svg>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1">
        <p className="text-[11.5px] font-semibold text-[#8a94a8]">{prompt ?? 'Drag the dot — every point on the line is a number.'}</p>
        <p className="rounded-full border border-[#ffd9c4] bg-[#fff6ef] px-2.5 py-0.5 text-[11px] font-extrabold text-[#a05c2e]">
          between: {frac(val)}
        </p>
      </div>
    </div>
  );
}

// parabola — y = ax^2 + bx + c
function Parabola({ params, prompt }: { params: Record<string, number | string>; prompt?: string }) {
  const [a, setA] = useState(typeof params.a === 'number' ? params.a : 1);
  const [b, setB] = useState(typeof params.b === 'number' ? params.b : 0);
  const [c, setC] = useState(typeof params.c === 'number' ? params.c : -3);
  const W = 560;
  const H = 320;
  const cx = W / 2;
  const cy = H / 2 + 20;
  const unit = 24;
  const f = (x: number) => a * x * x + b * x + c;
  const pts: string[] = [];
  for (let x = -10; x <= 10; x += 0.1) {
    const y = f(x);
    if (y > -9 && y < 9) pts.push(`${cx + x * unit},${cy - y * unit}`);
  }
  const disc = b * b - 4 * a * c;
  const r1 = disc >= 0 ? (-b - Math.sqrt(disc)) / (2 * a) : null;
  const r2 = disc >= 0 ? (-b + Math.sqrt(disc)) / (2 * a) : null;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {Array.from({ length: 15 }, (_, i) => i - 7).map((n) => (
          <g key={`v${n}`}>
            <line x1={cx + n * unit} x2={cx + n * unit} y1={10} y2={H - 10} stroke={GRID} strokeWidth={1} />
            <line x1={10} x2={W - 10} y1={cy + n * unit} y2={cy + n * unit} stroke={GRID} strokeWidth={1} />
          </g>
        ))}
        <line x1={10} x2={W - 10} y1={cy} y2={cy} stroke="#9fb3c8" strokeWidth={1.8} />
        <line x1={cx} x2={cx} y1={10} y2={H - 10} stroke="#9fb3c8" strokeWidth={1.8} />
        <polyline points={pts.join(' ')} fill="none" stroke={BLUE} strokeWidth={3} strokeLinecap="round" className="chart-line" />
        {r1 !== null && r2 !== null ? (
          <>
            <circle cx={cx + r1 * unit} cy={cy} r={6} fill={GREEN} stroke="#fff" strokeWidth={2} className="chart-dot" />
            <circle cx={cx + r2 * unit} cy={cy} r={6} fill={GREEN} stroke="#fff" strokeWidth={2} className="chart-dot" />
            <text x={cx + r1 * unit} y={cy + 22} textAnchor="middle" fontSize={11} fontWeight={800} fill={GREEN}>
              {Math.round(r1 * 100) / 100}
            </text>
            <text x={cx + r2 * unit} y={cy + 22} textAnchor="middle" fontSize={11} fontWeight={800} fill={GREEN}>
              {Math.round(r2 * 100) / 100}
            </text>
          </>
        ) : (
          <text x={W - 30} y={30} textAnchor="end" fontSize={12} fontWeight={800} fill={PEACH}>
            no real roots (D &lt; 0)
          </text>
        )}
        <text x={16} y={26} fontSize={14} fontWeight={800} fill={NAVY}>
          y = {a}x² {b >= 0 ? '+' : '−'} {Math.abs(b)}x {c >= 0 ? '+' : '−'} {Math.abs(c)}
        </text>
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 pb-1">
        <Slider label="a" value={a} min={-3} max={3} step={0.25} onChange={setA} color={BLUE} />
        <Slider label="b" value={b} min={-6} max={6} step={0.5} onChange={setB} color={BLUE} />
        <Slider label="c" value={c} min={-6} max={6} step={0.5} onChange={setC} color={BLUE} />
      </div>
      <p className="px-1 pb-1 text-[11.5px] font-semibold text-[#8a94a8]">{prompt ?? 'Slide a, b, c — watch the curve flip, slide and dive. Green dots = roots.'}</p>
    </div>
  );
}

// apline — AP / GP dot machine
function ApLine({ params, prompt }: { params: Record<string, number | string>; prompt?: string }) {
  const [type, setType] = useState(params.type === 'GP' ? 'GP' : 'AP');
  const [a, setA] = useState(typeof params.a === 'number' ? params.a : 2);
  const [d, setD] = useState(typeof params.d === 'number' ? params.d : 3);
  const [r, setR] = useState(typeof params.r === 'number' ? params.r : 1.5);
  const n = 8;
  const terms = Array.from({ length: n }, (_, i) => (type === 'AP' ? a + i * d : a * Math.pow(r, i)));
  const maxT = Math.max(...terms, 1);
  const W = 560;
  const H = 230;
  const bw = (W - 80) / n;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1={30} x2={W - 20} y1={H - 34} y2={H - 34} stroke="#9fb3c8" strokeWidth={1.8} />
        {terms.map((t, i) => {
          const h = (t / maxT) * (H - 90);
          const x = 40 + i * bw;
          return (
            <g key={i}>
              <circle cx={x + bw / 2 - 10} cy={H - 40 - h} r={Math.min(6 + t / maxT * 8, 13)} fill={type === 'AP' ? PEACH : GOLD} opacity={0.9} className="chart-dot" style={{ animationDelay: `${i * 90}ms` }} />
              <rect x={x + 6} y={H - 36 - h} width={bw - 26} height={h} rx={4} fill={type === 'AP' ? '#f6a97c44' : '#f1993744'} />
              <text x={x + bw / 2 - 10} y={H - 18} textAnchor="middle" fontSize={10} fontWeight={700} fill="#5c6f8a">
                t{i + 1}
              </text>
              <text x={x + bw / 2 - 10} y={H - 52 - h} textAnchor="middle" fontSize={10.5} fontWeight={800} fill={NAVY}>
                {Math.round(t * 100) / 100}
              </text>
            </g>
          );
        })}
        <text x={W - 24} y={30} textAnchor="end" fontSize={13} fontWeight={800} fill={NAVY}>
          {type === 'AP' ? `tₙ = ${a} + (n−1)·${d}` : `tₙ = ${a} · ${r}^(n−1)`}
        </text>
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 pb-1">
        <div className="flex overflow-hidden rounded-lg border border-[#e8e2da]">
          {['AP', 'GP'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-3 py-1 text-[11.5px] font-extrabold transition ${type === t ? 'bg-[#7fb3ff] text-[#0e2a5e]' : 'bg-white text-[#5c6f8a] hover:bg-[#f3f9ff]'}`}
            >
              {t === 'AP' ? 'AP (+d)' : 'GP (×r)'}
            </button>
          ))}
        </div>
        <Slider label="a" value={a} min={1} max={10} step={1} onChange={setA} />
        {type === 'AP' ? <Slider label="d" value={d} min={1} max={8} step={1} onChange={setD} /> : <Slider label="r" value={r} min={1.1} max={2.5} step={0.1} onChange={setR} />}
      </div>
      <p className="px-1 pb-1 text-[11.5px] font-semibold text-[#8a94a8]">{prompt ?? 'AP adds the same thing each time; GP multiplies. Feel the difference.'}</p>
    </div>
  );
}

// dice — probability simulator
function Dice({ params, prompt }: { params: Record<string, number | string>; prompt?: string }) {
  const sides = params.sides === 12 ? 12 : 6;
  const [counts, setCounts] = useState<number[]>(Array(sides).fill(0));
  const [rolls, setRolls] = useState(0);
  const [rolling, setRolling] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const roll = (times: number) => {
    setCounts((prev) => {
      const next = [...prev];
      for (let i = 0; i < times; i++) next[Math.floor(Math.random() * sides)]++;
      return next;
    });
    setRolls((r) => r + times);
  };

  const burst = () => {
    if (rolling) return;
    setRolling(true);
    let done = 0;
    timer.current = setInterval(() => {
      roll(20);
      done += 20;
      if (done >= 240) {
        if (timer.current) clearInterval(timer.current);
        setRolling(false);
      }
    }, 90);
  };

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const maxC = Math.max(...counts, 10);
  const W = 560;
  const H = 230;
  const bw = (W - 80) / sides;
  const fair = rolls / sides;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1={30} x2={W - 20} y1={H - 34} y2={H - 34} stroke="#9fb3c8" strokeWidth={1.8} />
        {fair > 0 ? (
          <g>
            <line x1={30} x2={W - 20} y1={H - 40 - (fair / maxC) * (H - 90)} y2={H - 40 - (fair / maxC) * (H - 90)} stroke={GREEN} strokeWidth={2} strokeDasharray="6 4" />
            <text x={W - 24} y={H - 46 - (fair / maxC) * (H - 90)} textAnchor="end" fontSize={10.5} fontWeight={800} fill={GREEN}>
              fair share {Math.round(fair * 10) / 10}
            </text>
          </g>
        ) : null}
        {counts.map((c, i) => {
          const h = (c / maxC) * (H - 90);
          return (
            <g key={i}>
              <rect x={40 + i * bw + 8} y={H - 38 - h} width={bw - 18} height={h} rx={6} fill={PEACH} opacity={0.92} className="chart-bar" style={{ transformOrigin: `${40 + i * bw + 8 + (bw - 18) / 2}px ${H - 38}px` }} />
              <text x={40 + i * bw + bw / 2 - 1} y={H - 18} textAnchor="middle" fontSize={11} fontWeight={800} fill="#5c6f8a">
                {i + 1}
              </text>
              {c > 0 ? (
                <text x={40 + i * bw + bw / 2 - 1} y={H - 44 - h} textAnchor="middle" fontSize={10.5} fontWeight={800} fill={NAVY}>
                  {c}
                </text>
              ) : null}
            </g>
          );
        })}
        <text x={34} y={26} fontSize={13} fontWeight={800} fill={NAVY}>
          {rolls} rolls — watch the bars settle towards equal
        </text>
      </svg>
      <div className="flex flex-wrap items-center gap-2 px-1 pb-1">
        <button type="button" onClick={() => roll(1)} className="rounded-lg border border-[#ffd9c4] bg-[#fff6ef] px-3 py-1.5 text-[12px] font-extrabold text-[#a05c2e] transition hover:bg-[#ffe6d7]">
          Roll once
        </button>
        <button type="button" onClick={burst} disabled={rolling} className="rounded-lg bg-gradient-to-r from-[#f6a97c] to-[#f19937] px-3 py-1.5 text-[12px] font-extrabold text-white shadow-sm transition hover:brightness-105 disabled:opacity-60">
          {rolling ? 'Rolling…' : 'Roll 240 times'}
        </button>
        <button type="button" onClick={() => { setCounts(Array(sides).fill(0)); setRolls(0); }} className="rounded-lg border border-[#e8e2da] bg-white px-3 py-1.5 text-[12px] font-bold text-[#5c6f8a] hover:bg-[#f3f9ff]">
          Reset
        </button>
      </div>
      <p className="px-1 pb-1 text-[11.5px] font-semibold text-[#8a94a8]">{prompt ?? `A fair ${sides}-sided die: every face SHOULD come up about 1/${sides} of the time. Try it.`}</p>
    </div>
  );
}

// pythag — right triangle with squares on sides
function Pythag({ params, prompt }: { params: Record<string, number | string>; prompt?: string }) {
  const [a, setA] = useState(typeof params.a === 'number' ? params.a : 3);
  const [b, setB] = useState(typeof params.b === 'number' ? params.b : 4);
  const c = Math.round(Math.sqrt(a * a + b * b) * 100) / 100;
  const W = 560;
  const H = 300;
  const unit = Math.min(26, 200 / Math.max(a + b, 6));
  const ox = 130;
  const oy = H - 60;
  const bx = ox + b * unit;
  const ay = oy - a * unit;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* squares */}
        <rect x={ox} y={oy} width={b * unit} height={a * unit} transform={`rotate(-90 ${ox} ${oy}) translate(0 ${-a * unit})`} fill="none" />
        <rect x={ox} y={oy - a * unit - b * unit} width={b * unit} height={b * unit} fill="#f6a97c33" stroke={PEACH} strokeWidth={1.5} />
        <rect x={ox - a * unit} y={ay} width={a * unit} height={a * unit} fill="#7fb3ff33" stroke={BLUE} strokeWidth={1.5} />
        {/* triangle */}
        <polygon points={`${ox},${oy} ${bx},${oy} ${ox},${ay}`} fill="#7fb3ff14" stroke={NAVY} strokeWidth={2.4} strokeLinejoin="round" />
        {/* right angle marker */}
        <rect x={ox + 5} y={oy - 12} width={12} height={12} fill="none" stroke={NAVY} strokeWidth={1.4} />
        <text x={(ox + bx) / 2} y={oy + 20} textAnchor="middle" fontSize={12} fontWeight={800} fill={NAVY}>{b}</text>
        <text x={ox - 12} y={(oy + ay) / 2} textAnchor="middle" fontSize={12} fontWeight={800} fill={NAVY}>{a}</text>
        <text x={(ox + bx) / 2 - 26} y={(oy + ay) / 2 - 6} fontSize={12} fontWeight={800} fill={GOLD}>{c}?</text>
        <text x={ox + b * unit / 2} y={oy - a * unit - b * unit / 2} textAnchor="middle" fontSize={12} fontWeight={800} fill="#a05c2e">{`b² = ${b * b}`}</text>
        <text x={ox - a * unit / 2} y={ay + a * unit / 2} textAnchor="middle" fontSize={12} fontWeight={800} fill="#2a5298">{`a² = ${a * a}`}</text>
        <text x={ox + 90} y={40} fontSize={14} fontWeight={800} fill={NAVY}>{`${a * a} + ${b * b} = ${a * a + b * b} = c²`}</text>
        <text x={ox + 90} y={60} fontSize={13} fontWeight={800} fill={GOLD}>{`c = ${c}`}</text>
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 pb-1">
        <Slider label="a" value={a} min={1} max={8} step={1} onChange={setA} color={BLUE} />
        <Slider label="b" value={b} min={1} max={8} step={1} onChange={setB} color={PEACH} />
      </div>
      <p className="px-1 pb-1 text-[11.5px] font-semibold text-[#8a94a8]">{prompt ?? 'Move a and b — the two squares always add up to the square on the longest side.'}</p>
    </div>
  );
}

// linegraph — y = mx + c
function LineGraph({ params, prompt }: { params: Record<string, number | string>; prompt?: string }) {
  const [m, setM] = useState(typeof params.m === 'number' ? params.m : 2);
  const [c, setC] = useState(typeof params.c === 'number' ? params.c : 1);
  const W = 560;
  const H = 320;
  const cx = W / 2;
  const cy = H / 2;
  const unit = 24;
  // y = mx + c sampled
  const x1 = -10;
  const x2 = 10;
  const p1 = { x: cx + x1 * unit, y: cy - (m * x1 + c) * unit };
  const p2 = { x: cx + x2 * unit, y: cy - (m * x2 + c) * unit };

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {Array.from({ length: 15 }, (_, i) => i - 7).map((n) => (
          <g key={`g${n}`}>
            <line x1={cx + n * unit} x2={cx + n * unit} y1={10} y2={H - 10} stroke={GRID} strokeWidth={1} />
            <line x1={10} x2={W - 10} y1={cy + n * unit} y2={cy + n * unit} stroke={GRID} strokeWidth={1} />
          </g>
        ))}
        <line x1={10} x2={W - 10} y1={cy} y2={cy} stroke="#9fb3c8" strokeWidth={1.8} />
        <line x1={cx} x2={cx} y1={10} y2={H - 10} stroke="#9fb3c8" strokeWidth={1.8} />
        {/* slope triangle: run 1, rise m */}
        <polygon
          points={`${cx},${cy - c * unit} ${cx + unit},${cy - c * unit} ${cx + unit},${cy - (m + c) * unit}`}
          fill="#f1993730"
          stroke={GOLD}
          strokeWidth={1.6}
          strokeDasharray="5 3"
        />
        <text x={cx + unit / 2} y={cy - c * unit + 14} textAnchor="middle" fontSize={10.5} fontWeight={800} fill="#a05c2e">1</text>
        <text x={cx + unit + 14} y={cy - (m / 2 + c) * unit} fontSize={10.5} fontWeight={800} fill="#a05c2e">{m}</text>
        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={BLUE} strokeWidth={3.2} strokeLinecap="round" className="chart-line" />
        <circle cx={cx} cy={cy - c * unit} r={5.5} fill={PEACH} stroke="#fff" strokeWidth={2} className="chart-dot" />
        <text x={cx + 10} y={cy - c * unit - 8} fontSize={11} fontWeight={800} fill="#a05c2e">c = {c}</text>
        <text x={16} y={26} fontSize={14} fontWeight={800} fill={NAVY}>
          y = {m}x {c >= 0 ? '+' : '−'} {Math.abs(c)}
        </text>
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 pb-1">
        <Slider label="m" value={m} min={-4} max={4} step={0.5} onChange={setM} color={BLUE} />
        <Slider label="c" value={c} min={-5} max={5} step={1} onChange={setC} color={PEACH} />
      </div>
      <p className="px-1 pb-1 text-[11.5px] font-semibold text-[#8a94a8]">{prompt ?? 'm tilts the line, c lifts it. The dashed step shows rise over run.'}</p>
    </div>
  );
}

// ---------------- Timeline (SST: history, policy, journeys) ----------------

function Timeline({ events, prompt }: { events: Array<{ when: string; what: string }>; prompt?: string }) {
  const [shown, setShown] = useState(animationsEnabledDefault() ? 0 : events.length);
  useEffect(() => {
    if (shown >= events.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), 260);
    return () => clearTimeout(t);
  }, [shown, events.length]);

  return (
    <div className="px-1 pb-2 pt-1">
      <ol className="relative ml-3 space-y-0 border-l-2 border-[#cfe3fb] pl-5">
        {events.map((e, i) => (
          <li
            key={`${e.when}-${i}`}
            className={`relative pb-3.5 last:pb-1 ${i < shown ? 'msg-in' : 'opacity-0'}`}
            style={i < shown ? { animationDelay: '0ms' } : undefined}
          >
            <span className="absolute -left-[27px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#a9cee8] bg-[#f6d5c6] shadow-[0_0_0_3px_rgba(169,206,232,0.25)]" />
            <p className="text-[12px] font-extrabold tracking-wide text-[#2a5298]">{e.when}</p>
            <p className="text-[13px] font-semibold leading-snug text-[#17324f]">{e.what}</p>
          </li>
        ))}
      </ol>
      <p className="px-1 pb-1 text-[11.5px] font-semibold text-[#8a94a8]">{prompt ?? 'Events appear one by one — read them top to bottom, in order.'}</p>
    </div>
  );
}

// default from the app's animation preference (computed lazily, SSR-safe)
function animationsEnabledDefault(): boolean {
  try {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('saathy_animations') !== 'off' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
}

// ---------------- Card shell ----------------

export function ArtifactCard({ artifact, animationsEnabled }: { artifact: Artifact; animationsEnabled: boolean }) {
  const [big, setBig] = useState(false);
  const body = useMemo(() => {
    if (artifact.type === 'chart' && artifact.chart) return <ChartView spec={artifact.chart} />;
    if (artifact.type === 'demo' && artifact.demo) {
      const d = artifact.demo;
      if (d.widget === 'numberline') return <NumberLine params={d.params ?? {}} prompt={d.prompt} />;
      if (d.widget === 'parabola') return <Parabola params={d.params ?? {}} prompt={d.prompt} />;
      if (d.widget === 'apline') return <ApLine params={d.params ?? {}} prompt={d.prompt} />;
      if (d.widget === 'dice') return <Dice params={d.params ?? {}} prompt={d.prompt} />;
      if (d.widget === 'pythag') return <Pythag params={d.params ?? {}} prompt={d.prompt} />;
      if (d.widget === 'linegraph') return <LineGraph params={d.params ?? {}} prompt={d.prompt} />;
      if (d.widget === 'motion') return <MotionWidget params={d.params ?? {}} prompt={d.prompt} />;
      if (d.widget === 'wave') return <WaveWidget params={d.params ?? {}} prompt={d.prompt} />;
      if (d.widget === 'atom') return <AtomWidget params={d.params ?? {}} prompt={d.prompt} />;
      if (d.widget === 'angles') return <AnglesWidget params={d.params ?? {}} prompt={d.prompt} />;
      if (d.widget === 'fraction') return <FractionWidget params={d.params ?? {}} prompt={d.prompt} />;
      if (d.widget === 'market') return <MarketWidget params={d.params ?? {}} prompt={d.prompt} />;
      if (d.widget === 'pyramid') return <PyramidWidget params={d.params ?? {}} prompt={d.prompt} />;
      if (d.widget === 'timeline') {
        const events = d.events && d.events.length > 0 ? d.events : [{ when: '—', what: 'Timeline events were not provided.' }];
        return <Timeline events={events} prompt={d.prompt} />;
      }
    }
    return null;
  }, [artifact]);

  if (!body) return null;

  return (
    <>
      <div className="msg-in mt-3 overflow-hidden rounded-2xl border border-[#cfe3fb] bg-white shadow-[0_3px_14px_rgba(30,58,138,0.08)]">
        <div className="flex items-center justify-between border-b border-[#e4eefb] bg-[linear-gradient(90deg,rgba(169,206,232,0.22),rgba(246,213,198,0.25))] px-3.5 py-2">
          <span className="flex items-center gap-1.5 text-[11.5px] font-extrabold tracking-wide text-[#2a5298]">
            <MousePointerClick className="h-3.5 w-3.5" />
            ARTIFACT · {artifact.title}
          </span>
          <button
            type="button"
            onClick={() => setBig(true)}
            className="rounded-lg p-1 text-[#5c6f8a] transition hover:bg-white/70 hover:text-[#16305b]"
            aria-label="Open artifact larger"
          >
            <Expand className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-2 pt-2">{body}</div>
      </div>

      {big ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102a4ccc] p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={artifact.title} onClick={() => setBig(false)}>
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between px-1">
              <p className="text-[13px] font-extrabold text-[#16305b]">{artifact.title}</p>
              <button type="button" onClick={() => setBig(false)} className="rounded-lg p-1.5 text-[#5c6f8a] hover:bg-[#f3f9ff]" aria-label="Close">
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
            {body}
          </div>
        </div>
      ) : null}
    </>
  );
}

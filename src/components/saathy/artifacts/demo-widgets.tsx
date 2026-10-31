'use client';

// Demo widgets II — the science + SST + basics concept machines.
// Same contract as the original six in artifact-card.tsx: deterministic,
// hand-built React/SVG, no model code executed. Theme palette shared.
import { useEffect, useMemo, useState } from 'react';

const NAVY = '#16305b';
const BLUE = '#5E97F0';
const PEACH = '#f6a97c';
const GOLD = '#f19937';
const GREEN = '#46a758';
const GRID = '#e6ecf4';

function animOn(): boolean {
  try {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('saathy_animations') !== 'off' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
}

function Slider({ label, value, min, max, step, onChange, color = PEACH, suffix }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; color?: string; suffix?: string;
}) {
  return (
    <label className="flex min-w-[130px] flex-1 items-center gap-2 text-[11.5px] font-extrabold text-[#5c6f8a]">
      <span className="whitespace-nowrap">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#e4eefb] accent-[#5E97F0]"
        style={{ accentColor: color }}
      />
      <span className="min-w-[42px] text-right font-black text-[#16305b]">{value}{suffix ?? ''}</span>
    </label>
  );
}

function Readout({ children }: { children: React.ReactNode }) {
  return <p className="px-1 pb-1 pt-0.5 text-[12px] font-extrabold text-[#2a5298]">{children}</p>;
}

// ---------------- motion — physics: v, a and the s-t trace ----------------

export function MotionWidget({ params, prompt }: { params: Record<string, number | string>; prompt?: string }) {
  const [v, setV] = useState(typeof params.v === 'number' ? params.v : 5);
  const [a, setA] = useState(typeof params.a === 'number' ? params.a : 2);
  const [t, setT] = useState(0);

  useEffect(() => {
    if (!animOn()) return;
    const iv = setInterval(() => {
      setT((prev) => {
        const next = prev + 0.1;
        return next > 5 ? 0 : Math.round(next * 10) / 10;
      });
    }, 110);
    return () => clearInterval(iv);
  }, []);

  const s = v * t + 0.5 * a * t * t;
  const speedNow = Math.max(0, v + a * t);

  const W = 560, H = 300;
  const trackY = 60, trackX0 = 40, trackX1 = W - 40;
  const maxS = Math.max(v * 5 + 0.5 * a * 25, 10);
  const dotX = trackX0 + (Math.min(s, maxS) / maxS) * (trackX1 - trackX0);
  // mini s-t graph — curve derived from pure math: s(τ) = vτ + ½aτ², τ ∈ [0, t]
  const gx = 70, gy = 130, gw = W - 120, gh = 130;
  const px = (tt: number) => gx + (tt / 5) * gw;
  const py = (ss: number) => gy + gh - (Math.min(ss, maxS) / maxS) * gh;
  const curve = useMemo(() => {
    const steps = 40;
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const tt = (t * i) / steps;
      const ss = v * tt + 0.5 * a * tt * tt;
      pts.push(`${px(tt).toFixed(1)},${py(ss).toFixed(1)}`);
    }
    return pts.join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, v, a, maxS]);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* track */}
        <line x1={trackX0} x2={trackX1} y1={trackY} y2={trackY} stroke="#9fb3c8" strokeWidth={4} strokeLinecap="round" />
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={trackX0 + f * (trackX1 - trackX0)} x2={trackX0 + f * (trackX1 - trackX0)} y1={trackY - 7} y2={trackY + 7} stroke="#9fb3c8" strokeWidth={2} />
            <text x={trackX0 + f * (trackX1 - trackX0)} y={trackY + 22} textAnchor="middle" fontSize={9.5} fontWeight={800} fill="#5c6f8a">
              {Math.round(f * maxS)}m
            </text>
          </g>
        ))}
        {/* ghost trail + dot */}
        <circle cx={dotX} cy={trackY - 14} r={11} fill={PEACH} stroke={NAVY} strokeWidth={2.4} className="chart-dot" />
        <text x={dotX} y={trackY - 10.5} textAnchor="middle" fontSize={9} fontWeight={900} fill={NAVY}>◎</text>
        {/* s-t graph */}
        <line x1={gx} x2={gx + gw} y1={gy + gh} y2={gy + gh} stroke="#9fb3c8" strokeWidth={1.8} />
        <line x1={gx} x2={gx} y1={gy} y2={gy + gh} stroke="#9fb3c8" strokeWidth={1.8} />
        <text x={gx + gw / 2} y={gy + gh + 16} textAnchor="middle" fontSize={10} fontWeight={800} fill="#5c6f8a">time (s)</text>
        <text x={gx - 10} y={gy + 8} textAnchor="end" fontSize={10} fontWeight={800} fill="#5c6f8a">{Math.round(maxS)}m</text>
        <polyline
          points={curve}
          fill="none" stroke={BLUE} strokeWidth={3} strokeLinecap="round" className="chart-line"
        />
        <circle cx={px(t)} cy={py(s)} r={5} fill={GOLD} stroke="#fff" strokeWidth={2} className="chart-dot" />
        <text x={gx + gw + 8} y={gy + 12} fontSize={11.5} fontWeight={900} fill={NAVY}>
          t={t.toFixed(1)}s
        </text>
        <text x={gx + gw + 8} y={gy + 30} fontSize={11.5} fontWeight={900} fill="#a05c2e">
          s={s.toFixed(1)}m
        </text>
        <text x={gx + gw + 8} y={gy + 48} fontSize={11.5} fontWeight={900} fill={GREEN}>
          v={speedNow.toFixed(1)}m/s
        </text>
        <text x={W - 30} y={H - 8} textAnchor="end" fontSize={10.5} fontWeight={800} fill="#8a94a8">
          {a === 0 ? 'uniform motion — the graph is a straight line' : a > 0 ? 'speeding up — the curve bends upward' : 'slowing down — the curve flattens'}
        </text>
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 pb-1">
        <Slider label="v (start speed)" value={v} min={0} max={12} step={1} onChange={setV} color={BLUE} suffix=" m/s" />
        <Slider label="a (acceleration)" value={a} min={-2} max={4} step={0.5} onChange={setA} color={GOLD} suffix=" m/s²" />
      </div>
      <Readout>{`s = v·t + ½at²  →  ${v}×${t.toFixed(1)} + ½×${a}×${t.toFixed(1)}² = ${s.toFixed(1)} m`}</Readout>
      <p className="px-1 pb-1 text-[11.5px] font-semibold text-[#8a94a8]">{prompt ?? 'Move v and a — watch the dot and the distance-time curve together.'}</p>
    </div>
  );
}

// ---------------- wave — sound: amplitude & frequency ----------------

export function WaveWidget({ params, prompt }: { params: Record<string, number | string>; prompt?: string }) {
  const [amp, setAmp] = useState(typeof params.amp === 'number' ? params.amp : 3);
  const [freq, setFreq] = useState(typeof params.freq === 'number' ? params.freq : 3);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!animOn()) return;
    const iv = setInterval(() => setPhase((p) => (p + 0.25) % (2 * Math.PI)), 60);
    return () => clearInterval(iv);
  }, []);

  const W = 560, H = 250, cy = H / 2;
  const realF = freq * 100; // slider 1..8 → 100..800 Hz
  const lambda = Math.round((343 / realF) * 100) / 100;
  const pts = useMemo(() => {
    const arr: string[] = [];
    for (let x = 0; x <= W - 40; x += 4) {
      const y = cy - amp * 16 * Math.sin((x / 70) * 2 * Math.PI - phase * (freq / 3));
      arr.push(`${x + 20},${y.toFixed(1)}`);
    }
    return arr.join(' ');
  }, [amp, freq, phase, cy]);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1={20} x2={W - 20} y1={cy} y2={cy} stroke="#9fb3c8" strokeWidth={1.6} strokeDasharray="5 4" />
        <polyline points={pts} fill="none" stroke={BLUE} strokeWidth={3.2} strokeLinecap="round" className="chart-line" />
        {/* amplitude bracket */}
        <line x1={34} x2={34} y1={cy} y2={cy - amp * 16} stroke={PEACH} strokeWidth={2.4} />
        <text x={44} y={cy - amp * 8} fontSize={11} fontWeight={900} fill="#a05c2e">amplitude = {amp} → loudness</text>
        {/* wavelength bracket */}
        {(() => {
          const x0 = 40 + (W - 120) * 0.55;
          const wavelengthPx = Math.max(30, Math.min(200, 440 / freq));
          return (
            <g>
              <line x1={x0} x2={x0 + wavelengthPx} y1={24} y2={24} stroke={GOLD} strokeWidth={2.4} />
              <line x1={x0} x2={x0} y1={18} y2={30} stroke={GOLD} strokeWidth={2} />
              <line x1={x0 + wavelengthPx} x2={x0 + wavelengthPx} y1={18} y2={30} stroke={GOLD} strokeWidth={2} />
              <text x={x0 + wavelengthPx / 2} y={16} textAnchor="middle" fontSize={11} fontWeight={900} fill="#a05c2e">λ (wavelength)</text>
            </g>
          );
        })()}
        <text x={W - 24} y={cy - amp * 16 - 12} textAnchor="end" fontSize={12} fontWeight={900} fill={NAVY}>
          f = {realF} Hz
        </text>
        <text x={W - 24} y={H - 12} textAnchor="end" fontSize={11} fontWeight={800} fill={GREEN}>
          {freq <= 2 ? 'low pitch — deep drum' : freq >= 6 ? 'high pitch — sharp whistle' : 'mid pitch — normal voice'}
        </text>
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 pb-1">
        <Slider label="amplitude" value={amp} min={1} max={5} step={0.5} onChange={setAmp} color={PEACH} />
        <Slider label="frequency" value={freq} min={1} max={8} step={1} onChange={setFreq} color={GOLD} suffix="×100Hz" />
      </div>
      <Readout>{`λ = speed ÷ frequency = 343 ÷ ${realF} = ${lambda} m — higher f, shorter λ`}</Readout>
      <p className="px-1 pb-1 text-[11.5px] font-semibold text-[#8a94a8]">{prompt ?? 'Amplitude changes how LOUD, frequency changes how SHRILL. Try extremes.'}</p>
    </div>
  );
}

// ---------------- atom — Bohr shells explorer ----------------

const ELEMENTS: Array<{ sym: string; name: string; z: number; mass: number }> = [
  { sym: 'H', name: 'Hydrogen', z: 1, mass: 1 },
  { sym: 'He', name: 'Helium', z: 2, mass: 4 },
  { sym: 'Li', name: 'Lithium', z: 3, mass: 7 },
  { sym: 'C', name: 'Carbon', z: 6, mass: 12 },
  { sym: 'N', name: 'Nitrogen', z: 7, mass: 14 },
  { sym: 'O', name: 'Oxygen', z: 8, mass: 16 },
  { sym: 'Na', name: 'Sodium', z: 11, mass: 23 },
  { sym: 'Mg', name: 'Magnesium', z: 12, mass: 24 },
  { sym: 'Cl', name: 'Chlorine', z: 17, mass: 35 },
  { sym: 'K', name: 'Potassium', z: 19, mass: 39 },
  { sym: 'Ca', name: 'Calcium', z: 20, mass: 40 },
];

function shellsFor(z: number): number[] {
  const caps = [2, 8, 8, 2]; // Bohr-Bury simplified for Z ≤ 20
  const out: number[] = [];
  let left = z;
  for (const cap of caps) {
    if (left <= 0) break;
    out.push(Math.min(left, cap));
    left -= Math.min(left, cap);
  }
  return out;
}

export function AtomWidget({ params, prompt }: { params: Record<string, number | string>; prompt?: string }) {
  const initial = ELEMENTS.find((e) => e.sym === params.element) ?? ELEMENTS[3];
  const [sym, setSym] = useState(initial.sym);
  const el = ELEMENTS.find((e) => e.sym === sym) ?? ELEMENTS[3];
  const shells = shellsFor(el.z);
  const neutrons = el.mass - el.z;
  const valence = shells[shells.length - 1];
  const cx = 150, cy = 128;

  return (
    <div>
      <svg viewBox="0 0 560 260" className="w-full">
        {/* shells */}
        {shells.map((_, i) => (
          <circle key={i} cx={cx} cy={cy} r={30 + (i + 1) * 26} fill="none" stroke={GRID} strokeWidth={2} strokeDasharray="3 3" />
        ))}
        {/* nucleus */}
        <circle cx={cx} cy={cy} r={17} fill="#f6a97c33" stroke={PEACH} strokeWidth={2} />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={9.5} fontWeight={900} fill={NAVY}>
          {el.z}p {neutrons}n
        </text>
        {/* electrons */}
        {shells.map((count, si) => {
          const r = 30 + (si + 1) * 26;
          return Array.from({ length: count }, (_, ei) => {
            const ang = (2 * Math.PI * ei) / count + si * 0.7;
            const x = cx + r * Math.cos(ang);
            const y = cy + r * Math.sin(ang);
            return (
              <g key={`${si}-${ei}`} className="chart-dot" style={{ animationDelay: `${(si * count + ei) * 70}ms` }}>
                <circle cx={x} cy={y} r={6.5} fill={BLUE} stroke="#fff" strokeWidth={1.6} />
              </g>
            );
          });
        })}
        {/* shell labels */}
        {shells.map((count, si) => (
          <text key={`l${si}`} x={cx + 30 + (si + 1) * 26 - 8} y={cy - 4} fontSize={9.5} fontWeight={900} fill="#5c6f8a">
            {['K', 'L', 'M', 'N'][si]}
          </text>
        ))}
        {/* info card */}
        <text x={300} y={54} fontSize={17} fontWeight={900} fill={NAVY}>
          {el.name} ({el.sym})
        </text>
        <text x={300} y={78} fontSize={12} fontWeight={800} fill="#5c6f8a">
          Atomic number Z = {el.z} · Mass number = {el.mass}
        </text>
        <text x={300} y={100} fontSize={12} fontWeight={800} fill="#5c6f8a">
          Configuration: {shells.join(', ')}
        </text>
        <text x={300} y={122} fontSize={12} fontWeight={900} fill="#a05c2e">
          Valence electrons = {valence} → valency {valence <= 4 ? valence : 8 - valence}
        </text>
        <text x={300} y={144} fontSize={11} fontWeight={700} fill={GREEN}>
          {valence === 1 ? 'wants to GIVE 1 electron (forms +1 ion)' : valence === 7 ? 'wants to TAKE 1 electron (forms −1 ion)' : valence <= 4 ? `tends to give/share ${valence}` : `tends to take ${8 - valence}`}
        </text>
      </svg>
      <div className="flex flex-wrap gap-1.5 px-1 pb-1">
        {ELEMENTS.map((e) => (
          <button
            key={e.sym} type="button" onClick={() => setSym(e.sym)}
            className={`rounded-lg px-2.5 py-1 text-[11.5px] font-extrabold transition ${sym === e.sym ? 'bg-[#7fb3ff] text-[#0e2a5e] shadow-sm' : 'border border-[#e8e2da] bg-white text-[#5c6f8a] hover:bg-[#f3f9ff]'}`}
          >
            {e.sym}
          </button>
        ))}
      </div>
      <p className="px-1 pb-1 text-[11.5px] font-semibold text-[#8a94a8]">{prompt ?? 'Tap an element — shells fill as 2, 8, 8, 2. Watch the valence electrons.'}</p>
    </div>
  );
}

// ---------------- angles — triangle angle sum ----------------

export function AnglesWidget({ params, prompt }: { params: Record<string, number | string>; prompt?: string }) {
  const [a, setA] = useState(typeof params.a === 'number' ? params.a : 60);
  const [b, setB] = useState(typeof params.b === 'number' ? params.b : 70);
  const c = Math.max(5, 180 - a - b);
  const W = 560, H = 280;
  const apex = { x: W / 2, y: 44 };
  const baseY = H - 46;
  const halfBase = 150;
  const spread = ((180 - a - b) / 180) * halfBase * 0.9;
  const leftX = W / 2 - Math.max(halfBase * (b / 180) + spread * 0.4, 90);
  const rightX = W / 2 + Math.max(halfBase * (a / 180) + spread * 0.4, 90);
  const type = a === c && b === c ? 'equilateral' : a === 90 || b === 90 || c === 90 ? 'right-angled' : a > 90 || b > 90 || c > 90 ? 'obtuse-angled' : 'acute-angled';
  const sides = a === b || b === c || a === c ? (a === b && b === c ? '' : ' isosceles') : ' scalene';

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <polygon points={`${leftX},${baseY} ${rightX},${baseY} ${apex.x},${apex.y}`} fill="#7fb3ff14" stroke={NAVY} strokeWidth={2.6} strokeLinejoin="round" className="chart-line" />
        <text x={(leftX + apex.x) / 2 - 16} y={(baseY + apex.y) / 2} fontSize={13} fontWeight={900} fill="#a05c2e">{b}°</text>
        <text x={(rightX + apex.x) / 2 + 8} y={(baseY + apex.y) / 2} fontSize={13} fontWeight={900} fill="#2a5298">{a}°</text>
        <text x={apex.x} y={apex.y + 20} textAnchor="middle" fontSize={13} fontWeight={900} fill={GOLD}>{c}°</text>
        <text x={W / 2} y={baseY + 26} textAnchor="middle" fontSize={14} fontWeight={900} fill={NAVY}>
          {a}° + {b}° + {c}° = 180° — always
        </text>
        <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={12} fontWeight={800} fill={GREEN}>
          a {type}{sides} triangle
        </text>
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 pb-1">
        <Slider label="angle a" value={a} min={10} max={160} step={5} onChange={setA} color={BLUE} suffix="°" />
        <Slider label="angle b" value={b} min={10} max={160} step={5} onChange={setB} color={PEACH} suffix="°" />
      </div>
      <p className="px-1 pb-1 text-[11.5px] font-semibold text-[#8a94a8]">{prompt ?? 'Move any slider — the third angle adjusts itself. The sum never leaves 180°.'}</p>
    </div>
  );
}

// ---------------- fraction — pie slices, decimals, percent ----------------

export function FractionWidget({ params, prompt }: { params: Record<string, number | string>; prompt?: string }) {
  const [d, setD] = useState(typeof params.d === 'number' ? params.d : 4);
  const [n, setN] = useState(typeof params.n === 'number' ? params.n : 3);
  const den = Math.max(2, Math.min(12, d));
  const num = Math.max(0, Math.min(den, n));
  const dec = Math.round((num / den) * 1000) / 1000;
  const pct = Math.round(dec * 1000) / 10;
  const W = 560, H = 250;
  const cx = 130, cy = H / 2 + 4, r = 82;
  const anglePer = (2 * Math.PI) / den;
  const arc = (i: number, frac: number) => {
    const a0 = -Math.PI / 2 + i * anglePer;
    const a1 = -Math.PI / 2 + (i + frac) * anglePer;
    const large = anglePer * frac > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`;
  };

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {num === 0 ? <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={GRID} strokeWidth={2} /> : null}
        {Array.from({ length: num }, (_, i) => (
          <path key={i} d={arc(i, 1)} fill="#f6a97c" stroke="#fff" strokeWidth={2} className="chart-bar" style={{ animationDelay: `${i * 60}ms`, transformOrigin: `${cx}px ${cy}px` }} />
        ))}
        {Array.from({ length: den - num }, (_, i) => (
          <path key={`e${i}`} d={arc(num + i, 1)} fill="#fff" stroke={GRID} strokeWidth={2} />
        ))}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={NAVY} strokeWidth={2.4} />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={26} fontWeight={900} fill={NAVY}>{num}/{den}</text>
        <text x={cx} y={cy + 20} textAnchor="middle" fontSize={12} fontWeight={800} fill="#5c6f8a">of the whole</text>
        {/* readout card */}
        <text x={270} y={86} fontSize={15} fontWeight={900} fill={NAVY}>
          {num}/{den} = {dec}
        </text>
        <text x={270} y={112} fontSize={15} fontWeight={900} fill="#a05c2e">
          = {pct}%
        </text>
        <text x={270} y={142} fontSize={11.5} fontWeight={800} fill="#5c6f8a">
          {num === 0 ? 'nothing shaded — that is 0' : num === den ? 'fully shaded — that is 1 whole' : `${num} of ${den} equal parts`}
        </text>
        <text x={270} y={166} fontSize={11.5} fontWeight={800} fill={GREEN}>
          {dec > 1 ? 'more than one whole!' : dec === 0.5 ? 'exactly half' : dec < 0.5 ? 'less than half' : 'more than half'}
        </text>
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 pb-1">
        <Slider label="numerator" value={num} min={0} max={den} step={1} onChange={setN} color={PEACH} />
        <Slider label="denominator" value={den} min={2} max={12} step={1} onChange={(v) => { setD(v); setN((x) => Math.min(x, v)); }} color={BLUE} />
      </div>
      <p className="px-1 pb-1 text-[11.5px] font-semibold text-[#8a94a8]">{prompt ?? 'More slices (bigger denominator) means each slice is SMALLER — try it.'}</p>
    </div>
  );
}

// ---------------- market — supply & demand equilibrium ----------------

export function MarketWidget({ params, prompt }: { params: Record<string, number | string>; prompt?: string }) {
  const [dShift, setDShift] = useState(typeof params.dShift === 'number' ? params.dShift : 0);
  const [sShift, setSShift] = useState(typeof params.sShift === 'number' ? params.sShift : 0);
  const W = 560, H = 300;
  const gx = 64, gy = 20, gw = W - 110, gh = H - 70;
  // price axis (y): 0..10 ; quantity axis (x): 0..10
  const px = (q: number) => gx + (q / 10) * gw;
  const py = (p: number) => gy + gh - (p / 10) * gh;
  // demand: p = 9 - 0.8q + dShift*0.9 ; supply: p = 1 + 0.8q + sShift*0.9
  const dP = (q: number) => Math.max(0, Math.min(10, 9 - 0.8 * q + dShift * 0.9));
  const sP = (q: number) => Math.max(0, Math.min(10, 1 + 0.8 * q + sShift * 0.9));
  // equilibrium: 9 - 0.8q + 0.9dS = 1 + 0.8q + 0.9sS → q = (8 + 0.9(dS - sS)) / 1.6
  const qEq = Math.max(0.5, Math.min(9.5, (8 + 0.9 * (dShift - sShift)) / 1.6));
  const pEq = (9 - 0.8 * qEq + dShift * 0.9 + 1 + 0.8 * qEq + sShift * 0.9) / 2;
  const line = (fn: (q: number) => number) => `${px(0)},${py(fn(0))} ${px(10)},${py(fn(10))}`;
  const dir = (n: number) => n > 0 ? 'rises ↗' : n < 0 ? 'falls ↘' : '—';

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1={gx} x2={gx + gw} y1={gy + gh} y2={gy + gh} stroke="#9fb3c8" strokeWidth={1.8} />
        <line x1={gx} x2={gx} y1={gy} y2={gy + gh} stroke="#9fb3c8" strokeWidth={1.8} />
        <text x={gx + gw / 2} y={gy + gh + 18} textAnchor="middle" fontSize={10.5} fontWeight={800} fill="#5c6f8a">Quantity →</text>
        <text x={gx - 12} y={gy + 8} textAnchor="end" fontSize={10.5} fontWeight={800} fill="#5c6f8a">₹</text>
        {[2, 4, 6, 8].map((p) => (
          <text key={p} x={gx - 8} y={py(p) + 3} textAnchor="end" fontSize={9} fontWeight={800} fill="#8a94a8">{p * 10}</text>
        ))}
        <polyline points={line(dP)} fill="none" stroke={BLUE} strokeWidth={3.2} strokeLinecap="round" className="chart-line" />
        <polyline points={line(sP)} fill="none" stroke={PEACH} strokeWidth={3.2} strokeLinecap="round" className="chart-line" />
        <text x={px(8.6)} y={py(dP(8.6)) - 8} textAnchor="end" fontSize={12} fontWeight={900} fill={BLUE}>D{dShift > 0 ? '′ (right)' : dShift < 0 ? '′ (left)' : ''}</text>
        <text x={px(8.6)} y={py(sP(8.6)) + 16} textAnchor="end" fontSize={12} fontWeight={900} fill="#a05c2e">S{sShift > 0 ? '′ (left)' : sShift < 0 ? '′ (right)' : ''}</text>
        {/* equilibrium */}
        <line x1={gx} x2={px(qEq)} y1={py(pEq)} y2={py(pEq)} stroke={GOLD} strokeWidth={1.6} strokeDasharray="5 4" />
        <line x1={px(qEq)} x2={px(qEq)} y1={gy + gh} y2={py(pEq)} stroke={GOLD} strokeWidth={1.6} strokeDasharray="5 4" />
        <circle cx={px(qEq)} cy={py(pEq)} r={7} fill={GOLD} stroke="#fff" strokeWidth={2.4} className="chart-dot" />
        <text x={px(qEq) + 10} y={py(pEq) - 10} fontSize={12} fontWeight={900} fill={NAVY}>
          E — market equilibrium
        </text>
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 pb-1">
        <Slider label="demand shifter (income)" value={dShift} min={-2} max={2} step={1} onChange={setDShift} color={BLUE} />
        <Slider label="supply shifter (cost)" value={sShift} min={-2} max={2} step={1} onChange={setSShift} color={PEACH} />
      </div>
      <Readout>{`Equilibrium: price ${dir(dShift - sShift)} → ₹${Math.round(pEq * 10) * 10}, quantity ${qEq > 5 ? 'grows' : qEq < 4.5 ? 'shrinks' : 'steady'} — people buy & sell ${Math.round(qEq)} units`}</Readout>
      <p className="px-1 pb-1 text-[11.5px] font-semibold text-[#8a94a8]">{prompt ?? 'Income up → demand shifts right → price rises. Cost up → supply shifts left → price rises again.'}</p>
    </div>
  );
}

// ---------------- pyramid — population structure by growth stage ----------------

const AGE_GROUPS = ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70+'];
const PYRAMIDS: Record<number, Array<[number, number]>> = {
  // [male %, female %] per age group, youngest first
  1: [[7.6, 7.3], [7.0, 6.8], [6.4, 6.3], [5.7, 5.7], [5.0, 5.0], [4.2, 4.3], [3.2, 3.4], [2.0, 2.3]],
  2: [[4.4, 4.2], [4.8, 4.6], [4.9, 4.8], [4.7, 4.7], [4.4, 4.4], [3.9, 4.0], [3.1, 3.3], [2.2, 2.6]],
  3: [[2.4, 2.3], [2.7, 2.6], [3.2, 3.1], [3.6, 3.5], [4.0, 4.0], [4.2, 4.3], [3.8, 4.1], [3.0, 3.6]],
};

export function PyramidWidget({ params, prompt }: { params: Record<string, number | string>; prompt?: string }) {
  const [stage, setStage] = useState(typeof params.stage === 'number' ? params.stage : 1);
  const data = PYRAMIDS[Math.max(1, Math.min(3, Math.round(stage)))] ?? PYRAMIDS[1];
  const W = 560, H = 290;
  const mid = W / 2, topY = 40, barH = (H - topY - 30) / AGE_GROUPS.length;
  const scale = 8.2; // max bar half-width percent
  const bw = (v: number) => (v / scale) * (mid - 60);
  const labels = ['Fast-growing population', 'Stable population', 'Shrinking population'];
  const desc = [
    'wide base — many children, births are high',
    'base and top narrow — births ≈ deaths',
    'narrow base — fewer children being born',
  ];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {AGE_GROUPS.map((g, i) => {
          const [m, f] = data[i];
          const y = topY + i * barH;
          return (
            <g key={g} className="msg-in" style={{ animationDelay: `${i * 55}ms` }}>
              <rect x={mid - bw(m)} y={y + 2} width={bw(m)} height={barH - 5} rx={3} fill={BLUE} opacity={0.85} style={{ transformOrigin: `${mid}px ${y + barH / 2}px` }} />
              <rect x={mid} y={y + 2} width={bw(f)} height={barH - 5} rx={3} fill={PEACH} opacity={0.9} />
              <text x={mid - bw(m) - 6} y={y + barH / 2 + 2} textAnchor="end" fontSize={9.5} fontWeight={800} fill="#2a5298">{m}%</text>
              <text x={mid + bw(f) + 6} y={y + barH / 2 + 2} fontSize={9.5} fontWeight={800} fill="#a05c2e">{f}%</text>
              <text x={mid} y={y + barH / 2 + 2} textAnchor="middle" fontSize={9} fontWeight={800} fill="#5c6f8a">{g}</text>
            </g>
          );
        })}
        <text x={mid - 60} y={H - 8} textAnchor="end" fontSize={10.5} fontWeight={900} fill="#2a5298">◀ Male</text>
        <text x={mid + 60} y={H - 8} fontSize={10.5} fontWeight={900} fill="#a05c2e">Female ▶</text>
        <text x={mid} y={26} textAnchor="middle" fontSize={13.5} fontWeight={900} fill={NAVY}>{labels[Math.max(1, Math.min(3, Math.round(stage))) - 1]}</text>
        <text x={W - 18} y={topY + 12} textAnchor="end" fontSize={10.5} fontWeight={800} fill={GREEN}>{desc[Math.max(1, Math.min(3, Math.round(stage))) - 1]}</text>
      </svg>
      <div className="flex flex-wrap gap-1.5 px-1 pb-1">
        {[
          { s: 1, label: 'Expanding (like India 1990)' },
          { s: 2, label: 'Stable (like India today)' },
          { s: 3, label: 'Declining (like Japan)' },
        ].map((o) => (
          <button
            key={o.s} type="button" onClick={() => setStage(o.s)}
            className={`rounded-lg px-3 py-1.5 text-[11.5px] font-extrabold transition ${stage === o.s ? 'bg-[#7fb3ff] text-[#0e2a5e] shadow-sm' : 'border border-[#e8e2da] bg-white text-[#5c6f8a] hover:bg-[#f3f9ff]'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="px-1 pb-1 text-[11.5px] font-semibold text-[#8a94a8]">{prompt ?? 'Switch stages — the SHAPE of the pyramid tells the story of births and deaths.'}</p>
    </div>
  );
}

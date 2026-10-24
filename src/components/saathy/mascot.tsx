'use client';

// Saathy's cloud mascot — the same Sarthi character everywhere (consistency rule).
// Poses come from the official mascot asset set. Motion is restrained per the
// mascot behaviour rules: idle float, thinking pulse, entrance pop — and fully
// static when the student prefers reduced motion or disables animations.
//
// INTERACTIVITY LAYER: when `interactive`, the mascot reacts to pokes with a
// random pose flash, a sparkle burst and a tiny speech bubble. All of it
// respects animationsEnabled and prefers-reduced-motion.

import { useCallback, useEffect, useRef, useState } from 'react';

export type MascotPose =
  | 'idle'
  | 'thinking'
  | 'happy'
  | 'excited'
  | 'cheering'
  | 'reading'
  | 'sleeping'
  | 'wink'
  | 'explaining';

const SRC: Record<MascotPose, string> = {
  idle: '/saathy/pose_idle.png',
  thinking: '/saathy/pose_thinking.png',
  happy: '/saathy/pose_happy.png',
  excited: '/saathy/pose_excited.png',
  cheering: '/saathy/pose_cheering.png',
  reading: '/saathy/pose_reading.png',
  sleeping: '/saathy/pose_sleeping.png',
  wink: '/saathy/pose_wink.png',
  explaining: '/saathy/pose_explaining.png',
};

const POKE_POSES: MascotPose[] = ['wink', 'excited', 'happy', 'cheering'];
const POKE_LINES = [
  'Hehe, that tickles! ☁️',
  'Ready when you are!',
  'One more sum? Please?',
  'Clouds love curious humans.',
  'Ask me anything maths!',
  'You are doing better than you think.',
  'Stuck? That means you are close.',
  'Numbers are my favourite weather.',
];

export interface MascotProps {
  pose?: MascotPose;
  size?: number;
  alt?: string;
  float?: boolean;
  thinking?: boolean;
  pop?: boolean;
  animationsEnabled?: boolean;
  interactive?: boolean;
  className?: string;
}

export function Mascot({
  pose = 'idle',
  size = 64,
  alt,
  float = false,
  thinking = false,
  pop = false,
  animationsEnabled = true,
  interactive = false,
  className = '',
}: MascotProps) {
  const [flashPose, setFlashPose] = useState<MascotPose | null>(null);
  const [bubble, setBubble] = useState<string | null>(null);
  const [sparkles, setSparkles] = useState<number[]>([]);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const lastPoke = useRef(0);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const motion = !animationsEnabled
    ? ''
    : thinking
      ? 'mascot-thinking'
      : pop
        ? 'mascot-pop'
        : float
          ? 'mascot-float'
          : '';

  const shownPose = flashPose ?? pose;

  const poke = useCallback(() => {
    if (!interactive) return;
    const now = Date.now();
    if (now - lastPoke.current < 450) return; // debounce double-click storms
    lastPoke.current = now;

    if (animationsEnabled) {
      const p = POKE_POSES[Math.floor(Math.random() * POKE_POSES.length)];
      setFlashPose(p);
      timers.current.push(setTimeout(() => setFlashPose(null), 1300));

      const burstId = now % 100000;
      setSparkles((prev) => [...prev, burstId]);
      timers.current.push(setTimeout(() => setSparkles((prev) => prev.filter((s) => s !== burstId)), 900));
    }

    setBubble(POKE_LINES[Math.floor(Math.random() * POKE_LINES.length)]);
    timers.current.push(setTimeout(() => setBubble(null), 2000));
  }, [interactive, animationsEnabled]);

  const showBubble = interactive && bubble;

  return (
    <span
      className={`relative inline-block shrink-0 select-none ${motion} ${interactive ? 'mascot-poke cursor-pointer' : ''} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden={alt ? undefined : true}
      role={alt ? 'img' : undefined}
      aria-label={alt}
      onClick={poke}
      onKeyDown={interactive ? (e) => (e.key === 'Enter' || e.key === ' ') && poke() : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {/* Tiny pre-optimised local PNGs — plain img avoids next/image aspect-ratio warnings. */}
      <img
        src={SRC[shownPose]}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-contain drop-shadow-[0_6px_14px_rgba(30,58,138,0.14)]"
        draggable={false}
      />

      {/* sparkle burst on poke */}
      {sparkles.map((s) =>
        animationsEnabled
          ? Array.from({ length: 6 }, (_, i) => (
              <span
                key={`${s}-${i}`}
                className="mascot-sparkle"
                style={{
                  left: '50%',
                  top: '50%',
                  background: ['#f6a97c', '#7fb3ff', '#f19937', '#ffd9c4'][i % 4],
                  ['--sx' as string]: `${Math.cos((i / 6) * 2 * Math.PI) * 34}px`,
                  ['--sy' as string]: `${Math.sin((i / 6) * 2 * Math.PI) * 34}px`,
                }}
              />
            ))
          : null
      )}

      {/* tiny speech bubble */}
      {showBubble ? (
        <span className="mascot-bubble pointer-events-none absolute -top-2 left-1/2 z-30 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl border border-[#ffd9c4] bg-white px-2.5 py-1 text-[10.5px] font-extrabold text-[#a05c2e] shadow-[0_3px_10px_rgba(30,58,138,0.12)]">
          {bubble}
        </span>
      ) : null}
    </span>
  );
}

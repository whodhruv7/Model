"use client";

import { useEffect, useRef, useState } from "react";

/* Renders trusted self-authored mini-HTML (sup/sub/strong/br only). */
export function Html({ html, className }: { html: string; className?: string }) {
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/* ---------------------------------------------------------------
   LovePopup — sweet notes for babyieee 💖
   Appears for 2 seconds, then disappears. Repeats every 30 minutes.
   (First one shows ~3s after opening the app.)
   Hidden test hook: append ?love=demo to the URL to see it every 15s.
---------------------------------------------------------------- */
const LOVE_MSGS = [
  "heyy babyieee dont worry uh can do it 💖",
  "just takeeee careee babyieee 🌸",
  "if need any help further meko dm kr dena 💬",
  "shanti se padhooo, sab ho jayegaa babyieee ✨",
  "uh got thiss babyieee, bas calm rehooo 💪",
  "stressss? not todayyy. padhai full onnn 📚",
  "chillll maro babyieee, tum kar logiiii 🌟",
  "80/80 loading… bas babyieee ke liye 🔥",
  "ek ek concept karooo, no rushhh 😌💕",
  "proud of uu babyieee, keep goinggg 💖",
];

export function LovePopup() {
  const [msg, setMsg] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const idx = useRef(0);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
    const demo =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("love") === "demo";
    const everyMs = demo ? 15_000 : 30 * 60 * 1000; // 30 minutes
    const firstMs = demo ? 1_200 : 3_000;

    const show = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setLeaving(false);
      setMsg(LOVE_MSGS[idx.current % LOVE_MSGS.length]);
      idx.current += 1;
      // hold ~1.6s, fade out 0.5s => gone after 2 seconds
      timers.current.push(setTimeout(() => setLeaving(true), 1_600));
      timers.current.push(setTimeout(() => setMsg(null), 2_100));
    };

    const first = setTimeout(show, firstMs);
    const loop = setInterval(show, everyMs);
    return () => {
      clearTimeout(first);
      clearInterval(loop);
      timers.current.forEach(clearTimeout);
    };
  }, []);

  if (!msg) return null;
  return (
    <div
      role="status"
      className={`love-pop ${leaving ? "love-out" : ""} pointer-events-none fixed left-1/2 top-5 z-[100]`}
    >
      <div className="flex items-center gap-2.5 rounded-2xl border border-rose-400/40 bg-gradient-to-r from-rose-950/95 via-rose-900/95 to-rose-950/95 px-5 py-3 shadow-2xl shadow-rose-950/50 backdrop-blur">
        <span className="animate-pulse text-lg">💖</span>
        <span className="whitespace-nowrap text-sm font-bold text-rose-100">
          {msg}
        </span>
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  className = "",
  barClass = "bg-amber-400",
}: {
  value: number;
  className?: string;
  barClass?: string;
}) {
  return (
    <div className={`h-1.5 w-full rounded-full bg-zinc-800 ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${barClass}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Chip({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}

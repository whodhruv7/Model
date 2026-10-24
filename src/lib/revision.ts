"use client";

import revisionJson from "@/data/revision.json";

/* ---------- types ---------- */

export type Formula = { f: string; meaning: string; ex: string };
export type Trick = { trick: string; when: string };
export type ImpQ = {
  n: number;
  level: string;
  concept: string;
  stem: string;
  steps: string[];
  answer: string;
  why: string[];
  hinglish: string;
  fig: string | null;
};
export type Mcq = {
  n: number;
  level: string;
  concept: string;
  stem: string;
  options: string[];
  ans: "A" | "B" | "C" | "D";
  expl: string;
  hinglish: string;
  traps: Record<string, string>;
};
export type Chapter = {
  num: number;
  name: string;
  short: string;
  star: boolean;
  title: string;
  intro: string;
  formulas: Formula[];
  checks: string[];
  tricks: Trick[];
  imps: ImpQ[];
  mcqs: Mcq[];
};
export type RevisionData = {
  plan: {
    title: string;
    body: string;
    rounds: { round: string; do: string; goal: string }[];
    golden: string;
  };
  chapters: Chapter[];
  final: {
    title: string;
    body: string;
    formulas: { f: string; ch: string; use: string }[];
    rules: string[];
    drill: string[];
    pep: string;
  };
};

export const DATA = revisionJson as unknown as RevisionData;

/* ---------- learn deck (one concept at a time) ---------- */

export type LearnCard =
  | { kind: "intro" }
  | { kind: "formula"; idx: number }
  | { kind: "check"; idx: number }
  | { kind: "trick"; idx: number };

export function learnDeck(ch: Chapter): LearnCard[] {
  const cards: LearnCard[] = [{ kind: "intro" }];
  ch.formulas.forEach((_, i) => cards.push({ kind: "formula", idx: i }));
  ch.checks.forEach((_, i) => cards.push({ kind: "check", idx: i }));
  ch.tricks.forEach((_, i) => cards.push({ kind: "trick", idx: i }));
  return cards;
}

export function learnTotal(ch: Chapter) {
  return 1 + ch.formulas.length + ch.checks.length + ch.tricks.length;
}

/* ---------- progress store (localStorage) ---------- */

export type McqResult = "C" | "W";
export type Progress = {
  learnDone: Record<string, number[]>; // ch -> card indices seen
  impDone: Record<string, number[]>; // ch -> imp indices solved
  mcq: Record<string, Record<string, McqResult>>; // ch -> mcq n -> result
  stars: Record<string, boolean>; // `L:ch:i` | `Q:ch:i` | `M:ch:n`
};

const KEY = "gm8080-progress-v1";

export function emptyProgress(): Progress {
  return { learnDone: {}, impDone: {}, mcq: {}, stars: {} };
}

export function loadProgress(): Progress {
  if (typeof window === "undefined") return emptyProgress();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyProgress();
    const p = JSON.parse(raw) as Progress;
    return {
      learnDone: p.learnDone ?? {},
      impDone: p.impDone ?? {},
      mcq: p.mcq ?? {},
      stars: p.stars ?? {},
    };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(p: Progress) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage full / blocked - ignore */
  }
}

function pct(done: number, total: number) {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export type ChapterStat = {
  learnPct: number;
  impPct: number;
  mcqCorrect: number;
  mcqTotal: number;
  mcqAccPct: number;
  overallPct: number;
};

export function chapterStat(ch: Chapter, p: Progress): ChapterStat {
  const learn = pct((p.learnDone[String(ch.num)] ?? []).length, learnTotal(ch));
  const imp = pct((p.impDone[String(ch.num)] ?? []).length, ch.imps.length);
  const m = p.mcq[String(ch.num)] ?? {};
  const correct = ch.mcqs.filter((q) => m[String(q.n)] === "C").length;
  const acc = pct(correct, ch.mcqs.length);
  const overall = Math.round(learn * 0.45 + imp * 0.3 + acc * 0.25);
  return {
    learnPct: learn,
    impPct: imp,
    mcqCorrect: correct,
    mcqTotal: ch.mcqs.length,
    mcqAccPct: acc,
    overallPct: overall,
  };
}

export function readiness(chapters: Chapter[], p: Progress) {
  if (chapters.length === 0) return 0;
  const sum = chapters.reduce(
    (s, c) => s + chapterStat(c, p).overallPct,
    0
  );
  return Math.round(sum / chapters.length);
}

/* ---------- misc ---------- */

export const LETTERS = ["A", "B", "C", "D"] as const;

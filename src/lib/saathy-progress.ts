// Saathy progress — tiny localStorage-backed streak/XP/doubts store shared by
// chat + games + quick checks. UI listens to the XP_EVENT to refresh pills.
export const XP_EVENT = "saathy-progress";

const XP_KEY = "saathy.progress.xp";
const STREAK_KEY = "saathy.progress.streak";
const DOUBTS_KEY = "saathy.progress.doubts";

export interface Doubt { q: string; tag: string; t: number }

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function num(v: unknown): number { return typeof v === "number" && Number.isFinite(v) ? v : 0; }

export function getXp(): number {
  try { return num(JSON.parse(localStorage.getItem(XP_KEY) ?? "0")); } catch { return 0; }
}

export function addXp(n: number): number {
  const total = Math.max(0, getXp() + Math.round(n));
  try { localStorage.setItem(XP_KEY, JSON.stringify(total)); } catch { /* private mode */ }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(XP_EVENT));
  return total;
}

interface Streak { count: number; last: string }

export function touchStreak(): number {
  try {
    const raw = JSON.parse(localStorage.getItem(STREAK_KEY) ?? "null") as Streak | null;
    const t = today();
    if (!raw || !raw.last) {
      const s: Streak = { count: 1, last: t };
      localStorage.setItem(STREAK_KEY, JSON.stringify(s));
      return 1;
    }
    if (raw.last === t) return raw.count;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const s: Streak = { count: raw.last === yesterday ? raw.count + 1 : 1, last: t };
    localStorage.setItem(STREAK_KEY, JSON.stringify(s));
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(XP_EVENT));
    return s.count;
  } catch {
    return 1;
  }
}

export function getStreak(): number {
  try {
    const raw = JSON.parse(localStorage.getItem(STREAK_KEY) ?? "null") as Streak | null;
    if (!raw) return 0;
    // streak only counts if practiced today or yesterday
    const t = today();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    return raw.last === t || raw.last === yesterday ? raw.count : 0;
  } catch { return 0; }
}

export function addDoubt(q: string, tag: string): void {
  const clean = q.trim().slice(0, 90);
  if (clean.length < 4) return;
  try {
    const list = getDoubts().filter(d => d.q !== clean);
    list.unshift({ q: clean, tag, t: Date.now() });
    localStorage.setItem(DOUBTS_KEY, JSON.stringify(list.slice(0, 6)));
  } catch { /* private mode */ }
}

export function getDoubts(): Doubt[] {
  try {
    const raw = JSON.parse(localStorage.getItem(DOUBTS_KEY) ?? "[]") as Doubt[];
    return Array.isArray(raw) ? raw.filter(d => d && typeof d.q === "string").slice(0, 6) : [];
  } catch { return []; }
}

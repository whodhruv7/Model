// Shared (client + server) parser for Saathy's trailing ```saathy {...}``` meta
// block, plus a live-streaming stripper so the raw JSON never flashes on screen.
import type { Artifact, ChatMeta, LevelCheckPlan, QuickCheck } from '@/lib/saathy-types';

function sanitizeQuickCheck(q: unknown): QuickCheck | null {
  if (!q || typeof q !== 'object') return null;
  const obj = q as Record<string, unknown>;
  const question = typeof obj.question === 'string' ? obj.question.trim() : '';
  const options = Array.isArray(obj.options) ? obj.options.filter((o): o is string => typeof o === 'string').slice(0, 4) : [];
  const answer = typeof obj.answer === 'number' && Number.isInteger(obj.answer) ? obj.answer : -1;
  const hint = typeof obj.hint === 'string' ? obj.hint : '';
  if (!question || options.length < 2 || answer < 0 || answer >= options.length) return null;
  return {
    concept: typeof obj.concept === 'string' ? obj.concept : '',
    question,
    options,
    answer,
    hint,
    hint2: typeof obj.hint2 === 'string' ? obj.hint2 : undefined,
    difficulty: obj.difficulty === 3 ? 3 : obj.difficulty === 1 ? 1 : 2,
  };
}

function sanitizeLevelCheck(lc: unknown): LevelCheckPlan | null {
  if (!lc || typeof lc !== 'object') return null;
  const obj = lc as Record<string, unknown>;
  const concept = typeof obj.concept === 'string' ? obj.concept.trim() : '';
  const rawQs = Array.isArray(obj.questions) ? obj.questions : [];
  const questions = rawQs
    .map((q) => {
      if (!q || typeof q !== 'object') return null;
      const o = q as Record<string, unknown>;
      const question = typeof o.question === 'string' ? o.question.trim() : '';
      const options = Array.isArray(o.options) ? o.options.filter((x): x is string => typeof x === 'string').slice(0, 4) : [];
      const answer = typeof o.answer === 'number' && Number.isInteger(o.answer) ? o.answer : -1;
      const why = typeof o.why === 'string' ? o.why.trim() : '';
      const skill = typeof o.skill === 'string' ? o.skill.trim() : 'Basics';
      if (!question || options.length < 2 || answer < 0 || answer >= options.length) return null;
      return { skill, question, options, answer, why };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 3);
  if (!concept || questions.length === 0) return null;
  return {
    concept,
    chapter: typeof obj.chapter === 'string' ? obj.chapter : undefined,
    bookRef: typeof obj.bookRef === 'string' ? obj.bookRef : undefined,
    questions,
  };
}

function sanitizeArtifact(a: unknown): Artifact | null {
  if (!a || typeof a !== 'object') return null;
  const obj = a as Record<string, unknown>;
  const title = typeof obj.title === 'string' ? obj.title.slice(0, 90) : '';
  if (!title) return null;
  if (obj.type === 'chart' && obj.chart && typeof obj.chart === 'object') {
    const c = obj.chart as Record<string, unknown>;
    const kind = c.kind === 'bar' ? 'bar' : 'line';
    const xLabel = typeof c.xLabel === 'string' ? c.xLabel : 'x';
    const yLabel = typeof c.yLabel === 'string' ? c.yLabel : 'y';
    const rawSeries = Array.isArray(c.series) ? c.series : [];
    const series = rawSeries
      .map((s) => {
        if (!s || typeof s !== 'object') return null;
        const so = s as Record<string, unknown>;
        const name = typeof so.name === 'string' ? so.name : 'series';
        const points = Array.isArray(so.points)
          ? (so.points as unknown[])
              .map((p) => {
                if (typeof p === 'number') return { x: 0, y: p };
                if (p && typeof p === 'object') {
                  const po = p as Record<string, unknown>;
                  const x = typeof po.x === 'number' ? po.x : null;
                  const y = typeof po.y === 'number' ? po.y : null;
                  const label = typeof po.label === 'string' ? po.label : undefined;
                  if (x !== null && y !== null && Number.isFinite(x) && Number.isFinite(y)) return { x, y, label };
                }
                return null;
              })
              .filter((p): p is { x: number; y: number; label?: string } => p !== null)
              .slice(0, 40)
          : [];
        return points.length >= 2 ? { name, points } : null;
      })
      .filter((s): s is { name: string; points: Array<{ x: number; y: number; label?: string }> } => s !== null)
      .slice(0, 3);
    if (series.length === 0) return null;
    const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
    return {
      type: 'chart',
      title,
      chart: {
        kind,
        xLabel,
        yLabel,
        series,
        categories: Array.isArray(c.categories) ? (c.categories as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 12) : undefined,
        xMin: num(c.xMin),
        xMax: num(c.xMax),
        yMin: num(c.yMin),
        yMax: num(c.yMax),
      },
    };
  }
  if (obj.type === 'demo' && obj.demo && typeof obj.demo === 'object') {
    const d = obj.demo as Record<string, unknown>;
    const WIDGETS = ['numberline', 'parabola', 'apline', 'dice', 'pythag', 'linegraph', 'timeline', 'motion', 'wave', 'atom', 'angles', 'fraction', 'market', 'pyramid'] as const;
    if (typeof d.widget !== 'string' || !WIDGETS.includes(d.widget as (typeof WIDGETS)[number])) return null;
    const params: Record<string, number | string> = {};
    if (d.params && typeof d.params === 'object') {
      for (const [k, v] of Object.entries(d.params as Record<string, unknown>)) {
        if (typeof v === 'number' && Number.isFinite(v)) params[k] = v;
        else if (typeof v === 'string') params[k] = v.slice(0, 12);
      }
    }
    // timeline events: array of {when, what}
    const events =
      Array.isArray(d.events)
        ? (d.events as unknown[])
            .map((e) => {
              const ev = e as Record<string, unknown>;
              return {
                when: typeof ev.when === 'string' ? ev.when.slice(0, 40) : '',
                what: typeof ev.what === 'string' ? ev.what.slice(0, 140) : '',
              };
            })
            .filter((e) => e.when && e.what)
            .slice(0, 10)
        : undefined;
    return {
      type: 'demo',
      title,
      demo: {
        widget: d.widget as (typeof WIDGETS)[number],
        params,
        events,
        prompt: typeof d.prompt === 'string' ? d.prompt.slice(0, 140) : undefined,
      },
    };
  }
  return null;
}

// ---------- structural rescue: parse each known key independently ----------
// Models sometimes misnest or truncate the meta JSON (e.g. quickcheck inside
// artifact, missing closing braces). A root-level JSON.parse then throws and
// the reply loses its interactive card on reload. Brace-matching each known
// key's value rescues the good parts regardless of nesting mistakes.
function balancedSlice(s: string, start: number): string | null {
  const open = s[start];
  if (open !== '{' && open !== '[') return null;
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  // unterminated value — close what is open and hope it sanitises
  return s.slice(start) + (open === '{' ? '}' : ']');
}

function rescueMeta(raw: string): ChatMeta | null {
  const out: ChatMeta = {};
  const tryPush = (key: keyof ChatMeta, slice: string | null) => {
    if (!slice) return;
    try {
      const v = JSON.parse(repairJson(slice));
      if (key === 'followups' || key === 'sources') out[key] = Array.isArray(v) ? (v as unknown[]).filter((f): f is string => typeof f === 'string') : [];
      else if (key === 'quickcheck') out.quickcheck = sanitizeQuickCheck(v);
      else if (key === 'levelcheck') out.levelcheck = sanitizeLevelCheck(v);
      else if (key === 'artifact') out.artifact = sanitizeArtifact(v);
    } catch {
      /* skip bad key */
    }
  };

  for (const key of ['followups', 'sources', 'artifact', 'quickcheck', 'levelcheck'] as const) {
    const m = new RegExp(`"${key}"\\s*:\\s*`).exec(raw);
    if (!m) continue;
    const start = m.index + m[0].length;
    const c = raw[start];
    if (c === '{' || c === '[') {
      tryPush(key, balancedSlice(raw, start));
    } else if (raw.startsWith('null', start)) {
      if (key === 'quickcheck') out.quickcheck = null;
      else if (key === 'levelcheck') out.levelcheck = null;
      else if (key === 'artifact') out.artifact = null;
    }
  }
  const hasSomething =
    (out.followups && out.followups.length > 0) ||
    (out.sources && out.sources.length > 0) ||
    out.quickcheck !== undefined ||
    out.levelcheck !== undefined ||
    out.artifact !== undefined;
  return hasSomething ? out : null;
}

export function parseSaathyMeta(text: string): { clean: string; meta: ChatMeta } {
  const re = /```saathy\s*([\s\S]*?)```\s*$/;
  const m = text.match(re);
  if (!m) return { clean: text.trim(), meta: {} };
  const clean = text.slice(0, m.index).trim();
  const body = repairJson(m[1].trim());
  try {
    const j = JSON.parse(body) as Record<string, unknown>;
    const meta: ChatMeta = {
      followups: Array.isArray(j.followups)
        ? (j.followups as unknown[]).filter((f): f is string => typeof f === 'string').slice(0, 3)
        : [],
      sources: Array.isArray(j.sources)
        ? (j.sources as unknown[]).filter((s): s is string => typeof s === 'string').slice(0, 4)
        : [],
      quickcheck: sanitizeQuickCheck(j.quickcheck),
      levelcheck: sanitizeLevelCheck(j.levelcheck),
      artifact: sanitizeArtifact(j.artifact),
    };
    return { clean, meta };
  } catch {
    // root JSON broken — salvage key by key so cards still render
    const rescued = rescueMeta(m[1].trim());
    return { clean, meta: rescued ?? {} };
  }
}

// Models love writing LaTeX with single backslashes inside JSON strings
// ("$1\ \mathrm{m/s^2}$") — invalid JSON escapes. Re-escape any backslash that
// is not already a valid JSON escape so the meta block parses reliably.
export function repairJson(s: string): string {
  return s.replace(/\\(?![\\/"bfnrtu])/g, '\\\\');
}

// Live display: hide a trailing (possibly still-partial) meta block while the
// model is streaming, so students never see raw JSON flicker into the bubble.
export function stripStreamingMeta(text: string): string {
  // 1) Complete meta block sitting at the end: "```saathy\n{...}\n```"
  const complete = text.match(/```saathy[\s\S]*?```[\s\n]*$/);
  if (complete && complete.index !== undefined) {
    return text.slice(0, complete.index).trimEnd();
  }
  // 2) Block opened but the closing fence has not arrived yet.
  const openIdx = text.lastIndexOf('```saathy');
  if (openIdx !== -1) return text.slice(0, openIdx).trimEnd();
  // 3) Only the bare fence characters have arrived so far.
  const fenceIdx = text.lastIndexOf('```');
  if (fenceIdx !== -1 && text.slice(fenceIdx + 3).trim() === '') {
    return text.slice(0, fenceIdx).trimEnd();
  }
  return text;
}

// POST /api/founder/autodetect — given ANY provider API key (and optionally a
// base URL), figure out the provider, the base URL and the best working model.
// The key is used transiently for probing and is NEVER stored or logged here;
// saving it remains the founder config route's explicit job.
//
// Detection by key shape:
//   gsk_…    -> Groq (OpenAI-compatible)
//   AIza…    -> Google Gemini (OpenAI-compatible endpoint)
//   sk-ant-… -> Anthropic (OpenAI-compatible layer)
//   sk-…     -> OpenAI
//   other    -> needs an explicit baseUrl (OpenAI-compatible), probes /models
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface ProviderGuess {
  name: string;
  baseUrl: string;
  candidates: string[];
}

const GUESSES: Record<string, ProviderGuess> = {
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    candidates: ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'moonshotai/kimi-k2-instruct', 'llama-3.1-8b-instant'],
  },
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    candidates: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro'],
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    candidates: ['claude-sonnet-4-5', 'claude-3-5-haiku-latest'],
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    candidates: ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4o'],
  },
};

function guessFromKey(key: string): ProviderGuess | null {
  if (key.startsWith('gsk_')) return GUESSES.groq;
  if (key.startsWith('AIza')) return GUESSES.gemini;
  if (key.startsWith('sk-ant-')) return GUESSES.anthropic;
  if (key.startsWith('sk-')) return GUESSES.openai;
  return null;
}

async function withTimeout<T>(p: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await p(ctrl.signal);
  } finally {
    clearTimeout(t);
  }
}

async function listModels(base: string, key: string): Promise<string[]> {
  try {
    return await withTimeout(async (signal) => {
      const res = await fetch(`${base.replace(/\/+$/, '')}/models`, {
        headers: { Authorization: `Bearer ${key}` },
        signal,
      });
      if (!res.ok) return [];
      const j = (await res.json()) as { data?: Array<{ id?: string }> };
      return (j.data ?? []).map((m) => m.id ?? '').filter(Boolean);
    }, 7000);
  } catch {
    return [];
  }
}

async function probeModel(base: string, key: string, model: string, timeoutMs = 9000): Promise<number | null> {
  try {
    const started = Date.now();
    const ok = await withTimeout(async (signal) => {
      const res = await fetch(`${base.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          max_tokens: 1,
          stream: false,
          messages: [{ role: 'user', content: 'ping' }],
        }),
        signal,
      });
      return res.ok;
    }, timeoutMs);
    return ok ? Date.now() - started : null;
  } catch {
    return null;
  }
}

// Preference order: known-good families first, wherever the provider lists them.
const PREFERRED = /(gpt-oss|llama-3\.3|70b|gpt-4o|gemini-2\.5|claude-sonnet|deepseek|qwen.*32b|kimi|glm)/i;
const AVOID = /(embed|whisper|tts|guard|vision-preview|realtime|audio|moderation)/i;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { apiKey?: string; baseUrl?: string; pin?: string };
  const apiKey = (body.apiKey ?? '').trim();
  const pin = (body.pin ?? '').trim();

  // Gate behind the founder PIN so a stray visitor can't use this as a key oracle.
  const settings = await db.appSettings.findUnique({ where: { id: 'main' } });
  if (!settings || !pin || pin !== settings.founderPin) {
    return Response.json({ ok: false, error: 'Incorrect PIN' }, { status: 401 });
  }
  if (!apiKey) return Response.json({ ok: false, error: 'Paste an API key first' }, { status: 400 });

  const base = (body.baseUrl ?? '').trim();
  const guess = guessFromKey(apiKey);

  const providerGuess = guess?.name ?? 'OpenAI-compatible';
  const baseUrl = base || guess?.baseUrl || '';
  if (!baseUrl) {
    return Response.json(
      { ok: false, error: 'Unrecognised key shape — paste the provider base URL too (e.g. https://api.together.xyz/v1)' },
      { status: 400 },
    );
  }

  // Build the candidate list: server's own model list (if exposed) then defaults.
  let candidates = guess?.candidates ?? [];
  const listed = await listModels(baseUrl, apiKey);
  if (listed.length > 0) {
    const good = listed.filter((m) => !AVOID.test(m));
    const sorted = [...good].sort((a, b) => Number(PREFERRED.test(b)) - Number(PREFERRED.test(a)));
    candidates = [...sorted.slice(0, 5), ...candidates.filter((c) => !sorted.includes(c))].slice(0, 6);
  } else if (base && !guess) {
    // fully custom endpoint: try common names
    candidates = ['gpt-4o-mini', 'llama-3.3-70b-versatile', 'default', ...candidates];
  }

  const tried: Array<{ model: string; ok: boolean; ms: number | null }> = [];
  let winner: { model: string; ms: number } | null = null;
  for (const model of candidates.slice(0, 6)) {
    const ms = await probeModel(baseUrl, apiKey, model);
    tried.push({ model, ok: ms !== null, ms });
    if (ms !== null) {
      winner = { model, ms };
      break;
    }
  }

  if (!winner) {
    return Response.json(
      {
        ok: false,
        error: `Reached ${providerGuess} but none of the candidate models accepted the key. Tried: ${tried.map((t) => t.model).join(', ')}`,
        tried,
        detected: { provider: providerGuess, baseUrl },
      },
      { status: 502 },
    );
  }

  return Response.json({
    ok: true,
    detected: { provider: providerGuess, baseUrl, model: winner.model, latencyMs: winner.ms },
    tried,
  });
}

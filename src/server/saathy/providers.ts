// Provider adapter — the ONLY file that talks to a model.
// Today: built-in Z.ai GLM (z-ai-web-dev-sdk). Tomorrow: any OpenAI-compatible
// endpoint the founder configures in Founder Settings. Swapping here never
// touches Saathy's identity, UI, theme, student data or knowledge config.
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamRequest {
  system: string;
  turns: ChatTurn[];
  signal?: AbortSignal;
}

export interface ProviderStatus {
  provider: 'builtin' | 'custom';
  modelId: string;
  usingCustom: boolean;
}

export async function getSettings() {
  let s = await db.appSettings.findUnique({ where: { id: 'main' } });
  if (!s) {
    s = await db.appSettings.create({ data: { id: 'main' } });
  }
  return s;
}

export async function resolveProvider(): Promise<ProviderStatus> {
  const s = await getSettings();
  const customReady =
    s.provider === 'custom' && !!s.customBaseUrl && !!s.customApiKey && !!s.customModelId && !!s.verifiedAt;
  return {
    provider: customReady ? 'custom' : 'builtin',
    modelId: customReady ? (s.customModelId as string) : s.builtinModelId,
    usingCustom: customReady,
  };
}

// ---------- SSE line parsing shared by both providers ----------

function extractDeltaFromSse(raw: string): { delta: string; done: boolean } {
  let delta = '';
  let done = false;
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('data:')) continue;
    const payload = t.slice(5).trim();
    if (payload === '[DONE]') {
      done = true;
      continue;
    }
    try {
      const j = JSON.parse(payload);
      const d = j?.choices?.[0]?.delta?.content;
      if (typeof d === 'string') delta += d;
    } catch {
      // partial JSON line — ignore; boundaries are handled because chunks
      // are joined before splitting on \n below.
    }
  }
  return { delta, done };
}

// ---------- Built-in provider (Z.ai GLM via SDK) ----------

async function* streamBuiltin(req: StreamRequest): AsyncGenerator<string> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [{ role: 'assistant', content: req.system }, ...req.turns],
    stream: true,
    thinking: { type: 'disabled' },
  } as never);

  const dec = new TextDecoder();
  let buffer = '';
  for await (const part of completion as unknown as AsyncIterable<unknown>) {
    if (req.signal?.aborted) break;
    const s = part instanceof Uint8Array ? dec.decode(part, { stream: true }) : String(part);
    buffer += s;
    const lastBreak = buffer.lastIndexOf('\n');
    if (lastBreak === -1) continue;
    const ready = buffer.slice(0, lastBreak + 1);
    buffer = buffer.slice(lastBreak + 1);
    const { delta } = extractDeltaFromSse(ready);
    if (delta) yield delta;
  }
  const { delta } = extractDeltaFromSse(buffer + dec.decode());
  if (delta) yield delta;
}

// ---------- Custom provider (OpenAI-compatible endpoint) ----------

async function* streamCustom(req: StreamRequest, status: ProviderStatus): AsyncGenerator<string> {
  const s = await getSettings();
  if (!s.customBaseUrl || !s.customApiKey) throw new Error('Custom provider is not configured');

  const base = s.customBaseUrl.replace(/\/+$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    signal: req.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${s.customApiKey}`,
    },
    body: JSON.stringify({
      model: status.modelId,
      stream: true,
      messages: [{ role: 'system', content: req.system }, ...req.turns],
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Custom provider error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buffer = '';
  for (;;) {
    if (req.signal?.aborted) break;
    const { done, value } = await reader.read();
    if (done) break;
    buffer += dec.decode(value, { stream: true });
    const lastBreak = buffer.lastIndexOf('\n');
    if (lastBreak === -1) continue;
    const ready = buffer.slice(0, lastBreak + 1);
    buffer = buffer.slice(lastBreak + 1);
    const { delta } = extractDeltaFromSse(ready);
    if (delta) yield delta;
  }
  const { delta } = extractDeltaFromSse(buffer + dec.decode());
  if (delta) yield delta;
}

// ---------- Public API ----------

export async function* streamChat(req: StreamRequest): AsyncGenerator<string> {
  const status = await resolveProvider();
  if (status.usingCustom) {
    yield* streamCustom(req, status);
  } else {
    yield* streamBuiltin(req);
  }
}

// Non-streaming single completion — used by the Founder "Test connection" button.
export async function completeOnce(system: string, user: string, timeoutMs = 20000): Promise<string> {
  const status = await resolveProvider();
  if (status.usingCustom) {
    const s = await getSettings();
    const base = (s.customBaseUrl as string).replace(/\/+$/, '');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.customApiKey}` },
        body: JSON.stringify({
          model: status.modelId,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      const text = j?.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim()) throw new Error('Empty response');
      return text;
    } finally {
      clearTimeout(timer);
    }
  }

  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: system },
      { role: 'user', content: user },
    ],
    thinking: { type: 'disabled' },
  });
  const text = completion.choices?.[0]?.message?.content ?? '';
  if (!text.trim()) throw new Error('Empty response');
  return text;
}

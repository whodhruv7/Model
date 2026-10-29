// POST /api/founder/config — save provider configuration (PIN required).
// GET  /api/founder/config?pin=XXXX — read current config with masked key.
// Rules: the full API key is NEVER returned to the client, only a masked form.
// Changing provider/key never affects Saathy's identity, mascot, theme,
// student preferences, history or knowledge-source configuration.
import { db } from '@/lib/db';
import { maskKey } from '../_util';

export const dynamic = 'force-dynamic';

async function checkPin(pin: unknown) {
  const settings = await db.appSettings.findUnique({ where: { id: 'main' } });
  if (!settings) return null;
  if (!pin || typeof pin !== 'string' || pin !== settings.founderPin) return null;
  return settings;
}

function configPayload(s: NonNullable<Awaited<ReturnType<typeof checkPin>>>) {
  return {
    provider: s.provider,
    builtinModelId: s.builtinModelId,
    customBaseUrl: s.customBaseUrl ?? '',
    customApiKeyMasked: s.customApiKey ? maskKey(s.customApiKey) : '',
    customApiKeySet: !!s.customApiKey,
    customModelId: s.customModelId ?? '',
    verifiedAt: s.verifiedAt,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const settings = await checkPin(url.searchParams.get('pin'));
  if (!settings) return Response.json({ ok: false, error: 'Incorrect PIN' }, { status: 401 });
  return Response.json({ ok: true, config: configPayload(settings) });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    pin?: string;
    newPin?: string;
    provider?: string;
    builtinModelId?: string;
    customBaseUrl?: string;
    customApiKey?: string; // empty string = keep existing; undefined = keep existing
    customModelId?: string;
  };

  const settings = await checkPin(body.pin);
  if (!settings) return Response.json({ ok: false, error: 'Incorrect PIN' }, { status: 401 });

  const data: Record<string, string | null | Date> = {};

  if (body.provider === 'builtin' || body.provider === 'custom') data.provider = body.provider;
  if (typeof body.builtinModelId === 'string' && body.builtinModelId.trim()) {
    data.builtinModelId = body.builtinModelId.trim().slice(0, 60);
  }
  if (typeof body.customBaseUrl === 'string') data.customBaseUrl = body.customBaseUrl.trim().slice(0, 200) || null;
  if (typeof body.customModelId === 'string') data.customModelId = body.customModelId.trim().slice(0, 60) || null;
  if (typeof body.customApiKey === 'string' && body.customApiKey.trim()) {
    data.customApiKey = body.customApiKey.trim(); // stored server-side only
  }

  // Saving custom provider config invalidates verification until a test passes.
  if (body.provider === 'custom' || typeof body.customBaseUrl === 'string' || (typeof body.customApiKey === 'string' && body.customApiKey.trim())) {
    data.verifiedAt = null;
  }

  if (typeof body.newPin === 'string' && /^\d{4}$/.test(body.newPin)) {
    data.founderPin = body.newPin;
  }

  const updated = await db.appSettings.update({ where: { id: 'main' }, data });
  return Response.json({ ok: true, config: configPayload(updated) });
}

export async function DELETE(req: Request) {
  // Remove the stored custom API key (founder action: "Delete key").
  const url = new URL(req.url);
  const settings = await checkPin(url.searchParams.get('pin'));
  if (!settings) return Response.json({ ok: false, error: 'Incorrect PIN' }, { status: 401 });
  const updated = await db.appSettings.update({
    where: { id: 'main' },
    data: { customApiKey: null, verifiedAt: null },
  });
  return Response.json({ ok: true, config: configPayload(updated) });
}

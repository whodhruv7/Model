// POST /api/founder/unlock — PIN gate for Founder Settings.
// Prototype note: this is a client-side convenience gate, NOT real authentication.
// In the VidhyaSaathy product this endpoint sits behind server-side RBAC (VS-07).
import { getSettings } from '@/server/saathy/providers';
import { maskKey } from '../_util';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { pin?: string };
  const settings = await getSettings();
  if (!body.pin || body.pin !== settings.founderPin) {
    return Response.json({ ok: false, error: 'Incorrect PIN' }, { status: 401 });
  }
  return Response.json({
    ok: true,
    config: {
      provider: settings.provider,
      builtinModelId: settings.builtinModelId,
      customBaseUrl: settings.customBaseUrl ?? '',
      customApiKeyMasked: settings.customApiKey ? maskKey(settings.customApiKey) : '',
      customApiKeySet: !!settings.customApiKey,
      customModelId: settings.customModelId ?? '',
      verifiedAt: settings.verifiedAt,
    },
  });
}

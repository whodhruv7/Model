// PUT /api/profile — update chat preferences + student profile + focus context.
// Every field actually changes the engine's behaviour (tone/style/length/language/
// socratic are injected into the system prompt; focus drives personalisation).
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const TONES = ['friendly', 'balanced', 'formal'];
const STYLES = ['simple', 'steps', 'detailed'];
const LENGTHS = ['concise', 'balanced', 'thorough'];
const LANGS = ['english', 'hinglish', 'hindi'];

export async function PUT(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, string | boolean | null> = {};

  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim().slice(0, 40);
  if (typeof body.className === 'string' && body.className.trim()) data.className = body.className.trim().slice(0, 20);
  if (typeof body.section === 'string' && body.section.trim()) data.section = body.section.trim().slice(0, 6);
  if (typeof body.board === 'string' && body.board.trim()) data.board = body.board.trim().slice(0, 20);
  if (typeof body.schoolName === 'string' && body.schoolName.trim()) data.schoolName = body.schoolName.trim().slice(0, 60);

  if (typeof body.tone === 'string' && TONES.includes(body.tone)) data.tone = body.tone;
  if (typeof body.style === 'string' && STYLES.includes(body.style)) data.style = body.style;
  if (typeof body.length === 'string' && LENGTHS.includes(body.length)) data.length = body.length;
  if (typeof body.language === 'string' && LANGS.includes(body.language)) data.language = body.language;

  if (typeof body.socratic === 'boolean') data.socratic = body.socratic;
  if (typeof body.animations === 'boolean') data.animations = body.animations;
  if (typeof body.sounds === 'boolean') data.sounds = body.sounds;

  if ('focusSubjectId' in body) data.focusSubjectId = typeof body.focusSubjectId === 'string' ? body.focusSubjectId : null;
  if ('focusChapterId' in body) data.focusChapterId = typeof body.focusChapterId === 'string' ? body.focusChapterId : null;
  if ('focusConceptId' in body) data.focusConceptId = typeof body.focusConceptId === 'string' ? body.focusConceptId : null;

  const profile = await db.studentProfile.update({ where: { id: 'main' }, data });
  return Response.json({ profile });
}

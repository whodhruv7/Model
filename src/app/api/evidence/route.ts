// POST /api/evidence — record a learning action (AI-08 evidence) and update the
// internal mastery estimate. The VidhyaSaathy app will post quiz/practice events
// to this same contract. Returns the friendly (never numeric) student-facing state.
import { db } from '@/lib/db';
import { masteryUpdate, tierFor, TIERS, type MasterySnapshot } from '@/lib/saathy-types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    conceptId?: string;
    conceptName?: string;
    correct?: boolean;
    difficulty?: number;
    source?: string;
    // Level Check batch: the 2-3 cute-cards diagnostic that SETS the starting band.
    levelcheck?: { results: Array<{ correct: boolean }>; total: number };
  };

  const concept = body.conceptId
    ? await db.concept.findUnique({ where: { id: body.conceptId } })
    : body.conceptName
      ? await db.concept.findFirst({ where: { name: body.conceptName } })
      : null;

  if (!concept) return Response.json({ error: 'Concept not found' }, { status: 404 });

  // ---------- Level Check batch mode ----------
  if (body.levelcheck && Array.isArray(body.levelcheck.results) && body.levelcheck.results.length > 0) {
    const results = body.levelcheck.results.slice(0, 3);
    const total = Math.max(results.length, 1);
    const correctCount = results.filter((r) => r.correct).length;

    await db.evidenceRecord.createMany({
      data: results.map((r, i) => ({
        conceptId: concept.id,
        correct: !!r.correct,
        difficulty: 1, // basics probes
        source: 'levelcheck',
        // small stagger so the rows keep their card order
        createdAt: new Date(Date.now() + i * 10),
      })),
    });

    const existing = await db.masteryState.findUnique({ where: { conceptId: concept.id } });
    const prev = existing?.score ?? 0.5;
    // 75% weight to what they just showed, 25% to whatever we knew before.
    // With a 3-card check: 0/3 -> ~0.13 (band 0), 1/3 -> ~0.38 (band 1),
    // 2/3 -> ~0.63 (band 2), 3/3 -> ~0.88 (band 3).
    const newScore = Math.min(1, Math.max(0, Math.round((0.75 * (correctCount / total) + 0.25 * prev) * 100) / 100));

    await db.masteryState.upsert({
      where: { conceptId: concept.id },
      create: { conceptId: concept.id, score: newScore, attempts: total, correct: correctCount },
      update: {
        score: newScore,
        attempts: (existing?.attempts ?? 0) + total,
        correct: (existing?.correct ?? 0) + correctCount,
      },
    });

    const tier = tierFor(newScore);
    const snapshot: MasterySnapshot = {
      conceptId: concept.id,
      concept: concept.name,
      score: newScore,
      tier,
      label: TIERS[tier].label,
    };
    return Response.json({ snapshot });
  }

  if (typeof body.correct !== 'boolean') {
    return Response.json({ error: 'correct (boolean) is required' }, { status: 400 });
  }

  const difficulty = body.difficulty === 1 || body.difficulty === 3 ? body.difficulty : 2;
  const source = typeof body.source === 'string' ? body.source.slice(0, 20) : 'quickcheck';

  await db.evidenceRecord.create({
    data: { conceptId: concept.id, correct: body.correct, difficulty, source },
  });

  const existing = await db.masteryState.findUnique({ where: { conceptId: concept.id } });
  const prevScore = existing?.score ?? 0.5;
  const newScore = masteryUpdate(prevScore, body.correct, difficulty);

  await db.masteryState.upsert({
    where: { conceptId: concept.id },
    create: { conceptId: concept.id, score: newScore, attempts: 1, correct: body.correct ? 1 : 0 },
    update: {
      score: newScore,
      attempts: (existing?.attempts ?? 0) + 1,
      correct: (existing?.correct ?? 0) + (body.correct ? 1 : 0),
    },
  });

  const tier = tierFor(newScore);
  const snapshot: MasterySnapshot = {
    conceptId: concept.id,
    concept: concept.name,
    score: newScore,
    tier,
    label: TIERS[tier].label,
  };
  return Response.json({ snapshot });
}

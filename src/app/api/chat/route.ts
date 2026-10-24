// POST /api/chat — Saathy's main streaming endpoint.
// Contract (the future VidhyaSaathy app calls the same shape):
//   body: { conversationId?, content, mode?, focusConceptId? }
//   SSE stream of JSON lines: {type:'meta'|'delta'|'done'|'error', ...}
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { detectMode, type ChatMode } from '@/lib/saathy-types';
import { loadProfile, loadSubjects, matchConcepts, loadNotes, loadRecentMessages } from '@/server/saathy/context';
import { searchBook, bookGroundingBlock } from '@/server/saathy/books';
import { buildSystemPrompt, buildHintPrompt, buildWhyPrompt } from '@/server/saathy/prompt';
import { streamChat, completeOnce } from '@/server/saathy/providers';
import { parseSaathyMeta, repairJson } from '@/lib/saathy-meta';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Rescue: when the model streams a teaching reply but forgets the trailing
// meta block, one fast non-streaming call regenerates ONLY the JSON so the
// interactive layer (chips, sources, artifact, quick check) still arrives.
const RESCUE_SYSTEM = `You generate ONLY a JSON object (no markdown fence, no commentary) that packages a Saathy reply. Shape — every key required:
{"followups":["<chip>","<chip>","<chip>"],"sources":["<ref>"],"artifact":<obj-or-null>,"quickcheck":<obj-or-null>}
Rules:
- followups: exactly 3 short chips in the student's voice (<=6 words each), matching the reply's topic.
- sources: exact section refs used like "Ganita Manjari G9 · Ch 4 · §4.2 Visualising Identities", else [].
- artifact: null unless the reply teaches a visual idea. Chart: {"type":"chart","title":"...","chart":{"kind":"line|bar","xLabel":"...","yLabel":"...","series":[{"name":"...","points":[{"x":1,"y":2}]}]}}. Demo widget (pick matching one): {"type":"demo","title":"...","demo":{"widget":"parabola|numberline|apline|dice|pythag|linegraph","params":{},"prompt":"one playful instruction"}}.
- quickcheck: one board-style MCQ testing THIS reply's core idea: {"concept":"...","question":"...","options":["A","B","C","D"],"answer":0,"hint":"nudge, not the answer","hint2":"stronger nudge","difficulty":1}. difficulty 1-3 matching how hard the reply was.
- Output must be valid JSON: double quotes only, no trailing commas, LaTeX backslashes escaped (\\\\frac etc.).`;

async function rescueMetaOnce(cleanText: string, timeoutMs = 20000): Promise<Record<string, unknown> | null> {
  try {
    const raw = await completeOnce(RESCUE_SYSTEM, cleanText.slice(0, 4000), timeoutMs);
    const stripped = raw.replace(/```(?:json|saathy)?/g, '').trim();
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(repairJson(stripped.slice(start, end + 1))) as Record<string, unknown>;
    } catch {
      const wrapped = parseSaathyMeta('```saathy\n' + stripped.slice(start, end + 1) + '\n```');
      return Object.keys(wrapped.meta).length > 0 ? (wrapped.meta as Record<string, unknown>) : null;
    }
  } catch {
    return null;
  }
}

function hasAnyMeta(m: Record<string, unknown> | undefined): boolean {
  if (!m) return false;
  return (
    (Array.isArray(m.followups) && m.followups.length > 0) ||
    (Array.isArray(m.sources) && m.sources.length > 0) ||
    !!m.quickcheck ||
    !!m.levelcheck ||
    !!m.artifact
  );
}

function sse(controller: ReadableStreamDefaultController, enc: TextEncoder, obj: unknown) {
  controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
}

export async function POST(req: NextRequest) {
  let body: {
    conversationId?: string;
    content?: string;
    mode?: ChatMode;
    focusConceptId?: string | null;
    hintLevel?: 1 | 2 | null; // hint ladder request for pending quickcheck
    whyRequest?: boolean; // "why was I wrong?" request
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const content = (body.content ?? '').trim();
  if (!content) return Response.json({ error: 'Message is required' }, { status: 400 });

  // Explicit modes (chips, practice flows) win; natural typing is auto-routed.
  const mode: ChatMode = body.mode && body.mode !== 'chat' ? body.mode : detectMode(content);

  try {
    const profile = await loadProfile();
    const subjects = await loadSubjects();

    // Focus concept: explicit param wins, else profile's persisted focus
    const focusConceptId = body.focusConceptId ?? profile.focusConceptId ?? null;
    const focusConcept = focusConceptId
      ? (await db.concept.findUnique({ where: { id: focusConceptId }, include: { mastery: true, chapter: true } }))
      : null;

    // Conversation handling
    let conversationId = body.conversationId;
    let isNew = false;
    if (conversationId) {
      const conv = await db.conversation.findUnique({ where: { id: conversationId } });
      if (!conv) return Response.json({ error: 'Conversation not found' }, { status: 404 });
    } else {
      const conv = await db.conversation.create({
        data: { title: content.slice(0, 60) + (content.length > 60 ? '…' : '') },
      });
      conversationId = conv.id;
      isNew = true;
    }

    const userMessage = await db.message.create({
      data: { conversationId, role: 'user', content },
    });

    // Context assembly (AI-02)
    const haystack = `${content} ${focusConcept?.name ?? ''}`;
    let hits = matchConcepts(haystack, subjects);
    if (focusConcept) {
      const already = hits.some((h) => h.conceptId === focusConcept.id);
      if (!already) {
        hits = [
          {
            conceptId: focusConcept.id,
            conceptName: focusConcept.name,
            tier: focusConcept.mastery ? (focusConcept.mastery.score < 0.25 ? 0 : focusConcept.mastery.score < 0.5 ? 1 : focusConcept.mastery.score < 0.75 ? 2 : 3) : null,
            score: focusConcept.mastery?.score ?? null,
            chapterName: focusConcept.chapter.name,
            subjectName: '',
          },
          ...hits,
        ];
      }
    }
    const noteIds = Array.from(new Set([focusConcept?.id, ...hits.map((h) => h.conceptId)].filter((x): x is string => !!x)));
    const notes = await loadNotes(noteIds);
    const history = await loadRecentMessages(conversationId);

    // Book grounding (Ganita Manjari) — the school's own textbook corpus.
    const bookQuery = `${content} ${focusConcept?.name ?? hits[0]?.conceptName ?? ''}`;
    const bookChunks = mode === 'chat' && !focusConcept ? [] : searchBook(bookQuery, { limit: 4 });
    const book = bookGroundingBlock(bookChunks);

    // System prompt
    let system: string;
    if (body.hintLevel) {
      system = buildHintPrompt(body.hintLevel, profile.language);
    } else if (body.whyRequest) {
      system = buildWhyPrompt(profile.language);
    } else {
      system = buildSystemPrompt({
        profile,
        subjects,
        hits,
        notes,
        mode,
        focusConceptName: focusConcept?.name ?? hits[0]?.conceptName ?? null,
        book,
      });
    }

    const convId = conversationId;
    const enc = new TextEncoder();
    const abort = new AbortController();

    const stream = new ReadableStream({
      async start(controller) {
        let full = '';
        try {
          sse(controller, enc, {
            type: 'meta',
            conversationId: convId,
            isNew,
            userMessageId: userMessage.id,
            mode,
          });

          req.signal.addEventListener('abort', () => abort.abort());
          for await (const delta of streamChat({ system, turns: history, signal: abort.signal })) {
            full += delta;
            sse(controller, enc, { type: 'delta', text: delta });
          }

          // Persist the assistant reply (meta block stripped) — same parse for
          // every turn so the stored text is always what the student saw.
          const { clean, meta } = parseSaathyMeta(full);
          let finalMeta = meta as typeof meta & Record<string, unknown>;

          // Meta rescue: teaching replies must always carry their interactive
          // layer. If the model forgot the block entirely, regenerate just the JSON.
          const needsMeta =
            !hasAnyMeta(finalMeta as unknown as Record<string, unknown>) &&
            (mode === 'explain' || mode === 'practise' || mode === 'solve') &&
            clean.length > 200;
          if (needsMeta) {
            const rescued = await rescueMetaOnce(clean);
            if (rescued) finalMeta = rescued as typeof finalMeta;
          }

          const saved = await db.message.create({
            data: {
              conversationId: convId,
              role: 'assistant',
              content: clean || full.trim(),
              meta: JSON.stringify({ mode, ...finalMeta, focusConcept: focusConcept?.name ?? null }),
            },
          });
          await db.conversation.update({ where: { id: convId }, data: { updatedAt: new Date() } });

          sse(controller, enc, { type: 'done', assistantMessageId: saved.id, meta: finalMeta });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          sse(controller, enc, { type: 'error', message: msg });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('[/api/chat] failed:', err instanceof Error ? err.message : err);
    return Response.json({ error: 'Saathy could not process this request' }, { status: 500 });
  }
}

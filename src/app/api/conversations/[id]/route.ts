// GET    /api/conversations/[id] — full message history
// PATCH  /api/conversations/[id] — rename
// DELETE /api/conversations/[id] — delete (cascades messages)
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conv = await db.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!conv) return Response.json({ error: 'Conversation not found' }, { status: 404 });
  return Response.json({
    conversation: {
      id: conv.id,
      title: conv.title,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messages: conv.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        meta: m.meta ? JSON.parse(m.meta) : null,
        createdAt: m.createdAt,
      })),
    },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { title?: string };
  const title = (body.title ?? '').trim();
  if (!title) return Response.json({ error: 'Title is required' }, { status: 400 });
  const conv = await db.conversation.update({ where: { id }, data: { title: title.slice(0, 80) } });
  return Response.json({ conversation: { id: conv.id, title: conv.title } });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.conversation.delete({ where: { id } });
  return Response.json({ ok: true });
}

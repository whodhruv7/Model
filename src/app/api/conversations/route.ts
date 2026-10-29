// GET /api/conversations — list chat history
// POST /api/conversations — create an empty conversation
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const conversations = await db.conversation.findMany({
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, createdAt: true, updatedAt: true, _count: { select: { messages: true } } },
  });
  return Response.json({
    conversations: conversations.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c._count.messages,
    })),
  });
}

export async function POST() {
  const conv = await db.conversation.create({ data: { title: 'New chat' } });
  return Response.json({ conversation: { id: conv.id, title: conv.title, createdAt: conv.createdAt, updatedAt: conv.updatedAt, messageCount: 0 } });
}

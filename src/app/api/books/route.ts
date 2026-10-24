// GET /api/books — the textbook corpus tree (Ganita Manjari, 14 chapters).
// The future VidhyaSaathy app can call this to render its own book browser or
// to sync chapters/concepts. Retrieval stays server-side (searchBook).
import { bookTree } from '@/server/saathy/books';

export const dynamic = 'force-static';

export async function GET() {
  const chapters = bookTree();
  return Response.json({
    book: {
      name: 'Ganita Manjari',
      grades: [9, 10],
      chapters: chapters.length,
      source: 'School textbook — indexed locally',
    },
    chapters,
  });
}

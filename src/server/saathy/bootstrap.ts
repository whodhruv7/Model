// Bootstrap — self-healing DB seeding. If the subjects tree is empty (fresh DB
// after a sandbox reset), rebuild it from the KB JSON corpus so the app is
// never blank. Idempotent: only runs when the tree is empty.
import { db } from '@/lib/db';
import mathsKb from '@/data/books/ganita-manjari.json';
import sstKb from '@/data/books/understanding-society.json';
import sciKb from '@/data/books/science-exploration.json';

interface KbSection {
  id: string;
  title: string;
  content: string;
}

interface KbChapter {
  grade: number;
  number: number;
  title: string;
  intro: string;
  sections: KbSection[];
  book?: string;
  part?: number;
}

const CHAPTER_SPACE_OFFSET = { maths: 0, sst: 100, science: 200 };

// Concept names are derived from section titles — deduped per chapter.
function conceptsForChapter(ch: KbChapter): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of ch.sections) {
    const t = s.title.replace(/^Part\s*\d+\s*[-–:]?\s*/i, '').trim();
    if (t && t.length > 2 && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase());
      out.push(t);
    }
  }
  return out.slice(0, 8);
}

export async function ensureSubjects(): Promise<{ created: boolean; subjects: number }> {
  const existing = await db.subject.count();
  if (existing > 0) return { created: false, subjects: existing };

  const sources: Array<{ kb: KbChapter[]; name: string; offset: number }> = [
    { kb: mathsKb as KbChapter[], name: 'Ganita Manjari', offset: CHAPTER_SPACE_OFFSET.maths },
    { kb: sstKb as KbChapter[], name: 'Understanding Society', offset: CHAPTER_SPACE_OFFSET.sst },
    { kb: sciKb as KbChapter[], name: 'Science — Exploration (Grade 9)', offset: CHAPTER_SPACE_OFFSET.science },
  ];

  let order = 1;
  for (const src of sources) {
    const subject = await db.subject.create({ data: { name: src.name, order: order++ } });
    for (const ch of src.kb) {
      const chapter = await db.chapter.create({
        data: {
          subjectId: subject.id,
          number: ch.number + src.offset,
          name: ch.title,
          order: ch.number,
        },
      });
      let cOrder = 1;
      let prevId: string | null = null;
      for (const name of conceptsForChapter(ch)) {
        const concept = await db.concept.create({
          data: {
            chapterId: chapter.id,
            name,
            order: cOrder++,
            prerequisites: prevId ? JSON.stringify([prevId]) : '[]',
          },
        });
        prevId = concept.id;
      }
    }
  }

  const total = await db.subject.count();
  return { created: true, subjects: total };
}

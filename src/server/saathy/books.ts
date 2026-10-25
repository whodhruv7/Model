// Book knowledge layer — the school's actual textbooks:
//   Ganita Manjari (mathematics, 14 chapters) + Understanding Society: India and
//   Beyond (social science, 9 chapters). Built by scripts/kb/build_kb*.py.
// In the future VidhyaSaathy app this module stays as-is: same JSON shape,
// same retrieval contract — only the corpus files grow.
import mathsKb from '@/data/books/ganita-manjari.json';
import sstKb from '@/data/books/understanding-society.json';
import type { ConceptHit } from './context';

export interface BookSection {
  chapterNumber: number;
  grade: number;
  chapterTitle: string;
  sectionId: string;
  title: string;
  content: string;
  book: string;
  part?: number;
}

export interface BookChunk {
  sourceRef: string;
  text: string;
}

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

interface KbChapterMeta extends KbChapter {
  book: string;
}

const KB: KbChapterMeta[] = [
  ...(mathsKb as KbChapter[]).map((c) => ({ ...c, book: c.book ?? 'Ganita Manjari' })),
  ...(sstKb as KbChapter[]).map((c) => ({ ...c, book: c.book ?? 'Understanding Society' })),
];

const STOP = new Set([
  'the', 'a', 'an', 'of', 'is', 'are', 'what', 'how', 'why', 'do', 'does', 'in', 'on', 'for',
  'to', 'and', 'or', 'me', 'my', 'i', 'explain', 'about', 'tell', 'can', 'you', 'please',
  'give', 'teach', 'learn', 'understand', 'difference', 'between', 'with', 'solve', 'sum',
  'question', 'doubt', 'meaning', 'define', 'hindi', 'hinglish', 'samjha', 'samjhao', 'kya',
]);

export function tokenize(s: string): string[] {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // fold IAST diacritics: Śhivājī -> Shivaji
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

function allSections(): BookSection[] {
  const out: BookSection[] = [];
  for (const ch of KB) {
    for (const sec of ch.sections) {
      out.push({
        chapterNumber: ch.number,
        grade: ch.grade,
        chapterTitle: ch.title,
        sectionId: sec.id,
        title: sec.title,
        content: sec.content,
        book: ch.book,
        part: ch.part,
      });
    }
  }
  return out;
}

const SECTIONS = allSections();
let INDEX: Array<{ sec: BookSection; tf: Map<string, number> }> | null = null;

function buildIndex() {
  if (INDEX) return INDEX;
  INDEX = SECTIONS.map((sec) => {
    const tf = new Map<string, number>();
    const titleTokens = tokenize(`${sec.chapterTitle} ${sec.title}`);
    for (const t of [...titleTokens, ...titleTokens, ...tokenize(sec.content)]) {
      tf.set(t, (tf.get(t) ?? 0) + 1);
    }
    return { sec, tf };
  });
  return INDEX;
}

// Chapter names a student might type, mapped to book chapter numbers.
// Maths chapters are 1-14; Understanding Society chapters are 101-109.
const CHAPTER_HINTS: Array<[RegExp, number]> = [
  // --- Understanding Society (SST) — checked first, more specific phrasing ---
  [/personal finance|budget|fixed deposit|mutual fund|insurance|income tax|tax slab|compounding|emi|pillar of|invest(ing|ment) option/i, 108],
  [/entrepreneur|startup|business plan|functional area|business venture|lijjat|profit and loss|marketing and sales|human resources/i, 109],
  [/governance|public policy|policy cycle|e-governance|stakeholder|good governance|policy process|civic/i, 107],
  [/rajput|mughal|chola|sultanate|vijayanagara|maratha|shivaji|bhakti|sikh|khalsa|ahom|pratap|haldighati|swarajya|medieval india|resilience/i, 106],
  [/biome|ecosystem|biodiversity|tundra|taiga|grassland|rainforest|ecotourism|sacred grove|forest dwellers|ecological commons|life on earth/i, 105],
  [/ocean|\btides?\b|\bwaves?\b|tsunami|cyclone|maritime|eez|unclos|blue economy|marine resource|sea/i, 104],
  [/demand curve|supply curve|demand schedule|supply schedule|market equilibrium|law of demand|law of supply|price puzzle|equilibrium price/i, 103],
  [/opportunity cost|scarcity|factors of production|economic system|planned economy|market economy|economic survey|problem of choice|central problems/i, 102],
  [/atmosphere|\bclimate\b|weather|monsoon|insolation|greenhouse|ozone layer|jet stream|stratosphere|troposphere/i, 101],
  // --- Ganita Manjari (mathematics) ---
  [/cartesian|coordinate|coordinates|plot|abscissa|ordinate|quadrant/i, 1],
  [/linear polynomial|linear growth|linear decay|linear relationship/i, 2],
  [/irrational|rational number|integer|real number|surds?|shuny|shoonya|zero/i, 3],
  [/identit|factoris|factoriz|algebra tile|rational expression|\(a\s*\+\s*b\)/i, 4],
  [/circle|chord|arc|concyclic|subtend/i, 5],
  [/perimeter|area|circumference|heron|triangle.*area|area.*circle/i, 6],
  [/probabilit|sample space|tree diagram|dice|coin|random/i, 7],
  [/sequence|progression|\bap\b|\bgp\b|arithmetic|geometric|fibonacci|virahanka|pattern/i, 8],
  [/proposition|converse|number pattern|perfect square/i, 9],
  [/\bdata\b|mean|median|mode|combine quantities/i, 10],
  [/algorithm|\bgcd\b|greatest common|divisor|data structure/i, 11],
  [/quadrilateral|parallelogram|tiling|rhombus|trapezium/i, 12],
  [/two variables|linear equation|slope|intercept|pair of (linear|equations)|simultaneous/i, 13],
  [/surface area|volume|cuboid|cube|cylinder|cone|sphere|hemisphere|pyramid/i, 14],
];

export function searchBook(query: string, opts?: { limit?: number; chapterNumber?: number }): BookChunk[] {
  const limit = opts?.limit ?? 4;
  const idx = buildIndex();
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  // Which chapter does the query point at?
  let hintChapter: number | null = opts?.chapterNumber ?? null;
  if (hintChapter === null) {
    for (const [re, n] of CHAPTER_HINTS) {
      if (re.test(query)) {
        hintChapter = n;
        break;
      }
    }
  }

  const scored = idx.map(({ sec, tf }) => {
    let score = 0;
    for (const t of terms) {
      const f = tf.get(t);
      if (f) score += Math.min(f, 6);
      // partial match for morphological variants ("triangle" ~ "triangles")
      if (!f) {
        for (const [k, v] of tf) {
          if (k.length > 4 && (k.startsWith(t) || t.startsWith(k))) {
            score += Math.min(v, 2) * 0.5;
            break;
          }
        }
      }
    }
    // the hinted chapter gets a strong boost, neighbours a small one
    if (hintChapter !== null) {
      const sameBook = sec.book === (hintChapter >= 100 ? "Understanding Society" : "Ganita Manjari");
      const d = Math.abs(sec.chapterNumber - hintChapter);
      if (d === 0) score *= 3.2;
      else if (d === 1 && sameBook) score *= 1.15;
      else if (sameBook && sec.chapterNumber >= 100 === hintChapter >= 100) score *= 0.55;
      else score *= 0.3;
    }
    return { sec, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const picked: BookChunk[] = [];
  const seenChapters = new Map<number, number>();
  for (const { sec, score } of scored) {
    if (score < 2.5) break;
    const n = seenChapters.get(sec.chapterNumber) ?? 0;
    if (n >= 2) continue; // max 2 sections per chapter — diversity
    seenChapters.set(sec.chapterNumber, n + 1);
    picked.push({
      sourceRef: `${sec.book} G${sec.grade}${sec.part ? ` P${sec.part}` : ''} · Ch ${sec.chapterNumber >= 100 ? sec.chapterNumber - 100 : sec.chapterNumber} · ${sec.title}`,
      text: sec.content,
    });
    if (picked.length >= limit) break;
  }
  return picked;
}

// Chapter-anchored lookup used by the Level Check (basics of a concept).
export function bookForConcept(conceptName: string, chapterName?: string): BookChunk[] {
  const query = `${conceptName} ${chapterName ?? ''}`;
  const direct = searchBook(query, { limit: 3 });
  if (direct.length > 0) return direct;
  // fall back: match chapter by name
  for (const ch of KB) {
    if (chapterName && ch.title.toLowerCase().includes(chapterName.toLowerCase().slice(0, 12))) {
      return ch.sections.slice(0, 3).map((s) => ({
        sourceRef: `${ch.book} G${ch.grade}${ch.part ? ` P${ch.part}` : ''} · Ch ${ch.number >= 100 ? ch.number - 100 : ch.number} · ${s.title}`,
        text: s.content,
      }));
    }
  }
  return [];
}

export function bookGroundingBlock(chunks: BookChunk[]): { text: string; sources: string[] } {
  if (chunks.length === 0) return { text: '', sources: [] };
  const sources = chunks.map((c) => c.sourceRef);
  const text = `TEXTBOOK GROUNDING (the school's own textbooks — Ganita Manjari for mathematics, Understanding Society: India and Beyond for social science).
Rules: teach FROM this material, use its notation, its examples and its spirit. When you use it, cite naturally like "(Understanding Society, Ch 5)" or "(Ganita Manjari, Ch 3)" at the natural spot, and list the exact section refs in the meta block's "sources". If the excerpts below do not cover what the student asked, teach it well from your own knowledge and honestly mark that part as beyond the book.

${chunks
    .map((c) => `--- [${c.sourceRef}]\n${c.text}`)
    .join('\n\n')}`;
  return { text, sources };
}

// Summary of which book chapters a concept belongs to — used in prompts.
export function bookChaptersForHits(hits: ConceptHit[]): string {
  const lines: string[] = [];
  for (const h of hits.slice(0, 3)) {
    const matches = KB.filter(
      (ch) => ch.title.toLowerCase().includes(h.chapterName.toLowerCase().slice(0, 10)) || h.chapterName.length < 4
    );
    if (matches.length > 0) {
      for (const m of matches.slice(0, 1)) {
        lines.push(`- "${h.conceptName}" lives in ${m.book} Ch ${m.number >= 100 ? m.number - 100 : m.number} (${m.title}) — sections: ${m.sections.map((s) => s.id).join(', ')}`);
      }
    }
  }
  return lines.join('\n');
}

export function bookTree() {
  return KB.map((ch) => ({
    grade: ch.grade,
    part: ch.part ?? 1,
    number: ch.number,
    bookChapter: ch.number >= 100 ? ch.number - 100 : ch.number,
    book: ch.book,
    title: ch.title,
    sections: ch.sections.map((s) => ({ id: s.id, title: s.title })),
  }));
}

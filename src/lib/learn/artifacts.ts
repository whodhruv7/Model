// Types + loader for the Learn module artifacts (spec: scripts/artifacts/SPEC.md).
import { ARTIFACT_MANIFEST } from "./manifest";

export type VisualSpec =
  | { kind: "steps"; items: string[] }
  | { kind: "compare"; left: { title: string; items: string[] }; right: { title: string; items: string[] } }
  | { kind: "flow"; items: string[] }
  | { kind: "labels"; items: string[] }
  | { kind: "tree"; root: string; children: string[] }
  | { kind: "plot"; type: "line" | "bar"; xlabel: string; ylabel: string; points: number[][] };

export interface Slide { id: string; sec: string; title: string; kicker: string; bullets: string[]; visual?: VisualSpec; note?: string }
export interface Flashcard { id: string; sec: string; front: string; back: string; tag: string }
export interface QuizQ { id: string; sec: string; q: string; options: string[]; answer: number; why: string; difficulty: "easy" | "medium" | "hard" }
export interface WorkedExample { id: string; title: string; problem: string; steps: string[]; answer: string }
export interface ConceptMap { center: string; groups: { id: string; label: string }[]; nodes: { id: string; label: string; group: string }[]; edges: { from: string; to: string; label?: string }[] }
export interface FlowChart { title: string; steps: { id: string; label: string; detail: string }[]; edges: [number, number][] }

export interface ChapterArtifacts {
  book: "gm" | "sc" | "us";
  chapter: number;
  part?: string;
  title: string;
  grade: number;
  sections: { id: string; title: string }[];
  slides: Slide[];
  flashcards: Flashcard[];
  quiz: QuizQ[];
  examples: WorkedExample[];
  conceptMap?: ConceptMap;
  flowchart?: FlowChart;
}

export interface BookInfo { key: "gm" | "sc" | "us"; name: string; subject: string; blurb: string; cover: string; accent: string }
export const BOOKS: BookInfo[] = [
  { key: "gm", name: "Ganita Manjari", subject: "Mathematics", blurb: "From coordinates to volume — maths as a story.", cover: "linear-gradient(150deg,#16305b 0%,#214F78 60%,#2a5298 100%)", accent: "#A9CEE8" },
  { key: "sc", name: "Exploration", subject: "Science", blurb: "Cells, forces, atoms and sound — the world, explored.", cover: "linear-gradient(150deg,#0f3d33 0%,#1c5a4a 60%,#2a7a5f 100%)", accent: "#bfe3c6" },
  { key: "us", name: "Understanding Society", subject: "Social Science", blurb: "Climate, markets, history and how India runs.", cover: "linear-gradient(150deg,#4a2c5e 0%,#6a3f82 60%,#8a5aa8 100%)", accent: "#e6d3f5" },
];

/** All artifact parts merged per chapter. */
export function allChapters(): ChapterArtifacts[] {
  const byKey = new Map<string, ChapterArtifacts>();
  for (const { book, file, data } of ARTIFACT_MANIFEST) {
    const key = `${book}-${data.chapter}`;
    const cur = byKey.get(key);
    if (!cur) { byKey.set(key, { ...data }); continue; }
    // merge a later part into the first
    cur.sections = [...cur.sections, ...data.sections];
    cur.slides = [...cur.slides, ...data.slides];
    cur.flashcards = [...cur.flashcards, ...data.flashcards];
    cur.quiz = [...cur.quiz, ...data.quiz];
    cur.examples = [...cur.examples, ...data.examples];
    if (!cur.conceptMap && data.conceptMap) cur.conceptMap = data.conceptMap;
    if (!cur.flowchart && data.flowchart) cur.flowchart = data.flowchart;
    void file;
  }
  return [...byKey.values()].sort((a, b) => a.book.localeCompare(b.book) || a.chapter - b.chapter);
}

export function chaptersOf(book: string): ChapterArtifacts[] {
  return allChapters().filter(c => c.book === book);
}

export function getChapter(book: string, chapter: number): ChapterArtifacts | undefined {
  return allChapters().find(c => c.book === book && c.chapter === chapter);
}

export function bookInfo(book: string): BookInfo {
  return BOOKS.find(b => b.key === book) ?? BOOKS[0];
}

export function validBook(book: string): book is "gm" | "sc" | "us" {
  return BOOKS.some(b => b.key === book);
}

/** Total artifact objects across the library (slides+cards+quiz+examples+maps+flows). */
export function artifactStats() {
  let slides = 0, cards = 0, quiz = 0, examples = 0, maps = 0, flows = 0;
  for (const c of allChapters()) {
    slides += c.slides.length; cards += c.flashcards.length; quiz += c.quiz.length;
    examples += c.examples.length;
    if (c.conceptMap) maps += 1;
    if (c.flowchart) flows += 1;
  }
  return { slides, cards, quiz, examples, maps, flows, total: slides + cards + quiz + examples + maps + flows };
}

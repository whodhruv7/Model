// Founder Library — the "Data" section engine.
// Founder uploads up to 10 documents (PDF / MD / TXT / DOCX, ~300MB total);
// Saathy extracts their text (OCR for scanned PDFs), chunks them, and grounds
// every relevant answer in this material — citing it like a real tutor would.
// Binary files are NEVER stored: only cleaned text chunks live in SQLite.
import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { db } from '@/lib/db';
import { tokenize } from './books';

const pexec = promisify(execFile);

export const MAX_DOCS = 10;
export const MAX_TOTAL_BYTES = 300 * 1024 * 1024; // 300 MB across all docs
export const MAX_PER_FILE = 150 * 1024 * 1024;
const OCR_PAGE_CAP = 400; // safety valve for giant scans
const CHUNK_CHARS = 1100;

export interface DocChunk {
  docId: string;
  docTitle: string;
  heading: string;
  idx: number;
  text: string;
}

// ---------- text extraction ----------

async function pdftotext(file: string): Promise<string> {
  try {
    const { stdout } = await pexec('pdftotext', ['-q', '-enc', 'UTF-8', file, '-'], { maxBuffer: 256 * 1024 * 1024 });
    return stdout;
  } catch {
    return '';
  }
}

async function pdfPageCount(file: string): Promise<number> {
  try {
    const { stdout } = await pexec('pdfinfo', [file]);
    const m = stdout.match(/Pages:\s+(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  } catch {
    return 0;
  }
}

// OCR a scanned PDF: render pages to gray bitmaps, then tesseract, 2 at a time.
async function ocrPdf(file: string, maxPages: number): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'saathy-ocr-'));
  try {
    await pexec('pdftoppm', ['-r', '150', '-gray', '-f', '1', '-l', String(maxPages), file, path.join(dir, 'pg')], { maxBuffer: 64 * 1024 * 1024 });
    const files = (await readdir(dir)).filter((f) => f.endsWith('.pgm') || f.endsWith('.ppm')).sort();
    const out: string[] = [];
    const CONC = 2;
    for (let i = 0; i < files.length; i += CONC) {
      const batch = files.slice(i, i + CONC);
      await Promise.all(
        batch.map(async (f) => {
          try {
            const { stdout } = await pexec('tesseract', [path.join(dir, f), 'stdout', '-l', 'eng', '--psm', '3'], { maxBuffer: 32 * 1024 * 1024 });
            out[parseInt(f.replace(/\D/g, ''), 10)] = stdout;
          } catch {
            /* skip unreadable page */
          }
        })
      );
    }
    return out.filter(Boolean).join('\n\n');
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function extractDocx(file: string): Promise<string> {
  try {
    const { stdout } = await pexec('unzip', ['-p', file, 'word/document.xml'], { maxBuffer: 128 * 1024 * 1024 });
    return stdout
      .replace(/<\/w:p>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  } catch {
    return '';
  }
}

export async function extractText(file: string, kind: string): Promise<string> {
  if (kind === 'pdf') {
    const direct = await pdftotext(file);
    if (direct.replace(/\s/g, '').length > 400) return direct;
    // image-based PDF → OCR
    const pages = await pdfPageCount(file);
    const cap = Math.min(pages || OCR_PAGE_CAP, OCR_PAGE_CAP);
    const ocr = await ocrPdf(file, cap);
    if (ocr.replace(/\s/g, '').length > 400) {
      return pages > cap
        ? ocr + `\n\n[Note: trained on the first ${cap} of ${pages} pages of this scanned document.]`
        : ocr;
    }
    return direct + (ocr ? '\n' + ocr : '');
  }
  if (kind === 'docx') return extractDocx(file);
  return readFile(file, 'utf8');
}

// ---------- cleaning + chunking ----------

function cleanText(t: string): string {
  return t
    .replace(/\r/g, '\n')
    .replace(/\u00ad/g, '')
    .replace(/\ufb01/g, 'fi')
    .replace(/\ufb02/g, 'fl')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isHeading(line: string): boolean {
  const s = line.trim();
  if (!s || s.length > 90 || /[.,;]$/.test(s)) return false;
  const words = s.split(/\s+/).length;
  if (words > 12) return false;
  // explicit structural markers: "Chapter 3", "Unit 2 ...", "12. Air", "Topics"
  if (/^(chapter|unit|part|section|lesson|topic|activity|summary)\b/i.test(s)) return true;
  if (/^\d+(\.\d+)?[).:]?\s+\S/.test(s)) return true;
  // ALL-CAPS short line
  const letters = s.replace(/[^A-Za-z]/g, '');
  if (letters.length >= 3 && letters === letters.toUpperCase()) return true;
  // Title-ish short line: starts with a capital, plain characters, 2-8 words
  return words >= 2 && words <= 8 && /^[A-Z]/.test(s) && /^[A-Za-z0-9 ,'&():\-]+$/.test(s);
}

export function chunkText(text: string): Array<{ heading: string; content: string }> {
  const paragraphs = cleanText(text).split(/\n{2,}|\n(?=[A-Z0-9][^.]{0,90}$)/);
  const chunks: Array<{ heading: string; content: string }> = [];
  let heading = '';
  let cur = '';
  const flush = () => {
    const body = cur.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
    if (body.length > 220) chunks.push({ heading, content: body.slice(0, CHUNK_CHARS + 500) });
    cur = '';
  };
  for (const p of paragraphs) {
    const line = p.trim();
    if (!line) continue;
    if (isHeading(line)) {
      flush();
      heading = line.replace(/^#+\s*/, '').slice(0, 90);
      continue;
    }
    cur += (cur ? '\n\n' : '') + line;
    if (cur.length >= CHUNK_CHARS) flush();
  }
  flush();
  return chunks;
}

// ---------- ingestion pipeline (fire-and-forget after upload) ----------

export async function processDoc(docId: string, file: string, kind: string): Promise<void> {
  try {
    const text = await extractText(file, kind);
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      await db.dataDoc.update({ where: { id: docId }, data: { status: 'failed', statusMsg: 'No readable text found — try a text-based PDF or paste the content as .txt' } });
      return;
    }
    await db.dataChunk.createMany({
      data: chunks.map((c, i) => ({ docId, idx: i, heading: c.heading, content: c.content })),
    });
    const scanned = kind === 'pdf' && /\[Note: trained on the first/.test(text);
    await db.dataDoc.update({
      where: { id: docId },
      data: {
        status: 'ready',
        statusMsg: scanned
          ? `Read via OCR — ${chunks.length} sections (scanned pages, capped at ${OCR_PAGE_CAP})`
          : `Read successfully — ${chunks.length} sections learned`,
      },
    });
  } catch (err) {
    await db.dataDoc
      .update({
        where: { id: docId },
        data: { status: 'failed', statusMsg: err instanceof Error ? err.message.slice(0, 160) : 'Parsing failed' },
      })
      .catch(() => {});
  }
}

// ---------- retrieval ----------

export async function searchFounderDocs(query: string, limit = 3): Promise<DocChunk[]> {
  const terms = Array.from(new Set(tokenize(query))).slice(0, 6);
  if (terms.length === 0) return [];
  const docs = await db.dataDoc.findMany({ where: { status: 'ready' }, select: { id: true, title: true } });
  if (docs.length === 0) return [];
  const docMap = new Map(docs.map((d) => [d.id, d.title]));

  // SQL prefilter (LIKE) then in-memory scoring — the AI-02 seam; swap for
  // embeddings later without touching callers.
  const rows = await db.dataChunk.findMany({
    where: { OR: terms.map((t) => ({ content: { contains: t } })) },
    include: { doc: { select: { status: true } } },
    take: 600,
  });
  if (rows.length === 0) return [];

  const scored = rows
    .filter((r) => docMap.has(r.docId))
    .map((r) => {
      const hay = `${r.heading} ${r.content}`.toLowerCase();
      let score = 0;
      for (const t of terms) {
        const n = hay.split(t).length - 1;
        score += Math.min(n, 8);
      }
      if (r.heading.toLowerCase().includes(terms[0])) score += 2;
      return { r, score };
    })
    .filter((s) => s.score >= 3)
    .sort((a, b) => b.score - a.score);

  // diversity: max 2 chunks per doc
  const perDoc = new Map<string, number>();
  const picked: DocChunk[] = [];
  for (const { r } of scored) {
    const n = perDoc.get(r.docId) ?? 0;
    if (n >= 2) continue;
    perDoc.set(r.docId, n + 1);
    picked.push({ docId: r.docId, docTitle: docMap.get(r.docId) ?? 'Document', heading: r.heading, idx: r.idx, text: r.content });
    if (picked.length >= limit) break;
  }
  return picked;
}

export function docsGroundingBlock(chunks: DocChunk[]): { text: string; sources: string[] } {
  if (chunks.length === 0) return { text: '', sources: [] };
  const sources = chunks.map((c) => `${c.docTitle}${c.heading ? ` · ${c.heading}` : ''}`);
  const text = `FOUNDER LIBRARY (extra material the founder added for Saathy to know deeply — treat it as trusted school material, same rank as the textbooks).
Rules: teach FROM this material when it covers the question; cite it naturally like "(from ${sources[0].split(' · ')[0]})" and list the exact refs in the meta block's "sources". If it does not cover what was asked, teach from the textbooks or your own knowledge and be honest about the source.

${chunks.map((c) => `--- [${c.docTitle}${c.heading ? ` · ${c.heading}` : ''}]\n${c.text}`).join('\n\n')}`;
  return { text, sources };
}

export async function docsStatus(): Promise<{ docs: number; ready: number; totalBytes: number; maxDocs: number }> {
  const [count, ready, agg] = await Promise.all([
    db.dataDoc.count(),
    db.dataDoc.count({ where: { status: 'ready' } }),
    db.dataDoc.aggregate({ _sum: { sizeBytes: true } }),
  ]);
  return { docs: count, ready, totalBytes: agg._sum.sizeBytes ?? 0, maxDocs: MAX_DOCS };
}

// helper used by the upload route to buffer a File to disk
export async function bufferToFile(file: File): Promise<{ path: string; kind: string }> {
  const name = file.name || 'upload.txt';
  const ext = name.toLowerCase().split('.').pop() ?? 'txt';
  const kind = ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' : ext === 'md' || ext === 'markdown' ? 'md' : ext === 'doc' ? 'doc' : 'txt';
  const dir = await mkdtemp(path.join(tmpdir(), 'saathy-doc-'));
  const p = path.join(dir, `src.${kind === 'md' ? 'md' : kind}`);
  await writeFile(p, Buffer.from(await file.arrayBuffer()));
  return { path: p, kind };
}

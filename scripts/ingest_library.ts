// Ingest the founder's real training files from upload/ into the Founder
// Library (DataDoc + DataChunk), keeping re-downloadable originals in db/library/.
// Text PDFs extract instantly; scanned PDFs OCR (capped at 400 pages).
// Idempotent: skips files already ingested by fileName.
// Run: bun scripts/ingest_library.ts
import { PrismaClient } from '@prisma/client';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdir, copyFile, writeFile, readdir } from 'fs/promises';
import path from 'path';

const db = new PrismaClient();
const pexec = promisify(execFile);
const UPLOAD = '/home/z/my-project/upload';
const LIB = '/home/z/my-project/db/library';

const FILES: Array<{ file: string; title: string }> = [
  // The founder's latest drops — the big textbooks
  { file: 'Class9_SST_All_Chapters_Combined_261029_160729.pdf', title: 'Class 9 SST — All Chapters Combined' },
  { file: 'Science_Textbook_Grade_9_Complete_Compressed.pdf', title: 'Science Textbook — Grade 9 Complete' },
  // NCERT maths chapters (iemh = class 9 maths)
  ...Array.from({ length: 8 }, (_, i) => ({ file: `iemh10${i + 1}.pdf`, title: `NCERT Maths 9 — Chapter ${i + 1}` })),
  ...Array.from({ length: 6 }, (_, i) => ({ file: `iemh20${i + 1}.pdf`, title: `NCERT Maths 9 — Chapter ${i + 9}` })),
  // NCERT science chapters present (iest)
  { file: 'iest103.pdf', title: 'NCERT Science 9 — Chapter 3' },
  { file: 'iest108.pdf', title: 'NCERT Science 9 — Chapter 8' },
  { file: 'iest109.pdf', title: 'NCERT Science 9 — Chapter 9' },
  ...Array.from({ length: 6 }, (_, i) => ({ file: `iest20${i + 1}.pdf`, title: `NCERT Science 9 — Chapter ${i + 11}` })),
  // VidhyaSaathy product docs — the brand + method source of truth
  { file: 'VidhyaSaathy_Product_Master_File.pdf', title: 'VidhyaSaathy — Product Master File' },
  { file: 'VidhyaSaathy_Breakthrough.pdf', title: 'VidhyaSaathy — Breakthrough Doc' },
  { file: 'VidhyaSaathy_Final.pdf', title: 'VidhyaSaathy — Final Doc' },
  { file: 'VidhyaSaathy_Team_Guide_261015_163033.pdf', title: 'VidhyaSaathy — Team Guide' },
  { file: 'master_file.txt', title: 'VidhyaSaathy — Product Master File (text)' },
];

const CHUNK_CHARS = 1100;

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
  if (/^(chapter|unit|part|section|lesson|topic|activity|summary)\b/i.test(s)) return true;
  if (/^\d+(\.\d+)?[).:]?\s+\S/.test(s)) return true;
  const letters = s.replace(/[^A-Za-z]/g, '');
  if (letters.length >= 3 && letters === letters.toUpperCase()) return true;
  return words >= 2 && words <= 8 && /^[A-Z]/.test(s) && /^[A-Za-z0-9 ,'&():\-]+$/.test(s);
}

function chunkText(text: string): Array<{ heading: string; content: string }> {
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

async function extractPdf(file: string): Promise<{ text: string; ocr: boolean }> {
  try {
    const { stdout } = await pexec('pdftotext', ['-q', '-enc', 'UTF-8', file, '-'], { maxBuffer: 256 * 1024 * 1024 });
    if (stdout.replace(/\s/g, '').length > 400) return { text: stdout, ocr: false };
  } catch { /* fall through to OCR */ }
  // scanned → OCR capped at 400 pages
  const dir = `/tmp/saathy-ingest-${path.basename(file, '.pdf')}`;
  await mkdir(dir, { recursive: true });
  try {
    await pexec('pdftoppm', ['-r', '150', '-gray', '-f', '1', '-l', '400', file, path.join(dir, 'pg')], { maxBuffer: 64 * 1024 * 1024 });
    const pages = (await readdir(dir)).filter((f) => f.endsWith('.pgm') || f.endsWith('.ppm')).sort();
    const out: string[] = [];
    const CONC = 2;
    for (let i = 0; i < pages.length; i += CONC) {
      await Promise.all(
        pages.slice(i, i + CONC).map(async (f) => {
          try {
            const { stdout } = await pexec('tesseract', [path.join(dir, f), 'stdout', '-l', 'eng', '--psm', '3'], { maxBuffer: 32 * 1024 * 1024 });
            out[parseInt(f.replace(/\D/g, ''), 10)] = stdout;
          } catch { /* skip */ }
        })
      );
      if ((i / CONC) % 20 === 0) console.log(`    OCR progress: ${Math.min(i + CONC, pages.length)}/${pages.length} pages`);
    }
    return { text: out.filter(Boolean).join('\n\n'), ocr: true };
  } finally {
    await pexec('rm', ['-rf', dir]).catch(() => {});
  }
}

async function ingestOne({ file, title }: { file: string; title: string }, idx: number) {
  const existing = await db.dataDoc.findFirst({ where: { fileName: file } });
  if (existing) {
    if (existing.status === 'ready' || existing.status === 'failed') {
      console.log(`[${idx}] skip (already ingested): ${file}`);
      return;
    }
    // stale row from an interrupted run — wipe and re-ingest
    await db.dataDoc.delete({ where: { id: existing.id } }).catch(() => {});
    console.log(`[${idx}] resuming interrupted doc: ${file}`);
  }
  const src = path.join(UPLOAD, file);
  const ext = file.toLowerCase().split('.').pop() ?? 'txt';
  console.log(`[${idx}] ingesting: ${file}`);

  // Create the row FIRST so the founder section shows honest "reading…" status
  // while the (possibly long) OCR runs.
  const doc = await db.dataDoc.create({
    data: {
      title,
      fileName: file,
      kind: ext === 'pdf' ? 'pdf' : ext === 'md' ? 'md' : 'txt',
      sizeBytes: 0,
      status: 'parsing',
      statusMsg: ext === 'pdf' ? 'Reading and learning this document… (big scan — OCR can take a few minutes)' : 'Reading and learning this document…',
    },
  });
  // keep the original re-downloadable right away
  await mkdir(LIB, { recursive: true }).catch(() => {});
  await copyFile(src, path.join(LIB, `${doc.id}.${ext}`)).catch(() => {});
  await db.dataDoc.update({ where: { id: doc.id }, data: { storedName: `${doc.id}.${ext}` } });

  let text = '';
  let ocr = false;
  if (ext === 'pdf') {
    const r = await extractPdf(src);
    text = r.text;
    ocr = r.ocr;
  } else {
    text = await (await import('fs/promises')).readFile(src, 'utf8');
  }
  const chunks = chunkText(text);
  const statSize = chunks.reduce((a, c) => a + c.content.length, 0);
  await db.dataDoc.update({ where: { id: doc.id }, data: { sizeBytes: statSize } });

  if (chunks.length === 0) {
    await db.dataDoc.update({ where: { id: doc.id }, data: { status: 'failed', statusMsg: 'No readable text found' } });
    console.log(`[${idx}]   FAILED — no text (${file})`);
    return;
  }
  // insert chunks in batches to stay memory-safe
  const B = 200;
  for (let i = 0; i < chunks.length; i += B) {
    await db.dataChunk.createMany({
      data: chunks.slice(i, i + B).map((c, j) => ({ docId: doc.id, idx: i + j, heading: c.heading, content: c.content })),
    });
  }
  await db.dataDoc.update({
    where: { id: doc.id },
    data: { status: 'ready', statusMsg: ocr ? `Read via OCR — ${chunks.length} sections learned` : `Read successfully — ${chunks.length} sections learned` },
  });
  console.log(`[${idx}]   ready — ${chunks.length} chunks${ocr ? ' (OCR)' : ''}`);
}

async function main() {
  let i = 0;
  for (const f of FILES) {
    i++;
    try {
      await ingestOne(f, i);
    } catch (e) {
      console.error(`[${i}] ERROR ${f.file}:`, e instanceof Error ? e.message : e);
    }
  }
  const done = await db.dataDoc.count();
  console.log(`DONE — library now has ${done} docs.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());

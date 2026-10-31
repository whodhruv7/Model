// /api/founder/data — the Founder "Data" section: documents Saathy is trained on.
//   GET      ?pin=…                       → list docs + limits + honest parsing status
//   POST     multipart { pin, file }      → upload one doc (PDF/MD/TXT/DOCX)
//   PUT      raw body + x-pin/x-filename  → memory-safe streaming upload for BIG files (300MB)
//   POST     JSON { type:'youtube', url } → add a YouTube link (+optional notes) as knowledge
//   GET      ?pin=…&id=…&download=1       → re-download the original stored file
//   DELETE   ?pin=…&id=…                  → remove a doc, its chunks and its stored original
import { NextRequest } from 'next/server';
import { createWriteStream } from 'fs';
import { mkdir, stat, unlink } from 'fs/promises';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import path from 'path';
import { db } from '@/lib/db';
import {
  addYoutubeDoc, bufferToFile, keepOriginal, docsStatus, LIBRARY_DIR,
  MAX_DOCS, MAX_PER_FILE, MAX_TOTAL_BYTES, processDoc,
} from '@/server/saathy/docs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function pinOk(pin: string | null): Promise<boolean> {
  if (!pin) return false;
  const s = await db.appSettings.findUnique({ where: { id: 'main' } });
  return !!s && pin === s.founderPin;
}

async function libraryUsage() {
  const [docCount, agg] = await Promise.all([db.dataDoc.count(), db.dataDoc.aggregate({ _sum: { sizeBytes: true } })]);
  return { docCount, used: agg._sum.sizeBytes ?? 0 };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  if (!(await pinOk(sp.get('pin')))) {
    return Response.json({ ok: false, error: 'Incorrect PIN' }, { status: 401 });
  }

  // Re-download the original file the founder trained Saathy on.
  const id = sp.get('id');
  if (id && sp.get('download')) {
    const doc = await db.dataDoc.findUnique({ where: { id } });
    if (!doc || !doc.storedName) {
      return Response.json({ ok: false, error: 'Original file not stored for this document' }, { status: 404 });
    }
    const p = path.join(LIBRARY_DIR, doc.storedName);
    try {
      const st = await stat(p);
      const { readFile } = await import('fs/promises');
      const buf = await readFile(p);
      const safeName = doc.fileName.replace(/[^\w.\- ()]/g, '_') || 'document';
      return new Response(new Uint8Array(buf), {
        status: 200,
        headers: {
          'Content-Type': doc.kind === 'pdf' ? 'application/pdf' : 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${safeName}"`,
          'Content-Length': String(st.size),
          'Cache-Control': 'no-store',
        },
      });
    } catch {
      return Response.json({ ok: false, error: 'Stored file missing on disk' }, { status: 404 });
    }
  }

  const docs = await db.dataDoc.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, fileName: true, kind: true, sizeBytes: true, url: true,
      status: true, statusMsg: true, createdAt: true, storedName: true, _count: { select: { chunks: true } },
    },
  });
  const status = await docsStatus();
  return Response.json({
    ok: true,
    docs: docs.map((d) => ({ ...d, chunks: d._count.chunks, downloadable: !!d.storedName })),
    limits: { maxDocs: MAX_DOCS, maxTotalBytes: MAX_TOTAL_BYTES, usedBytes: status.totalBytes },
  });
}

// Shared ingestion after bytes reach a temp file.
async function ingestFromDisk(docId: string, p: string, kind: string, ext: string) {
  const stored = await keepOriginal(docId, p, ext).catch(() => null);
  await db.dataDoc.update({ where: { id: docId }, data: { storedName: stored } }).catch(() => {});
  void processDoc(docId, p, kind).finally(() => unlink(p).catch(() => {}));
}

async function createDocRow(name: string, size: number) {
  const ext = (name.toLowerCase().split('.').pop() ?? 'txt').slice(0, 10);
  const title = name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').slice(0, 80) || 'Untitled document';
  return db.dataDoc.create({
    data: {
      title,
      fileName: name,
      kind: ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' : ext === 'md' || ext === 'markdown' ? 'md' : ext === 'doc' ? 'doc' : 'txt',
      sizeBytes: size,
      status: 'parsing',
      statusMsg: 'Reading and learning this document…',
    },
  });
}

const EXT_OK = (ext: string) => ['pdf', 'md', 'markdown', 'txt', 'docx'].includes(ext);

// PUT — raw streaming upload. The client sends the file as the request body
// with x-pin / x-filename headers. Bytes stream straight to disk (fixed 4MB
// chunks), so even a 300MB scan never sits fully in RAM.
export async function PUT(req: NextRequest) {
  const pin = req.headers.get('x-pin');
  if (!(await pinOk(pin))) return Response.json({ ok: false, error: 'Incorrect PIN' }, { status: 401 });
  if (!req.body) return Response.json({ ok: false, error: 'No file received' }, { status: 400 });

  const name = (req.headers.get('x-filename') || 'document.txt').trim().slice(0, 200);
  const ext = name.toLowerCase().split('.').pop() ?? '';
  if (!EXT_OK(ext)) {
    return Response.json({ ok: false, error: 'Unsupported format — use PDF, DOCX, MD or TXT (scanned PDFs are auto-OCR’d)' }, { status: 415 });
  }

  const declared = Number(req.headers.get('x-size') || '0');
  const { docCount, used } = await libraryUsage();
  if (docCount >= MAX_DOCS) {
    return Response.json({ ok: false, error: `Library full — ${MAX_DOCS} documents max. Delete one to add another.` }, { status: 409 });
  }
  if (declared > MAX_PER_FILE) {
    return Response.json({ ok: false, error: 'File too large (300MB per file max)' }, { status: 413 });
  }
  if (used + declared > MAX_TOTAL_BYTES) {
    return Response.json({ ok: false, error: 'Library would cross the 1GB total — remove something first.' }, { status: 413 });
  }

  const doc = await createDocRow(name, declared || 0);

  const { mkdtemp, writeFile } = await import('fs/promises');
  const { tmpdir } = await import('os');
  try {
    const dir = await mkdtemp(path.join(tmpdir(), 'saathy-up-'));
    const p = path.join(dir, `src.${ext}`);
    await mkdir(path.dirname(p), { recursive: true });
    await pipeline(
      Readable.fromWeb(req.body as Parameters<typeof Readable.fromWeb>[0]),
      createWriteStream(p)
    );
    const st = await stat(p);
    if (st.size === 0) throw new Error('empty upload');
    await db.dataDoc.update({ where: { id: doc.id }, data: { sizeBytes: st.size } }).catch(() => {});
    await ingestFromDisk(doc.id, p, doc.kind, ext);
    return Response.json({ ok: true, docId: doc.id, title: doc.title, sizeBytes: st.size });
  } catch {
    await db.dataDoc.delete({ where: { id: doc.id } }).catch(() => {});
    return Response.json({ ok: false, error: 'Upload failed while streaming — try again' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ct = req.headers.get('content-type') ?? '';

  // YouTube link ingestion (JSON) — { type:'youtube', url, title?, notes? }
  if (ct.includes('application/json')) {
    const j = (await req.json().catch(() => ({}))) as { type?: string; pin?: string; url?: string; title?: string; notes?: string };
    if (!(await pinOk(j.pin ?? null))) return Response.json({ ok: false, error: 'Incorrect PIN' }, { status: 401 });
    const url = (j.url ?? '').trim();
    if (!/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url)) {
      return Response.json({ ok: false, error: 'Paste a valid YouTube link (youtube.com or youtu.be)' }, { status: 400 });
    }
    // Best-effort real title via oEmbed (4s cap, honest fallback).
    let title = (j.title ?? '').trim();
    if (!title) {
      const id = (/(?:watch\?v=|youtu\.be\/|shorts\/)([\w-]{6,20})/.exec(url) ?? [])[1];
      if (id) {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 4000);
          const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`, { signal: ctrl.signal });
          clearTimeout(t);
          const oj = (await r.json().catch(() => ({}))) as { title?: string };
          if (oj.title) title = oj.title;
        } catch { /* offline — filename stays honest */ }
      }
    }
    const res = await addYoutubeDoc(url, title || 'YouTube video', (j.notes ?? '').slice(0, 200000));
    return Response.json({ ok: true, ...res, title: title || 'YouTube video' });
  }

  // Multipart file upload (normal path).
  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ ok: false, error: 'Send the file as multipart form-data' }, { status: 400 });
  if (!(await pinOk((form.get('pin') as string) ?? null))) {
    return Response.json({ ok: false, error: 'Incorrect PIN' }, { status: 401 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) return Response.json({ ok: false, error: 'No file received' }, { status: 400 });

  const name = (file.name || 'document.txt').trim();
  const ext = name.toLowerCase().split('.').pop() ?? '';
  if (!EXT_OK(ext)) {
    return Response.json({ ok: false, error: 'Unsupported format — use PDF, DOCX, MD or TXT (scanned PDFs are auto-OCR’d)' }, { status: 415 });
  }

  const { docCount, used } = await libraryUsage();
  if (docCount >= MAX_DOCS) {
    return Response.json({ ok: false, error: `Library full — ${MAX_DOCS} documents max. Delete one to add another.` }, { status: 409 });
  }
  if (file.size > MAX_PER_FILE) {
    return Response.json({ ok: false, error: 'File too large (300MB per file max)' }, { status: 413 });
  }
  if (used + file.size > MAX_TOTAL_BYTES) {
    return Response.json({ ok: false, error: 'Library would cross the 1GB total — remove something first.' }, { status: 413 });
  }

  const doc = await createDocRow(name, file.size);

  try {
    const { path: p, kind } = await bufferToFile(file);
    await ingestFromDisk(doc.id, p, kind, ext);
    return Response.json({ ok: true, docId: doc.id, title: doc.title, kind: doc.kind, sizeBytes: file.size });
  } catch {
    await db.dataDoc.update({ where: { id: doc.id }, data: { status: 'failed', statusMsg: 'Could not read the uploaded file' } }).catch(() => {});
    return Response.json({ ok: false, error: 'Could not read the uploaded file' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get('pin');
  const id = req.nextUrl.searchParams.get('id');
  if (!(await pinOk(pin))) return Response.json({ ok: false, error: 'Incorrect PIN' }, { status: 401 });
  if (!id) return Response.json({ ok: false, error: 'Missing doc id' }, { status: 400 });
  const doc = await db.dataDoc.findUnique({ where: { id } }).catch(() => null);
  if (doc?.storedName) {
    await unlink(path.join(LIBRARY_DIR, doc.storedName)).catch(() => {});
  }
  await db.dataDoc.delete({ where: { id } }).catch(() => {});
  const status = await docsStatus();
  return Response.json({ ok: true, limits: { maxDocs: MAX_DOCS, maxTotalBytes: MAX_TOTAL_BYTES, usedBytes: status.totalBytes } });
}

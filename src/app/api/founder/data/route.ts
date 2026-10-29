// /api/founder/data — the Founder "Data" section: documents Saathy is trained on.
//   GET    ?pin=…            → list docs + limits + honest parsing status
//   POST   multipart { pin, file } → upload one doc (PDF/MD/TXT/DOCX), max 10 docs,
//          ~300MB total; text is extracted (OCR if scanned) and ONLY text chunks
//          are stored — never binaries.
//   DELETE ?pin=…&id=…       → remove a doc and its chunks
import { NextRequest } from 'next/server';
import { unlink } from 'fs/promises';
import { db } from '@/lib/db';
import { bufferToFile, docsStatus, MAX_DOCS, MAX_PER_FILE, MAX_TOTAL_BYTES, processDoc } from '@/server/saathy/docs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function pinOk(pin: string | null): Promise<boolean> {
  if (!pin) return false;
  const s = await db.appSettings.findUnique({ where: { id: 'main' } });
  return !!s && pin === s.founderPin;
}

export async function GET(req: NextRequest) {
  if (!(await pinOk(req.nextUrl.searchParams.get('pin')))) {
    return Response.json({ ok: false, error: 'Incorrect PIN' }, { status: 401 });
  }
  const docs = await db.dataDoc.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, fileName: true, kind: true, sizeBytes: true,
      status: true, statusMsg: true, createdAt: true, _count: { select: { chunks: true } },
    },
  });
  const status = await docsStatus();
  return Response.json({
    ok: true,
    docs: docs.map((d) => ({ ...d, chunks: d._count.chunks })),
    limits: { maxDocs: MAX_DOCS, maxTotalBytes: MAX_TOTAL_BYTES, usedBytes: status.totalBytes },
  });
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ ok: false, error: 'Send the file as multipart form-data' }, { status: 400 });
  if (!(await pinOk((form.get('pin') as string) ?? null))) {
    return Response.json({ ok: false, error: 'Incorrect PIN' }, { status: 401 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) return Response.json({ ok: false, error: 'No file received' }, { status: 400 });

  const name = (file.name || 'document.txt').trim();
  const ext = name.toLowerCase().split('.').pop() ?? '';
  if (!['pdf', 'md', 'markdown', 'txt', 'docx'].includes(ext)) {
    return Response.json({ ok: false, error: 'Unsupported format — use PDF, DOCX, MD or TXT (scanned PDFs are auto-OCR\u2019d)' }, { status: 415 });
  }

  // Limits: max 10 docs, 300MB total, 150MB per file — enforced BEFORE parsing.
  const [docCount, agg] = await Promise.all([db.dataDoc.count(), db.dataDoc.aggregate({ _sum: { sizeBytes: true } })]);
  if (docCount >= MAX_DOCS) {
    return Response.json({ ok: false, error: `Library full — ${MAX_DOCS} documents max. Delete one to add another.` }, { status: 409 });
  }
  if (file.size > MAX_PER_FILE) {
    return Response.json({ ok: false, error: 'File too large (150MB per file max)' }, { status: 413 });
  }
  if ((agg._sum.sizeBytes ?? 0) + file.size > MAX_TOTAL_BYTES) {
    return Response.json({ ok: false, error: 'Library would cross the 300MB total — remove something first.' }, { status: 413 });
  }

  const title = name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').slice(0, 80) || 'Untitled document';
  const doc = await db.dataDoc.create({
    data: {
      title,
      fileName: name,
      kind: ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' : ext === 'md' || ext === 'markdown' ? 'md' : 'txt',
      sizeBytes: file.size,
      status: 'parsing',
      statusMsg: 'Reading and learning this document…',
    },
  });

  // Save to a temp dir, then parse in the background — the founder gets an
  // instant upload confirmation and an honest "reading…" status until done.
  try {
    const { path, kind } = await bufferToFile(file);
    void processDoc(doc.id, path, kind).finally(() => unlink(path).catch(() => {}));
  } catch {
    await db.dataDoc.update({ where: { id: doc.id }, data: { status: 'failed', statusMsg: 'Could not read the uploaded file' } }).catch(() => {});
    return Response.json({ ok: false, error: 'Could not read the uploaded file' }, { status: 500 });
  }

  return Response.json({ ok: true, docId: doc.id, title, kind: doc.kind, sizeBytes: file.size });
}

export async function DELETE(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get('pin');
  const id = req.nextUrl.searchParams.get('id');
  if (!(await pinOk(pin))) return Response.json({ ok: false, error: 'Incorrect PIN' }, { status: 401 });
  if (!id) return Response.json({ ok: false, error: 'Missing doc id' }, { status: 400 });
  await db.dataDoc.delete({ where: { id } }).catch(() => {});
  const status = await docsStatus();
  return Response.json({ ok: true, limits: { maxDocs: MAX_DOCS, maxTotalBytes: MAX_TOTAL_BYTES, usedBytes: status.totalBytes } });
}

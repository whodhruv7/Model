// GET /api/export/html?conversationId=... — download the conversation (and the
// Saathy look) as ONE standalone HTML file: theme, mascot, math, sources and
// interactive cards all baked in as a readable snapshot. Honest by design:
// interactive cards are shown with their data, artifacts note they are playable
// in the live app.
import { db } from '@/lib/db';
import katex from 'katex';
import { readFile } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

// ---------- tiny markdown -> html (tailored to Saathy's output contract) ----------

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineMd(s: string): string {
  let t = esc(s);
  // display math first
  t = t.replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex) => {
    try {
      return katex.renderToString(tex, { displayMode: true, throwOnError: false });
    } catch {
      return `<code>${tex}</code>`;
    }
  });
  t = t.replace(/\$([^$\n]+?)\$/g, (_m, tex) => {
    try {
      return katex.renderToString(tex, { displayMode: false, throwOnError: false });
    } catch {
      return `<code>${tex}</code>`;
    }
  });
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  t = t.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  return t;
}

function mdToHtml(md: string): string {
  // pull out display-math blocks first (they may span lines)
  const mathBlocks: string[] = [];
  const withPlaceholders = md.replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex) => {
    try {
      mathBlocks.push(katex.renderToString(tex, { displayMode: true, throwOnError: false }));
    } catch {
      mathBlocks.push(`<code>${esc(tex)}</code>`);
    }
    return `%%MATHBLOCK${mathBlocks.length - 1}%%`;
  });

  const lines = withPlaceholders.split('\n');
  const out: string[] = [];
  let inList: 'ul' | 'ol' | null = null;
  let inQuote = false;
  let tableBuf: string[] = [];

  const flushList = () => {
    if (inList) {
      out.push(`</${inList}>`);
      inList = null;
    }
  };
  const flushQuote = () => {
    if (inQuote) {
      out.push('</blockquote>');
      inQuote = false;
    }
  };
  const flushTable = () => {
    if (tableBuf.length === 0) return;
    const rows = tableBuf.map((r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
    const isSep = (r: string[]) => r.every((c) => /^:?-{2,}:?$/.test(c));
    const body = rows.filter((r) => !isSep(r));
    const head = body.shift() ?? [];
    let html = '<table><thead><tr>' + head.map((c) => `<th>${inlineMd(c)}</th>`).join('') + '</tr></thead><tbody>';
    for (const r of body) html += '<tr>' + r.map((c) => `<td>${inlineMd(c)}</td>`).join('') + '</tr>';
    html += '</tbody></table>';
    out.push(html);
    tableBuf = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*\|.*\|\s*$/.test(line)) {
      flushList();
      flushQuote();
      tableBuf.push(line);
      continue;
    }
    flushTable();
    if (!line.trim()) {
      flushList();
      flushQuote();
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushList();
      flushQuote();
      const lvl = Math.min(h[1].length + 1, 5);
      out.push(`<h${lvl}>${inlineMd(h[2])}</h${lvl}>`);
      continue;
    }
    if (/^>\s?/.test(line)) {
      flushList();
      if (!inQuote) {
        out.push('<blockquote>');
        inQuote = true;
      }
      out.push(`<p>${inlineMd(line.replace(/^>\s?/, ''))}</p>`);
      continue;
    }
    flushQuote();
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul) {
      if (inList !== 'ul') {
        flushList();
        out.push('<ul>');
        inList = 'ul';
      }
      out.push(`<li>${inlineMd(ul[1])}</li>`);
      continue;
    }
    if (ol) {
      if (inList !== 'ol') {
        flushList();
        out.push('<ol>');
        inList = 'ol';
      }
      out.push(`<li>${inlineMd(ol[1])}</li>`);
      continue;
    }
    flushList();
    out.push(`<p>${inlineMd(line)}</p>`);
  }
  flushList();
  flushQuote();
  flushTable();
  // restore display-math blocks
  let html = out.join('\n');
  html = html.replace(/%%MATHBLOCK(\d+)%%/g, (_m, i) => mathBlocks[Number(i)] ?? '');
  return html;
}

// ---------- artifact static previews ----------

type ChartSpecLite = {
  kind: string;
  series: Array<{ name: string; points: Array<{ x: number; y: number }> }>;
  categories?: string[];
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
};

function chartSvg(chart: ChartSpecLite): string {
  const W = 560;
  const H = 320;
  const M = { l: 46, r: 14, t: 16, b: 36 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const allY = chart.series.flatMap((s) => s.points.map((p) => p.y));
  const y0 = chart.yMin ?? Math.min(...allY, 0);
  const y1 = chart.yMax ?? (Math.max(...allY, 1) || 1);
  const yFor = (y: number) => M.t + ih - ((y - y0) / (y1 - y0 || 1)) * ih;
  const colors = ['#5E97F0', '#f6a97c', '#46a758'];
  let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:640px">`;
  for (let i = 0; i <= 4; i++) {
    const ty = y0 + ((y1 - y0) * i) / 4;
    svg += `<line x1="${M.l}" x2="${W - M.r}" y1="${yFor(ty)}" y2="${yFor(ty)}" stroke="#e6ecf4"/><text x="${M.l - 8}" y="${yFor(ty) + 3}" text-anchor="end" font-size="10" fill="#8a94a8">${Math.round(ty * 100) / 100}</text>`;
  }
  svg += `<line x1="${M.l}" x2="${W - M.r}" y1="${M.t + ih}" y2="${M.t + ih}" stroke="#c8d2e0" stroke-width="1.5"/>`;
  chart.series.forEach((s, si) => {
    if (chart.kind === 'bar') {
      const n = chart.categories?.length ?? s.points.length;
      const bw = (iw / Math.max(n, 1)) * 0.62;
      s.points.forEach((p, i) => {
        const x = M.l + (i + 0.5) * (iw / Math.max(n, 1)) - bw / 2;
        const y = yFor(p.y);
        svg += `<rect x="${x}" y="${y}" width="${bw}" height="${M.t + ih - y}" rx="5" fill="${colors[si % 3]}" opacity="0.88"/>`;
        if (chart.categories?.[i])
          svg += `<text x="${x + bw / 2}" y="${M.t + ih + 16}" text-anchor="middle" font-size="10" fill="#5c6f8a" font-weight="700">${esc(chart.categories[i])}</text>`;
      });
    } else {
      const d = s.points
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${M.l + (i / Math.max(s.points.length - 1, 1)) * iw},${yFor(p.y)}`)
        .join(' ');
      svg += `<path d="${d}" fill="none" stroke="${colors[si % 3]}" stroke-width="2.6" stroke-linecap="round"/>`;
      s.points.forEach((p, i) => {
        svg += `<circle cx="${M.l + (i / Math.max(s.points.length - 1, 1)) * iw}" cy="${yFor(p.y)}" r="4" fill="#fff" stroke="${colors[si % 3]}" stroke-width="2.4"/>`;
      });
    }
  });
  svg += '</svg>';
  return svg;
}

async function mascotDataUri(pose: string): Promise<string> {
  try {
    const p = path.join(process.cwd(), 'public', 'saathy', `pose_${pose}.png`);
    const buf = await readFile(p);
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return '';
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('conversationId');
  if (!id) return Response.json({ error: 'conversationId is required' }, { status: 400 });

  const conv = await db.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!conv) return Response.json({ error: 'Conversation not found' }, { status: 404 });

  const [idleB64, explainingB64] = await Promise.all([mascotDataUri('idle'), mascotDataUri('explaining')]);
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const body: string[] = [];
  for (const m of conv.messages) {
    let meta: Record<string, unknown> = {};
    try {
      meta = m.meta ? JSON.parse(m.meta) : {};
    } catch {
      meta = {};
    }
    if (m.role === 'user') {
      body.push(`<div class="row user"><div class="bubble user-bubble"><p>${esc(m.content).replace(/\n/g, '<br/>')}</p></div></div>`);
    } else {
      const sources = Array.isArray(meta.sources) ? (meta.sources as string[]) : [];
      const qc = meta.quickcheck as { concept?: string; question?: string; options?: string[]; answer?: number } | null;
      const lc = meta.levelcheck as { concept?: string; questions?: Array<{ question?: string; options?: string[]; answer?: number; why?: string }> } | null;
      const art = meta.artifact as { type?: string; title?: string; chart?: ChartSpecLite } | null;

      let extras = '';
      if (sources.length > 0) {
        extras += `<div class="sources">${sources.map((s) => `<span class="src-chip">📖 ${esc(s)}</span>`).join('')}</div>`;
      }
      if (qc && qc.question) {
        extras += `<div class="card qc"><div class="card-head">QUICK CHECK${qc.concept ? ` · ${esc(qc.concept)}` : ''}</div><p class="q">${esc(qc.question)}</p><ul class="opts">${(qc.options ?? [])
          .map((o, i) => `<li class="${i === qc.answer ? 'right' : ''}">${String.fromCharCode(65 + i)}. ${esc(o)}</li>`)
          .join('')}</ul></div>`;
      }
      if (lc && lc.questions) {
        extras += `<div class="card lc"><div class="card-head">LEVEL CHECK · ${esc(lc.concept ?? '')}</div>${lc.questions
          .map(
            (q) =>
              `<p class="q">${esc(q.question ?? '')}</p><ul class="opts">${(q.options ?? [])
                .map((o, i) => `<li class="${i === q.answer ? 'right' : ''}">${String.fromCharCode(65 + i)}. ${esc(o)}</li>`)
                .join('')}</ul>${q.why ? `<p class="why">${esc(q.why)}</p>` : ''}`
          )
          .join('<hr class="soft"/>')}</div>`;
      }
      if (art && art.title) {
        extras += `<div class="card art"><div class="card-head">ARTIFACT · ${esc(art.title)}</div>${
          art.chart ? chartSvg(art.chart) : '<p class="why">Interactive concept machine — play it live in the Saathy app.</p>'
        }</div>`;
      }

      body.push(
        `<div class="row ai"><img class="avatar" src="${explainingB64 || idleB64}" alt="Saathy" width="36" height="36"/><div class="bubble ai-bubble"><p class="who">Saathy</p>${mdToHtml(
          m.content
        )}${extras}</div></div>`
      );
    }
  }

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Saathy — ${esc(conv.title).slice(0, 60)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<style>
  :root { --navy:#16305b; --text:#17324F; --sub:#5c6f8a; --peach:#F6D5C6; --peach-mist:#FBE9DF; --cream:#FFF5ED; --sky:#A9CEE8; --powder:#D7E9F5; --blue:#214F78; --border:#D8DDE7; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:'Manrope',system-ui,sans-serif; color:var(--text);
    background: linear-gradient(160deg, var(--cream) 0%, var(--peach-mist) 45%, var(--powder) 100%); min-height:100vh; }
  .wrap { max-width: 780px; margin: 0 auto; padding: 28px 16px 64px; }
  header.top { text-align:center; padding: 18px 0 6px; }
  header.top img { width:76px; height:76px; object-fit:contain; filter: drop-shadow(0 6px 14px rgba(30,58,138,.14)); }
  header.top h1 { margin:.4rem 0 0; font-size:22px; font-weight:800; color:var(--navy); letter-spacing:-.01em; }
  header.top p { margin:.15rem 0 0; font-size:12.5px; font-weight:700; color:var(--sub); }
  .row { display:flex; margin:14px 0; gap:10px; }
  .row.user { justify-content:flex-end; }
  .bubble { border-radius:16px; padding:12px 16px; max-width:85%; font-size:14px; line-height:1.65; }
  .user-bubble { background:linear-gradient(135deg,#7fb3ff,#6aa6ff); color:#0e2a5e; font-weight:600; border-bottom-right-radius:6px; box-shadow:0 2px 10px rgba(30,58,138,.12); }
  .ai-bubble { background:rgba(255,255,255,.88); border:1px solid #ece7e0; border-top-left-radius:6px; box-shadow:0 1px 8px rgba(30,58,138,.05); }
  .ai-bubble p { margin:.45rem 0; }
  .ai-bubble p:first-of-type { margin-top:0; }
  .who { font-size:11.5px; font-weight:800; color:var(--navy); margin:0 0 .3rem !important; letter-spacing:.02em; }
  .ai-bubble h3,.ai-bubble h4 { color:var(--navy); font-weight:800; margin:.8rem 0 .3rem; }
  .ai-bubble ul,.ai-bubble ol { margin:.4rem 0; padding-left:1.3rem; }
  .ai-bubble li { margin:.25rem 0; }
  .ai-bubble table { width:100%; border-collapse:collapse; font-size:13px; margin:.6rem 0; border:1px solid var(--border); border-radius:8px; overflow:hidden; }
  .ai-bubble th { background:var(--powder); text-align:left; color:var(--navy); }
  .ai-bubble th,.ai-bubble td { padding:6px 10px; border-bottom:1px solid var(--border); }
  .ai-bubble blockquote { border-left:3px solid var(--peach); background:var(--cream); margin:.5rem 0; padding:.4rem .8rem; border-radius:0 8px 8px 0; }
  .ai-bubble code { background:var(--powder); border-radius:5px; padding:.05rem .3rem; font-size:.85em; }
  .katex-display { background:var(--powder); border:1px solid rgba(127,179,255,.3); border-radius:10px; padding:8px 10px; overflow-x:auto; }
  .sources { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }
  .src-chip { display:inline-flex; align-items:center; border:1px solid #cfe3fb; background:#f3f9ff; color:#2a5298; font-size:11px; font-weight:700; border-radius:999px; padding:2px 10px; }
  .card { margin-top:12px; border-radius:14px; border:1px solid #cfe3fb; background:linear-gradient(180deg,#f3f9ff,#fff6ef); padding:12px 14px; }
  .card-head { font-size:11px; font-weight:800; letter-spacing:.06em; color:#2a5298; margin-bottom:6px; }
  .card .q { font-weight:700; color:#1e3a5f; margin:.2rem 0 .4rem; }
  .card ul.opts { list-style:none; margin:0; padding:0; }
  .card ul.opts li { padding:6px 10px; border:1px solid #dfe4ee; border-radius:9px; margin:4px 0; font-size:13px; font-weight:600; color:#1e3a5f; background:#fff; }
  .card ul.opts li.right { border-color:#46a758; background:#edf7ee; }
  .card .why { font-size:12.5px; color:#5c6f8a; margin:.3rem 0 0; }
  hr.soft { border:none; border-top:1px dashed #d8cfc4; margin:10px 0; }
  .footer { text-align:center; margin-top:36px; font-size:12px; font-weight:700; color:var(--sub); }
  .footer .dot { color:var(--peach); }
  @media print { body { background:#fff; } .bubble { box-shadow:none; } }
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <img src="${idleB64}" alt="Saathy mascot"/>
    <h1>Saathy ☁️ — chat export</h1>
    <p>${esc(conv.title)} · ${dateStr} · VidhyaSaathy — Learning, with you.</p>
  </header>
  ${body.join('\n')}
  <div class="footer">Exported from Saathy <span class="dot">☁</span> VidhyaSaathy · Learning, with you.</div>
</div>
</body>
</html>`;

  const safeTitle = conv.title.replace(/[^a-z0-9]+/gi, '-').slice(0, 40) || 'chat';
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="saathy-${safeTitle}.html"`,
    },
  });
}

/* ============ Saathy v.3 Founder Training Library: IndexedDB docs + YouTube knowledge ============ */
"use strict";
(function(){
const $ = window.$, $$ = window.$$, esc = window.esc;

/* ---------- IndexedDB ---------- */
const DB_NAME = "saathy_lib", STORE = "docs";
let _db = null;
function idb(){
  if(_db) return Promise.resolve(_db);
  return new Promise((res, rej)=>{
    const rq = indexedDB.open(DB_NAME, 1);
    rq.onupgradeneeded = () => { if(!rq.result.objectStoreNames.contains(STORE)) rq.result.createObjectStore(STORE, {keyPath:"id"}); };
    rq.onsuccess = ()=>{ _db = rq.result; res(_db); };
    rq.onerror = ()=>rej(rq.error);
  });
}
async function libAll(){
  const db = await idb();
  return new Promise((res)=>{
    const rq = db.transaction(STORE,"readonly").objectStore(STORE).getAll();
    rq.onsuccess = ()=>res(rq.result||[]);
    rq.onerror = ()=>res([]);
  });
}
async function libPut(doc){
  const db = await idb();
  return new Promise((res)=>{ const tx = db.transaction(STORE,"readwrite"); tx.objectStore(STORE).put(doc); tx.oncomplete = res; });
}
async function libDel(id){
  const db = await idb();
  return new Promise((res)=>{ const tx = db.transaction(STORE,"readwrite"); tx.objectStore(STORE).delete(id); tx.oncomplete = res; });
}

/* ---------- text extraction (honest about limits) ---------- */
let pdfjsState = 0; // 0 = not loaded, 1 = loading, 2 = ready, 3 = failed
function loadPdfJs(){
  if(pdfjsState === 2) return Promise.resolve(true);
  if(pdfjsState === 3) return Promise.resolve(false);
  if(pdfjsState === 1) return new Promise(r=>setTimeout(()=>r(loadPdfJs()), 300));
  pdfjsState = 1;
  return new Promise((res)=>{
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = ()=>{ try{ window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"; pdfjsState = 2; res(true);}catch(e){ pdfjsState = 3; res(false);} };
    s.onerror = ()=>{ pdfjsState = 3; res(false); };
    document.head.appendChild(s);
  });
}
async function extractText(file, onProg){
  const ext = (file.name.split(".").pop()||"").toLowerCase();
  if(ext === "txt" || ext === "md" || ext === "markdown") return file.text();
  if(ext === "pdf"){
    const ok = await loadPdfJs();
    if(!ok) throw new Error("pdf.js load nahi hua (offline?). Text PDFs need one online load; ya .txt/.md use karo.");
    const buf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({data:buf}).promise;
    const out = [];
    const cap = Math.min(pdf.numPages, 400);
    for(let i=1;i<=cap;i++){
      try{
        const page = await pdf.getPage(i);
        const tc = await page.getTextContent();
        out.push(tc.items.map(x=>x.str).join(" "));
        if(onProg && i % 10 === 0) onProg(i + "/" + cap);
      }catch(e){ /* skip page */ }
    }
    return out.join("\n\n");
  }
  if(ext === "docx"){
    // docx = zip of xml — pull word/document.xml without any library
    try{
      const buf = new Uint8Array(await file.arrayBuffer());
      // tiny store-only zip reader
      let pos = 0, entries = [];
      while(pos < buf.length - 4){
        if(buf[pos] === 0x50 && buf[pos+1] === 0x4b && (buf[pos+2] === 3 || buf[pos+2] === 1)){
          const method = buf[pos+8], csize = buf[pos+18] | (buf[pos+19]<<8) | (buf[pos+20]<<16) | (buf[pos+21]<<24);
          const nlen = buf[pos+26] | (buf[pos+27]<<8), elen = buf[pos+28] | (buf[pos+29]<<8);
          const name = new TextDecoder().decode(buf.slice(pos+30, pos+30+nlen));
          const start = pos + 30 + nlen + elen;
          if(name === "word/document.xml"){
            const comp = buf.slice(start, start + csize);
            if(method === 0) entries.push(new TextDecoder().decode(comp));
            else if(typeof DecompressionStream !== "undefined"){
              const ds = new DecompressionStream("deflate-raw");
              const stream = new Blob([comp]).stream().pipeThrough(ds);
              entries.push(await new Response(stream).text());
            }
            break;
          }
          pos = start + csize;
        } else pos++;
      }
      const xml = entries[0] || "";
      const text = xml.replace(/<\/w:p>/g,"\n").replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'");
      if(text.replace(/\s/g,"").length < 50) throw new Error("DOCX se text nahi mila");
      return text;
    }catch(e){ throw new Error("DOCX parse fail — .txt/.md paste karo"); }
  }
  throw new Error("Format supported nahi — PDF / DOCX / MD / TXT use karo (scanned PDFs ke liye app version OCR karta hai)");
}

/* ---------- chunking (same shape as the app server) ---------- */
function chunkText(text){
  const paras = text.replace(/\r/g,"\n").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim().split(/\n{2,}/);
  const chunks = []; let heading = "", cur = "";
  const flush = ()=>{ const b = cur.replace(/\n/g," ").trim(); if(b.length > 220) chunks.push({h: heading, x: b.slice(0,1600)}); cur = ""; };
  for(const p of paras){
    const line = p.trim();
    if(!line) continue;
    const words = line.split(/\s+/).length;
    const isHead = line.length <= 90 && !/[.,;]$/.test(line) && words <= 12 &&
      (/^(chapter|unit|part|section|lesson|topic|summary)\b/i.test(line) || /^\d+(\.\d+)?[).:]?\s+\S/.test(line) || (words>=2 && words<=8 && /^[A-Z]/.test(line)));
    if(isHead){ flush(); heading = line.slice(0,90); continue; }
    cur += (cur ? "\n\n" : "") + line;
    if(cur.length >= 1100) flush();
  }
  flush();
  return chunks;
}

/* ---------- actions ---------- */
async function addFiles(files, onProg){
  let ok = 0, lastErr = "";
  for(const f of Array.from(files).slice(0, 20)){
    try{
      if(f.size > 300*1024*1024) throw new Error("300MB se bada file");
      onProg("Reading " + f.name + "…");
      const text = await extractText(f, onProg);
      const chunks = chunkText(text);
      if(!chunks.length) throw new Error("Koi readable text nahi mila" + (/pdf/i.test(f.type||"") || /\.pdf$/i.test(f.name) ? " (scanned PDF? is version me OCR nahi — app version use karo)" : ""));
      await libPut({ id: "d" + Date.now() + Math.random().toString(36).slice(2,6), name: f.name, kind: (f.name.split(".").pop()||"").toLowerCase(), size: f.size, blob: f, chunks, at: Date.now(), status: "ready" });
      ok++;
    }catch(e){ lastErr = e.message || String(e); }
  }
  if(ok) window.toast(ok + " file" + (ok>1?"s":"")+" brain me add ho gayi ✓");
  if(lastErr && !ok) window.toast(lastErr.slice(0,120), 3400);
  renderLib();
}
async function addYoutube(){
  const inp = $("#libYtUrl");
  const url = (inp.value||"").trim();
  if(!url){ window.toast("Pehle YouTube link paste karo"); return; }
  const id = (/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,20})/.exec(url)||[])[1];
  if(!id){ window.toast("Ye YouTube link nahi lag raha"); return; }
  window.toast("Video link save kar raha hoon…");
  let title = "";
  try{
    const ctl = new AbortController(); setTimeout(()=>ctl.abort(), 4500);
    const r = await fetch("https://noembed.com/embed?url=https://www.youtube.com/watch?v=" + id, {signal:ctl.signal});
    const j = await r.json(); if(j && j.title) title = j.title;
  }catch(e){}
  await libPut({ id: "y" + Date.now(), name: title || ("YouTube · " + id), kind: "youtube", size: 0, blob: null, url: "https://www.youtube.com/watch?v=" + id, videoId: id, chunks: [], at: Date.now(), status: "ready" });
  inp.value = "";
  window.toast("Video knowledge saved ✓" + (title ? " — " + title.slice(0,60) : ""));
  renderLib();
}

/* ---------- render ---------- */
function fmtB(n){ return n >= 1048576 ? (n/1048576).toFixed(1)+" MB" : Math.max(1, Math.round(n/1024))+" KB"; }
async function renderLib(){
  const docs = (await libAll()).sort((a,b)=>b.at-a.at);
  const el = $("#libList");
  if(!el) return;
  if(!docs.length){ el.innerHTML = '<p style="color:var(--sub);font-size:12.5px;text-align:center;margin:6px 0">Library khaali hai — files daalo, Saathy unse padhega. Textbooks already built-in hain.</p>'; return; }
  el.innerHTML = docs.map(d=>{
    const ic = d.kind === "youtube"
      ? '<span class="ic" style="background:#FBE4E0"><svg viewBox="0 0 24 24"><path d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.9 4.8 12 4.8 12 4.8s-5.9 0-7.6.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.7.4 7.6.4 7.6.4s5.9 0 7.6-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 22 12a29 29 0 0 0-.4-4.8z"/><path d="M10 15.2V8.8L15.5 12z" fill="#fff"/></svg></span>'
      : '<span class="ic"><svg viewBox="0 0 24 24"><path d="M14 2H6.5A2.5 2.5 0 0 0 4 4.5v15A2.5 2.5 0 0 0 6.5 22h11a2.5 2.5 0 0 0 2.5-2.5V6z"/><path d="M14 2v4h6"/></svg></span>';
    const dl = d.kind === "youtube"
      ? '<button class="btn ghost sm" data-yt-open="' + esc(d.url||"") + '">Open</button>'
      : '<button class="btn ghost sm" data-lib-dl="' + esc(d.id) + '">Download</button>';
    return '<div class="setrow" style="cursor:default">' + ic +
      '<div><b style="font-size:13px">' + esc(d.name.slice(0,42)) + '</b><small>' +
      (d.kind === "youtube" ? "YouTube video knowledge" : (d.chunks.length + " sections learned · " + fmtB(d.size))) +
      '</small></div>' + dl +
      '<button class="btn ghost sm" data-lib-rm="' + esc(d.id) + '" style="color:var(--bad);margin-left:4px">✕</button></div>';
  }).join("");
}
document.addEventListener("click", e=>{
  const t = e.target;
  const dl = t.closest("[data-lib-dl]"); if(dl){
    libAll().then(docs=>{
      const d = docs.find(x=>x.id === dl.getAttribute("data-lib-dl"));
      if(d && d.blob){ const u = URL.createObjectURL(d.blob); const a = document.createElement("a"); a.href = u; a.download = d.name; a.click(); setTimeout(()=>URL.revokeObjectURL(u), 4000); window.toast("Downloading " + d.name); }
    });
    return;
  }
  const rm = t.closest("[data-lib-rm]"); if(rm){ libDel(rm.getAttribute("data-lib-rm")).then(()=>{ renderLib(); window.toast("Removed — Saathy ab ye use nahi karega"); }); return; }
  const yt = t.closest("[data-yt-open]"); if(yt){ window.open(yt.getAttribute("data-yt-open"), "_blank"); return; }
  const up = t.closest("#libAddBtn"); if(up){ $("#libFile").click(); return; }
});

/* ---------- retrieval: ground AI replies in the founder library ---------- */
const STOP = new Set(["the","a","an","of","is","are","what","how","why","do","in","on","for","to","and","or","me","my","explain","about","kya","hai","karo","batao","samjha"]);
window.libGrounding = function(query, limit){
  limit = limit || 3;
  const terms = String(query||"").toLowerCase().replace(/[^a-z0-9\u0900-\u097F\s]/g," ").split(/\s+/).filter(w=>w.length>2 && !STOP.has(w)).slice(0,6);
  if(!terms.length) return "";
  return libAll().then(docs=>{
    const hits = [];
    for(const d of docs){
      for(const c of (d.chunks||[])){
        const hay = ((c.h||"") + " " + c.x).toLowerCase();
        let score = 0;
        for(const t of terms){ const n = hay.split(t).length - 1; score += Math.min(n, 8); }
        if(score >= 3) hits.push({ doc: d.name, h: c.h, x: c.x, score });
      }
    }
    hits.sort((a,b)=>b.score-a.score);
    const top = hits.slice(0, limit);
    if(!top.length) return "";
    return "FOUNDER LIBRARY (extra trusted school material):\n" + top.map(h=>"--- [" + h.doc + (h.h ? " · " + h.h : "") + "] " + h.x).join("\n\n");
  });
};

/* ---------- youtube watch-plan card for a concept (honest, real search links) ---------- */
window.ytPlanArts = function(concept){
  const q = encodeURIComponent((concept.t || "concept") + " class " + (concept.cls || 9));
  const searches = [
    ["Physics Wallah", "https://www.youtube.com/results?search_query=" + q + "+physicswallah"],
    ["Khan Academy India", "https://www.youtube.com/results?search_query=" + q + "+khan+academy"],
    ["Magnet Brains", "https://www.youtube.com/results?search_query=" + q + "+magnet+brains"],
    ["Next Toppers", "https://www.youtube.com/results?search_query=" + q + "+next+toppers"]
  ];
  let html = '<div class="card" style="padding:13px;margin-top:8px"><p style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--warn);margin:0 0 6px">▶ Watch plan — ' + esc(concept.t) + '</p>' +
    '<p style="font-size:12px;color:var(--sub);margin:0 0 8px">Kisi bhi channel se video utha lo — plan sab pe chalega:</p><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">' +
    searches.map(([l,u])=>'<a class="pill w" style="text-decoration:none" target="_blank" rel="noopener" data-open-yt="' + u + '">' + esc(l) + ' ↗</a>').join("") +
    '</div><div style="font-size:12.5px;line-height:1.55;color:var(--ink)">' +
    [["First 10%","Sirf suno + likho: teacher kya introduce kar raha hai — wahi definition note down."],
     ["Next 30%","Har naya point pe pause karo → mujhe ek line me batao 'kya samjha' — main check karunga."],
     ["Middle 40%","Worked example ko APNI copy me dobara solve karo, video ke saath step-by-step."],
     ["Last 20%","Video roko, last example KHUD try karo, phir check — yahi asli revision hai."]]
    .map(([t,d],i)=>'<div style="display:flex;gap:8px;padding:5px 0"><span style="flex:none;width:18px;height:18px;border-radius:50%;background:var(--peach);color:#7a3b1d;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center">' + (i+1) + '</span><div><b style="font-size:11.5px;color:#7a3b1d">' + t + '</b><br>' + d + '</div></div>').join("") +
    '</div></div>';
  return html;
};

/* ---------- init ---------- */
window.renderLib = renderLib;
window.libAddFiles = addFiles;
window.libAddYoutube = addYoutube;
document.addEventListener("DOMContentLoaded", ()=>{ renderLib(); });
if(document.readyState !== "loading") renderLib();
})();

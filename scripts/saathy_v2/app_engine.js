/* ============ Saathy v.1 engine: matching, bands, teaching composer, Error DNA, artifacts ============ */
"use strict";
(function(){
const C = () => window.CONCEPTS;
const S = () => window.STATE();

/* ---------- markdown-lite ---------- */
function md(t){
  t = esc(t);
  t = t.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>");
  t = t.replace(/`([^`]+)`/g, '<span class="fx">$1</span>');
  t = t.replace(/\n- (.+)/g, "\n<li>$1</li>");
  if(t.includes("<li>")) t = t.replace(/(?:<li>.+?<\/li>\n?)+/g, m => "<ul>" + m + "</ul>");
  return t.split(/\n{2,}/).map(p => p.trim().startsWith("<ul>") ? p : "<p>" + p.replace(/\n/g,"<br>") + "</p>").join("");
}
window.MD = md;

/* ---------- concept matching ---------- */
const STOP = new Set(["the","a","an","of","is","are","what","how","why","explain","me","tell","about","kya","hai","mujhe","samjha","do","batao","se","ke","ka","ki","ko","and","or","in","on","to","for","with","like","please","pls","bhai","yaar","sir","madam","i","my","you","can","should","short","detail","detailed"]);
function tokens(q){ return q.toLowerCase().replace(/[^a-z0-9\u0900-\u097F\s]/g," ").split(/\s+/).filter(w=>w.length>1 && !STOP.has(w)); }
function findConcepts(q, n){
  n = n||1;
  const tw = tokens(q); if(!tw.length) return [];
  const scored = C().map(c=>{
    const hay = (c.t + " " + c.ch + " " + c.sub + " " + (c.key||[]).join(" ")).toLowerCase();
    let s = 0;
    tw.forEach(w=>{ if(c.t.toLowerCase().includes(w)) s += 6; if(c.ch.toLowerCase().includes(w)) s += 3; if(hay.includes(w)) s += 1; });
    if((c.id.startsWith("s10")&&S().cls===10)||(c.id.startsWith("s9")&&S().cls===9)) s += 2;
    return [s, c];
  }).sort((a,b)=>b[0]-a[0]).filter(x=>x[0]>2);
  return scored.slice(0, n).map(x=>x[1]);
}
window.findConcepts = findConcepts;

/* ---------- book sections search (grounding) ---------- */
function findSections(q, n){
  try{
    const kb = JSON.parse($("#KB_BOOKS").textContent);
    const tw = tokens(q); if(!tw.length) return [];
    const out = [];
    const books = ["science-exploration","understanding-society","ganita-manjari"];
    books.forEach(bk=>{
      (kb[bk]||[]).forEach(ch=>{
        if(S().cls && ch.g && ch.g !== S().cls && bk!=="understanding-society") return;
        ch.s.forEach(s=>{
          let sc = 0;
          const hay = (ch.t + " " + s.t + " " + s.x).toLowerCase();
          tw.forEach(w=>{ if(s.t.toLowerCase().includes(w)) sc += 4; if(hay.includes(w)) sc += 1; });
          if(sc > 2) out.push({sc, ch: ch.t, g: ch.g, id: s.id, t: s.t, x: s.x});
        });
      });
    });
    return out.sort((a,b)=>b.sc-a.sc).slice(0, n||2);
  }catch(e){ return []; }
}
window.findSections = findSections;

/* ---------- bands ---------- */
function bandOf(cid){
  const c = C().find(x=>x.id===cid); if(!c) return null;
  const direct = S().bands[cid]; if(direct) return direct.band;
  const chBands = Object.keys(S().bands).filter(k=>k.startsWith(c.sub.toLowerCase()+c.cls+"-")).map(k=>S().bands[k].band);
  if(chBands.length) return Math.round(chBands.reduce((a,b)=>a+b,0)/chBands.length);
  const m = S().mastery[cid]; if(m) return m.score>=75?4:m.score>=50?3:m.score>=25?2:1;
  return null; // unknown → diagnostic first
}
window.bandOf = bandOf;
const BAND_WORDS = {1:"Let's fix this together", 2:"Almost there — one more step", 3:"Good going — try this twist", 4:"Top form — challenge yourself"};
window.BAND_WORDS = BAND_WORDS;

function bandIntro(b, name){
  const w = BAND_WORDS[b];
  const tone = {1:"main sabse simple version se shuru karta hoon — zero jargon, sirf feel.",
                2:"basic version + ek solid example. Step by step, no rush.",
                3:"ab hum application level pe jaayenge — yahi exam maangta hai.",
                4:"crisp + board twist. Tumhe challenge chahiye, lecture nahi."}[b];
  return "**" + w + " (" + name + ")** — " + tone;
}

/* ---------- teaching composer (offline brain) ---------- */
function teachReply(c, opts){
  opts = opts || {};
  const b = bandOf(c.id) || (opts.forceBand) || null;
  if(!b) return diagnosticOffer(c);
  const parts = [];
  let text = bandIntro(b, c.t) + "\n\n";
  if(b===1) text += "*" + c.one + "*\n\n**Feel it first:** " + c.ana + "\n\n" + (c.key||[]).slice(0,4).map(k=>"- " + k).join("\n");
  else if(b===2) text += c.one + "\n\n" + (c.key||[]).map(k=>"- " + k).join("\n") + "\n\n**Analogy:** " + c.ana;
  else if(b===3) text += c.one + "\n\n" + (c.key||[]).slice(0,5).map(k=>"- " + k).join("\n") + ((c.mistakes&&c.mistakes.length)? "\n\n**Where students slip (exam alert):**\n- " + c.mistakes.join("\n- ") : "");
  else text += "**Core:** " + c.one + "\n\n" + ((c.fx&&c.fx.length)? "**Formulas:** " + c.fx.map(f=>"`" + f + "`").join(" · ") + "\n\n" : "") + "**Board twist:** " + ((c.mistakes&&c.mistakes[0]) || "Question tumhare confidence ko test karega — same concept, different skin.") + "\n\nNext up after this: " + nextConceptName(c);
  if(c.fx && c.fx.length && b<=2) text += "\n\nFormulas: " + c.fx.map(f=>"`" + f + "`").join(" · ");
  const arts = [];
  if(c.ex && (b>=2)) arts.push(artSteps(c));
  arts.push(artQuiz(c, b));
  if(c.fl && c.fl.length) arts.push(artFlash(c));
  if(c.vid) arts.push(artVideo(c));
  if(c.tl && (b>=1)) arts.push(artTimeline(c));
  return {text, arts};
}
function nextConceptName(c){
  const same = C().filter(x=>x.cls===c.cls && x.sub===c.sub && x.ch===c.ch);
  const i = same.findIndex(x=>x.id===c.id);
  return same[i+1] ? same[i+1].t : "quiz time — let's lock it in";
}
function diagnosticOffer(c){
  const text = "**" + c.t + "** pehle — ek baat. Main blind teaching nahi karta.\n\nPehle mujhe pata chale tum is chapter me kahan ho, phir explanation exactly us level ki milegi. 3 chhote sawaal, 30 second, marks ka kuch nahi — *this is not a test*, sirf routing.\n\nKheechu? Neeche wala button dabaao.";
  return {text, arts:[artDiag(c.ch, c.cls, c.sub)]};
}
window.teachReply = teachReply;

/* ---------- artifacts ---------- */
let artN = 0;
function artHead(icon, label){
  return '<div class="at"><svg viewBox="0 0 24 24">' + icon + '</svg>' + label + '</div>';
}
function artQuiz(c, band){
  const lvl = band>=4 ? 3 : band===1 ? 1 : 2;
  let items = (c.qz||[]).filter(q=>q.l<=lvl);
  if(!items.length) items = (c.qz||[]).slice(0,2);
  items = items.slice(0,2);
  if(!items.length) return "";
  const id = "aq" + (++artN);
  let h = '<div class="art" data-art="' + id + '">' + artHead('<path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="9.2"/>','Mini check — Pakka Meter on');
  items.forEach((q,qi)=>{
    h += '<div class="qq" style="font-size:14px;font-weight:700;color:var(--navy);margin:10px 0 6px">' + esc(q.q) + '</div>';
    h += '<div data-qi="' + qi + '">';
    q.o.forEach((o,oi)=>{ h += '<button class="opt" data-a="' + q.a + '" data-oi="' + oi + '" data-why="' + esc(q.why||"") + '" data-cid="' + c.id + '"><b>' + "ABCD"[oi] + '</b>' + esc(o) + '</button>'; });
    h += '</div>';
    h += '<div class="pakka" data-pk>' + ["Sure","Unsure","Guess"].map(p=>'<button class="pk" data-p="'+p+'">'+p+'</button>').join("") + '</div>';
    h += '<div class="dna hidden"></div>';
  });
  h += '</div>';
  return h;
}
function artSteps(c){
  if(!c.ex) return "";
  const id = "as" + (++artN);
  let h = '<div class="art">' + artHead('<path d="M4 6h16M4 12h16M4 18h10"/>','Worked example — tap to reveal');
  h += '<div style="font-weight:700;color:var(--navy);font-size:14.5px;margin-bottom:4px">' + esc(c.ex.q) + '</div><div class="steps">';
  c.ex.steps.forEach((s,i)=>{ h += '<div class="st rev" data-rev><span class="n">' + (i+1) + '</span><div><div class="q" style="font-size:13px;color:var(--sub)">Step ' + (i+1) + ' — tap</div><div class="a hidden">' + esc(s) + '</div></div></div>'; });
  h += '</div></div>';
  return h;
}
function artFlash(c){
  if(!c.fl || !c.fl.length) return "";
  let h = '<div class="art">' + artHead('<rect x="3" y="5" width="14" height="14" rx="3"/><path d="M7 3h11a3 3 0 0 1 3 3v11"/>','Flashcards — tap card to flip');
  c.fl.forEach(f=>{
    h += '<div class="rev" data-rev><div class="q">' + esc(f.f) + '</div><div class="a hidden">' + esc(f.b) + '</div></div>';
  });
  h += '</div>';
  return h;
}
function artVideo(c){
  const url = "https://www.youtube.com/results?search_query=" + encodeURIComponent(c.vid.q + " " + c.vid.ch);
  return '<div class="vid" data-open-yt="' + esc(url) + '"><span class="thumb"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg></span><div><b>' + esc(c.vid.ch) + ' — ' + esc(c.t) + '</b><small>Curated search, teacher-trusted channel · tap to open</small></div></div>';
}
function artTimeline(c){
  if(!c.tl) return "";
  let h = '<div class="art">' + artHead('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>','Timeline — ' + esc(c.t));
  h += '<div class="tl">';
  c.tl.forEach(e=>{ h += '<div class="ev"><b>' + esc(e.y) + '</b><span>' + esc(e.e) + '</span></div>'; });
  h += '</div></div>';
  return h;
}
function artGraph(c){
  if(c.id !== "s9-distance-displacement" && c.id !== "s9-motion-graphs") return "";
  const id = "ag" + (++artN);
  return '<div class="art">' + artHead('<path d="M4 19V5M4 19h16"/><path d="m7 15 4-6 4 3 5-8"/>','Motion lab — drag speed') +
    '<div style="display:flex;align-items:center;gap:10px;margin-top:6px"><span style="font-size:12px;color:var(--sub);font-weight:700">speed</span>' +
    '<input type="range" min="1" max="10" value="4" data-graph-range style="flex:1;accent-color:var(--navy)"><b data-graph-v style="color:var(--navy)">4 m/s</b></div>' +
    '<svg viewBox="0 0 220 120" style="width:100%;margin-top:8px"><rect x="26" y="8" width="188" height="96" fill="#fff" stroke="#D8DDE7" rx="8"/><line x1="26" y1="104" x2="214" y2="104" stroke="#637C96"/><line x1="26" y1="104" x2="26" y2="8" stroke="#637C96"/><line x1="26" y1="104" x2="214" y2="16" stroke="#214F78" stroke-width="2.5" data-graph-line/><text x="100" y="117" font-size="9" fill="#637C96">time →</text><text x="4" y="60" font-size="9" fill="#637C96" transform="rotate(-90 10 60)">distance →</text></svg></div>';
}
function artDiag(chName, cls, sub){
  return '<div class="art">' + artHead('<path d="M9 3h6M10 3v5.2L5.2 17A3 3 0 0 0 8 21.5h8a3 3 0 0 0 2.8-4.5L14 8.2V3"/><path d="M7.5 14h9"/>','Level check · 30 sec') +
    '<div style="font-size:13.5px;color:var(--ink);margin-bottom:10px">3 quick questions on <b>' + esc(chName) + '</b>. No marks, no judgement — output sirf routing hai.</div>' +
    '<button class="btn peach sm block" data-start-diag="' + esc(chName) + '" data-cls="' + (cls||S().cls) + '" data-sub="' + (sub||"Sci") + '">Start level check</button></div>';
}
window.ART = {quiz:artQuiz, steps:artSteps, flash:artFlash, video:artVideo, tl:artTimeline, graph:artGraph, diag:artDiag};

/* ---------- Error DNA (client-side, honest heuristics) ---------- */
function gradeAnswer(cid, correct, confidence, ms){
  const dna = (correct && confidence==="Guess") ? "guess"
    : (correct && ms < 5000) ? "fast-right"
    : (!correct && confidence==="Sure") ? "misconception"
    : (!correct && ms < 6000) ? "careless"
    : correct ? "solid" : "method";
  // mastery update: window of evidence
  const m = S().mastery[cid] || {score:30, seen:0, last:0};
  const weight = (correct ? (confidence==="Sure"?9:confidence==="Unsure"?7:2.5) : (confidence==="Sure"?-9:confidence==="Unsure"?-5:-2));
  m.score = Math.max(0, Math.min(100, m.score + weight));
  m.seen++; m.last = Date.now(); S().mastery[cid] = m;
  if(correct && confidence==="Sure" && m.score>=75) award("Concept crusher");
  const a = S().answers[cid] || {right:0, wrong:0, sureWrong:0};
  correct ? a.right++ : a.wrong++; if(!correct && confidence==="Sure") a.sureWrong++;
  S().answers[cid] = a; SAVE();
  const msg = {
    misconception:"**Sure + wrong = misconception.** Ye carelessness nahi hai — concept ka ek part galat set hua hai. Bridge nikala hai: basic se wapas, phir re-test.",
    careless:"**Careless slip.** Concept clear hai, speed ne dhokha diya. Sign/units pe ek extra second — bas itna.",
    method:"**Method error.** Approach saahi tha, execution me chhota break. Worked example dobara dekho.",
    guess:"**Guess pakda gaya.** Sahi hua bhi to luck hai — kal isi ka different version aayega. Honest raho, Pakka Meter jhooth nahi bolta.",
    "fast-right":"Right — but ~too fast. Ek baar khud se *kyun* bolo, tab solid hoga.",
    solid:"**Solid.** Confidence + correctness — isi tarah aage badho."
  }[dna];
  return {dna, msg};
}
window.gradeAnswer = gradeAnswer;

/* ---------- plan maker ---------- */
function makePlan(q){
  const days = (q.match(/(\d+)\s*(day|din)/i)||[])[1];
  const mins = (q.match(/(\d+)\s*(min|minute)/i)||[])[1];
  const D = Math.min(Math.max(+(days||7),1),30), M = Math.min(Math.max(+(mins||30),10),180);
  const weak = C().filter(c=>S().cls===c.cls).map(c=>({c, s:(S().mastery[c.id]||{score:50}).score})).sort((a,b)=>a.s-b.s).slice(0, Math.min(D+2, 6));
  if(!weak.length) weak.push({c:C().find(x=>x.cls===S().cls), s:40});
  let text = "**Plan ban gaya — " + D + " din, ~" + M + " min/night.** Honest promise: tumhe suddenly-perfect student banne ka jhooth nahi. Chhote steps, roz evidence.\n";
  const per = Math.max(1, Math.floor(weak.length ? Math.ceil(D/weak.length) : 1));
  weak.forEach((w,i)=>{
    text += "\n**Day " + (i*per+1) + (per>1? "-" + Math.min((i+1)*per, D) : "") + ":** " + w.c.t + " (" + w.c.ch + ") — " + (w.s<50 ? "repair mode: level check → simplest explanation → 5 L1 questions" : w.s<75 ? "application mode: concept → 8 mixed questions → 1 board twist" : "top-form: board set timed 10 min + next chapter preview") ;
  });
  text += "\n\n**Every night's last 5 min:** flashcards of whatever faded (revision radar ka kaam). Miss a day? Aana chupchaap, wahi se — no guilt screens here.";
  const arts = [artFlash(weak[0].c)];
  return {text, arts};
}
window.makePlan = makePlan;

/* ---------- product brain answers ---------- */
function productAnswer(q){
  const lq = q.toLowerCase();
  if(/which model|what model|kaunsa model|are you (gpt|chatgpt|gemini|groq|claude|deepseek|llm)|tum kaunse model|underlying model|powered by/.test(lq))
    return "I am **Saathy v.1**, trained on NCERT modules and books. That's the whole introduction you need — na main kisi aur ke naam pe chalta hoon, na koi background model disclose karta. I'm your study companion, period.";
  // only treat as product question when distinctive product phrases appear
  const distinct = ["vidhyasaathy","master file","pakka meter","error dna","band routing","four bands","0-25","75-100","privacy wall","next action","snapdoubt","darr ka map","ratta","dushman","boss level","flywheel","row-level","activation code","reteach","heatmap","learning style","11-step","build plan","readiness checklist","quality gate","moat","permanent cut","leaderboard","four roles","fragile","steady","top form","almost there","let's fix this"];
  const hits = distinct.filter(d=>lq.includes(d));
  const isProductQ = hits.length >= 1;
  if(!isProductQ) return null;
  let best = null, bs = 0;
  window.PRODUCT_FACTS.forEach(([k,v])=>{
    const kw = k.toLowerCase().split(/\s+/);
    let s = 0;
    for(const w of tokens(lq)){ if(k.toLowerCase().includes(w)) s += 4; for(const kk of kw){ if(kk.startsWith(w) && w.length>3){ s += 3; break; } } }
    if(hits.length) s += 3;
    if(s > bs){ bs = s; best = v; }
  });
  if(bs >= 7 && best) return "**" + best + "**\n\n(Ye VidhyaSaathy ke Product Master File se hai — jo rule app ke andar chal raha hai, wahi rule mujhe andar se drive karta hai.)";
  return null;
}
window.productAnswer = productAnswer;

/* ---------- general fallbacks ---------- */
function fallback(q){
  const lq = q.toLowerCase();
  const secs = findSections(q, 2);
  if(secs.length){
    const c = findConcepts(q, 1)[0];
    let text = "Book ke andar se nikala — **" + secs[0].t + "** (" + secs[0].ch + "):\n\n*" + secs[0].x.slice(0,420) + (secs[0].x.length>420?"…":"") + "*";
    if(c){ const r = teachReply(c); return {text: text + "\n\nAb main ise tumhare level pe pack karke deta hoon:\n\n" + r.text, arts: r.arts}; }
    return {text, arts: []};
  }
  if(/(sad|stress|darr|dar|tired|thak|give up|nahi hota|boring|depress|anxiety)/.test(lq)){
    return {text:"Sun. Stuck hona weakness nahi hai — data hai, aur data fix hota hai. Frustration radar ne mujhe bataya tone soft rakhiye, step chhota kijiye.\n\nTo chalo: ek 2-minute warm-up, ek easy concept, ek chhoti jeet. Bas. Aaj ke liye itna kaafi hai.", arts:[artFlash(C().find(x=>x.cls===S().cls) || C()[0])]};
  }
  if(/(hi|hello|hey|namaste|yo|salam|kaise ho|sup)/.test(lq) && lq.length<24){
    return {text:"Main hoon — Sarthi baadal, tumhara study saathi. Bolo: aaj kaunsa concept ya chapter? Ya seedha bolo **quiz me on Motion** — main level check karke shuru kar dunga.", arts:[]};
  }
  if(/(thank|shukriya|dhanyav|nice|great|awesome|love)/.test(lq)){
    return {text:"Bas yahi feel ke liye to bana hoon. Ab ek kaam karo — kal ka ek concept bol do, main Tonight's plan bana dunga. Small steps, big progress.", arts:[]};
  }
  return {text:"Honestly? Is sawaal pe mere paas exact answer nahi hai — aur main galat-confident banke time waste nahi karunga (*the honest I-don't-know rule*).\n\nPar ye kar sakte hain: chapter ka naam bolo (Motion, Cell, Trigonometry, Monsoon…), ya YouTube link paste karo — uspe main full power hoon.", arts:[]};
}
window.fallback = fallback;
})();

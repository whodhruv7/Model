/* ============ Saathy v.1 views: chat, home, learn, practice runners ============ */
"use strict";
(function(){
const $ = window.$, $$ = window.$$, esc = window.esc;
const state = () => window.STATE(), SAVE = window.SAVE;

/* ================= CHAT ================= */
let busy = false;
function renderMsgs(){
  const box = $("#msgs"); const msgs = window.curMsgs();
  if(!msgs.length){
    box.innerHTML = '<div style="text-align:center;padding:34px 12px 10px"><img src="' + window.ASSETS.pose_happy + '" alt="" style="width:104px" class="mascot-float" onerror="this.src=window.ASSETS.pose_idle"><h2 style="margin:10px 0 4px;color:var(--navy);font-size:19px">Bolo, aaj kya seekhna hai?</h2><p style="color:var(--sub);font-size:13.5px;margin:0 0 14px">Doubt poochho, chapter bolo, ya quiz maango.<br>Level check karke main exactly tumhare level pe bataunga.</p></div>';
    return;
  }
  box.innerHTML = msgs.map((m,i)=>bubbleHTML(m, i)).join("");
  requestAnimationFrame(()=>{ box.scrollTop = box.scrollHeight; });
}
function bubbleHTML(m, i){
  if(m.who === "me") return '<div class="m me"><div class="bub">' + esc(m.text) + '</div></div>';
  return '<div class="m ai"><img class="av" src="' + window.ASSETS["pose_" + (m.pose||"idle")] + '" alt=""><div class="bub">' + window.MD(m.text) + (m.arts||[]).join("") + '</div></div>';
}
function pushMsg(m){ window.curMsgs().push(m); SAVE(); renderMsgs(); }

const SUGGEST = ["Explain acceleration (I'm weak at maths)","Newton's third law se samjha","Quiz me on Force","Exam in 5 days — make my plan","Photosynthesis ka pura game","Trigonometry fast revision"];
function renderChips(){
  $("#chipsRow").innerHTML = SUGGEST.map(s=>'<button class="qchip" data-say="' + esc(s) + '">' + esc(s) + '</button>').join("");
}

async function send(text){
  text = (text||$("#chatInput").value).trim();
  if(!text || busy) return;
  window.goTab("chat");
  $("#chatInput").value = ""; $("#chatInput").style.height = "auto";
  window.touchStreak();
  pushMsg({who:"me", text});
  busy = true; setPose("think");
  const tEl = document.createElement("div");
  tEl.className = "m ai"; tEl.innerHTML = '<img class="av" src="' + window.ASSETS.pose_thinking + '"><div class="bub"><span class="typing"><i></i><i></i><i></i></span></div>';
  $("#msgs").appendChild(tEl); $("#msgs").scrollTop = $("#msgs").scrollHeight;
  let streamed = "";
  const upd = d => { streamed += d; tEl.querySelector(".bub").innerHTML = window.MD(streamed) + '<span class="typing"><i></i><i></i><i></i></span>'; $("#msgs").scrollTop = $("#msgs").scrollHeight; };
  try{
    const res = await window.ask(text, upd);
    window.curMsgs().pop(); // placeholder already saved? we pushed user text; ensure assistant fresh
    window.curMsgs().push({who:"ai", text: res.text, arts: res.arts||[], pose: res.arts && res.arts.length ? "explain" : "happy"});
    SAVE(); renderMsgs();
    if(/misconception|Guess pakda/.test(res.text||"")) setPose("wink"); else setPose("happy");
    setTimeout(()=>setPose("idle"), 2200);
  }catch(e){
    window.curMsgs().push({who:"ai", text:"Arre — kuch gadbad ho gayi mere side pe. Dobara try karo? (Honest rule: fail hone pe fake answer nahi banata.)", arts:[]});
    SAVE(); renderMsgs(); setPose("wink"); setTimeout(()=>setPose("idle"),1600);
  }
  busy = false;
}
window.send = send;

$("#sendBtn").addEventListener("click", ()=>send());
$("#chatInput").addEventListener("keydown", e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); }});
$("#chatInput").addEventListener("input", function(){ this.style.height="auto"; this.style.height = Math.min(this.scrollHeight, 110) + "px"; });

/* ================= HOME ================= */
function renderHome(){
  const s = state();
  // next action logic (master file order: unfinished > due revision > new content > game)
  let na = null;
  const dueRev = Object.entries(s.mastery).filter(([k,m])=>Date.now()-(m.last||0) > 172800000 && m.score>0).sort((a,b)=>(a[1].last||0)-(b[1].last||0))[0];
  const bandless = window.CONCEPTS.find(c=>c.cls===s.cls && !s.bands[c.id]);
  const weak = Object.entries(s.mastery).filter(([k,m])=>m.score<50).sort((a,b)=>a[1].score-b[1].score)[0];
  if(dueRev){ const c = window.CONCEPTS.find(x=>x.id===dueRev[0]);
    na = {tag:"Revision radar", t:"2-min warm-up: " + (c?c.t:"flashcards"), sub:"Kuch concepts dheere dheere fade ho rahe hain — aaj hi wapas pakdo.", meta:"~2 minutes", act:()=>{ window.goTab("practice"); window.startFlash(c); } };
  } else if(weak){ const c = window.CONCEPTS.find(x=>x.id===weak[0]);
    na = {tag:"Let's fix this together", t:c?c.t:"Weak concept", sub:"Ispe score thoda kam hai — bridge path ready hai, ekdum basic se.", meta:"~15 minutes", act:()=>{ window.goTab("chat"); window.send("Explain " + (c?c.t:"my weak concept")); } };
  } else if(bandless){
    na = {tag:"Level check", t:bandless.t, sub:"3 sawaal, 30 second — uske baad teaching exactly tumhare level pe.", meta:"~1 minute", act:()=>{ window.goTab("practice"); window.startDiag(bandless.ch, bandless.cls, bandless.sub); } };
  } else {
    na = {tag:"Keep the streak", t:"MCQ Rush — 60 seconds", sub:"Concepts solid hain. Ab speed test: personal best todna hai?", meta:"1 minute sprint", act:()=>{ window.goTab("practice"); window.startRush(); } };
  }
  $("#naTag").textContent = na.tag; $("#naTitle").textContent = na.t; $("#naSub").textContent = na.sub; $("#naMeta").textContent = na.meta;
  $("#naGo").onclick = na.act;
  // quick chips
  const chips = ["Quiz me on Motion","Flashcards: Force","Watch: Cell video","MCQ Rush"];
  $("#quickChips").innerHTML = chips.map(c=>'<button class="qchip" data-hact="' + esc(c) + '">' + esc(c) + '</button>').join("");
  // stats
  const touched = Object.keys(s.mastery).length;
  const scores = Object.values(s.mastery).map(m=>m.score);
  $("#stTouched").textContent = touched;
  $("#stMastery").textContent = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) + "%" : "—";
  renderBadges();
}

/* ================= LEARN ================= */
let learnFilter = "all";
function renderLearn(){
  const s = state();
  const subs = [["all","All"],["Sci","Science"],["Math","Maths"],["SST","SST"]];
  $("#subjRow").innerHTML = subs.map(([k,l])=>'<button class="qchip" data-subj="' + k + '" style="' + (learnFilter===k?"background:var(--navy);color:#fff;border-color:var(--navy)":"") + '">' + l + ' · Cl ' + (k==="all"?"9-10":(window.CONCEPTS.find(c=>c.sub===k&&c.cls===s.cls)?s.cls:"9/10")) + '</button>').join("");
  const list = window.CONCEPTS.filter(c=>(learnFilter==="all"||c.sub===learnFilter) && (learnFilter==="all" ? true : c.cls===s.cls));
  $("#conceptPane").classList.add("hidden");
  $("#chapterList").innerHTML = list.map((c,i)=>{
    const b = s.bands[c.id] ? window.BAND_WORDS[s.bands[c.id].band] : null;
    const m = s.mastery[c.id];
    return '<button class="chrow" data-cid="' + c.id + '"><span class="num' + (c.sub==="SST"?" p":"") + '">' + (c.sub==="Sci"?"S":c.sub==="Math"?"M":"SS") + '</span><div><b>' + esc(c.t) + '</b><small>' + esc(c.ch) + ' · Class ' + c.cls + (m?" · mastery " + m.score + "%":"") + '</small></div>' + (b?'<span class="bdg">' + esc(b) + '</span>':'') + '</button>';
  }).join("");
  renderVideos();
}
function renderVideos(){
  const s = state();
  const favs = {9:[["Magnet Brains — Class 9 full Science","class 9 science full course"],["Physics Wallah — Class 9 Physics","class 9 physics physicswallah"],["Dear Sir — Class 9 Maths tricks","class 9 maths tricks dearsir"],["Bhai Ki Padhai — Economics","class 9 economics bhai ki padhai"]],10:[["Physics Wallah — Class 10 Physics","class 10 physics physicswallah"],["Magnet Brains — Class 10 Chemistry","class 10 chemistry magnet brains"],["Dear Sir — Class 10 Maths","class 10 maths dearsir"],["Bhai Ki Padhai — SST Class 10","class 10 sst bhai ki padhai"]]};
  $("#videoList").innerHTML = (favs[s.cls]||[]).map(([t,q])=>'<div class="vid" data-open-yt="https://www.youtube.com/results?search_query=' + encodeURIComponent(q) + '"><span class="thumb"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg></span><div><b>' + esc(t) + '</b><small>Search on YouTube · curated channel</small></div></div>').join("");
}
function openConcept(cid){
  const c = window.CONCEPTS.find(x=>x.id===cid); if(!c) return;
  $("#chapterList").classList.add("hidden"); $("#subjRow").classList.add("hidden");
  $("#conceptPane").classList.remove("hidden");
  $("#cpTitle").textContent = c.t;
  $("#cpMeta").textContent = c.ch + " · Class " + c.cls;
  const b = window.bandOf(c.id);
  const dEl = $("#cpDepth");
  dEl.textContent = b ? window.BAND_WORDS[b] : "Level check first";
  dEl.className = "depth-tag d" + (b||2);
  let body = '<div class="card concept">' + window.MD(c.one) + (c.fx&&c.fx.length ? '<p style="margin-top:8px">' + c.fx.map(f=>'<span class="fx">' + esc(f) + '</span>').join(" · ") + '</p>' : "") + '</div>';
  body += '<div class="sec-t">The feel of it</div><div class="card concept" style="font-size:14.5px">' + esc(c.ana) + '</div>';
  body += '<div class="sec-t">Key points</div><div class="card concept"><ul style="margin:0;padding-left:18px">' + (c.key||[]).map(k=>'<li style="margin:4px 0;font-size:14px">' + esc(k) + '</li>').join("") + '</ul></div>';
  if(c.mistakes) body += '<div class="sec-t">Where students slip</div><div class="card concept" style="border-color:#F2CDBC;background:#FDF7F2">' + c.mistakes.map(m=>'<div style="margin:4px 0;font-size:13.5px">⚠ ' + esc(m) + '</div>').join("") + '</div>';
  $("#cpBody").innerHTML = body;
  // chat deep-dive (band-adaptive with artifacts)
  const r = window.teachReply(c);
  $("#cpBody").insertAdjacentHTML("beforeend", '<div class="sec-t">Saathy teaches — your level</div><div class="card concept">' + window.MD(r.text) + r.arts.join("") + '</div>');
  window.renderPracticeAssets($("#cpBody"));
  window.touchStreak();
}
$("#cpBack").addEventListener("click", ()=>{ $("#conceptPane").classList.add("hidden"); $("#chapterList").classList.remove("hidden"); $("#subjRow").classList.remove("hidden"); });
$("#learnSeg").addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return;
  $$("#learnSeg button").forEach(x=>x.classList.toggle("on", x===b));
  $("#ltChapters").classList.toggle("hidden", b.dataset.lt!=="chapters");
  $("#ltVideos").classList.toggle("hidden", b.dataset.lt!=="videos");
});
$("#ytGo").addEventListener("click", async ()=>{
  const u = $("#ytInput").value.trim(); if(!u) return;
  $("#ytInput").value = "";
  window.goTab("chat");
  window.send(u);
});

/* ================= PRACTICE ================= */
function renderPractice(){ /* home is static; runners open on demand */ }
const RS = () => $("#runnerSheet"), RB = () => $("#runnerBody");
function openRunner(html){ RB().innerHTML = html; RS().classList.add("on"); $("#scrim").classList.add("on"); }
window.closeRunner = ()=>{ RS().classList.remove("on"); if(!$("#settingsSheet").classList.contains("on")) $("#scrim").classList.remove("on"); };

/* ---- diagnostic ---- */
window.startDiag = function(chName, cls, sub){
  cls = cls || state().cls; sub = sub || "Sci";
  const pool = window.CONCEPTS.filter(c=>c.cls===cls && c.sub===sub && c.ch===chName && (c.qz||c.cps));
  let qs = [];
  pool.forEach(c=>{ if(c.qz) qs.push({cid:c.id, t:c.t, ...c.qz[0]}); });
  qs = qs.sort(()=>Math.random()-.5).slice(0,3);
  if(qs.length < 3){ window.CONCEPTS.filter(c=>c.cls===cls && c.sub===sub && c.qz).forEach(c=>{ if(qs.length<3 && !qs.find(q=>q.cid===c.id)) qs.push({cid:c.id, t:c.t, ...c.qz[0]}); }); }
  if(!qs.length){ window.toast("Is chapter ke questions jald aa rahe hain"); return; }
  const st = {i:0, right:0, qs, chName, cls, sub};
  window.__diag = st;
  renderDiagQ();
};
function renderDiagQ(){
  const st = window.__diag; const q = st.qs[st.i];
  openRunner('<div class="lvl">Level check · not a test</div><div class="prog"><i style="width:' + ((st.i)/st.qs.length*100) + '%"></i></div>' +
    '<div class="qwrap"><div class="qq">' + esc(q.q) + '</div>' +
    q.o.map((o,oi)=>'<button class="opt" data-do="' + oi + '"><b>' + "ABCD"[oi] + '</b>' + esc(o) + '</button>').join("") +
    '</div><p style="text-align:center;color:var(--sub);font-size:12px;margin-top:12px">' + (st.i+1) + ' of ' + st.qs.length + ' · bas routing ke liye, marks nahi</p>');
}
function diagPick(oi){
  const st = window.__diag; const q = st.qs[st.i];
  if(oi === q.a) st.right++;
  st.i++;
  if(st.i < st.qs.length) renderDiagQ();
  else finishDiag();
}
function finishDiag(){
  const st = window.__diag;
  const pct = Math.round(st.right/st.qs.length*100);
  const band = pct>=75?4:pct>=50?3:pct>=25?2:1;
  st.qs.forEach(q=>{ state().bands[q.cid] = {band, pct, at:Date.now()}; const m = state().mastery[q.cid] || {score:0,seen:0,last:0}; m.score = Math.max(m.score, pct); m.seen++; m.last=Date.now(); state().mastery[q.cid] = m; });
  SAVE();
  window.award("First steps");
  const w = window.BAND_WORDS[band];
  const tone = {1:"Simplest explanation, chhote steps, har jeet celebrate — banega.",2:"Guided examples + checkpoints. Ek-ek idea pakka karenge.",3:"Application twist aur 'where students slip' wale spots dikhayenge.",4:"Crisp notes + board-format challenges. Boredom allowed nahi."}[band];
  openRunner('<div style="text-align:center;padding:8px 0"><img src="' + window.ASSETS["pose_" + (band>=3?"cheering":"explaining")] + '" style="width:110px" class="mascot-float"><h2 style="color:var(--navy);margin:8px 0 2px">' + esc(st.chName) + '</h2><div class="pill ' + (band>=3?"g":"w") + '">' + w + '</div>' +
    '<p style="color:var(--sub);font-size:13.5px;margin:12px 0">' + tone + '</p>' +
    '<button class="btn block" id="diagTeach">Start teaching, my level</button></div>');
  $("#diagTeach").addEventListener("click", ()=>{
    window.closeRunner(); window.goTab("chat");
    window.send("Teach me " + st.chName);
  });
  renderLearn(); renderHome();
}

/* ---- adaptive quiz runner ---- */
window.startQuiz = function(cid){
  const s = state();
  let pool;
  if(cid) pool = window.CONCEPTS.filter(c=>c.id===cid);
  else { const subC = window.CONCEPTS.filter(c=>c.cls===s.cls && (c.qz||[]).length); pool = subC.sort(()=>Math.random()-.5).slice(0,8); }
  let items = [];
  pool.forEach(c=>{ (c.qz||[]).forEach(q=>items.push({cid:c.id, t:c.t, ...q})); });
  items = items.sort(()=>Math.random()-.5).slice(0,8);
  if(!items.length){ window.toast("Quiz jald aa raha hai is topic pe"); return; }
  window.__quiz = {items, i:0, ladder:2, streakOk:0, streakNo:0, log:[], t0:Date.now()};
  renderQuizQ();
};
function renderQuizQ(){
  const qz = window.__quiz; const q = qz.items[qz.i];
  openRunner('<div style="display:flex;align-items:center;gap:8px"><span class="lvl">L' + qz.ladder + ' · ' + (qz.ladder===1?"basic":qz.ladder===2?"medium":"application") + '</span><span style="margin-left:auto;font-size:12px;color:var(--sub);font-weight:700">' + (qz.i+1) + '/' + qz.items.length + '</span></div>' +
    '<div class="prog"><i style="width:' + (qz.i/qz.items.length*100) + '%"></i></div>' +
    '<div class="qwrap"><div class="qq">' + esc(q.q) + '</div>' +
    q.o.map((o,oi)=>'<button class="opt" data-qo="' + oi + '" data-ms="' + (Date.now()-qz.t0) + '"><b>' + "ABCD"[oi] + '</b>' + esc(o) + '</button>').join("") +
    '<div class="pakka" data-pk2>' + ["Sure","Unsure","Guess"].map(p=>'<button class="pk" data-p2="'+p+'">'+p+'</button>').join("") + '</div>' +
    '<div class="dna" id="quizDna" style="min-height:26px;color:var(--sub);font-size:12px;margin-top:6px"></div>' +
    '<div class="hidden" id="quizWhy"></div>' +
    '<button class="btn block hidden" id="quizNext" style="margin-top:10px">Next</button></div>');
  window.__quiz.t0 = Date.now();
}
let qzConf = null;
function quizPickOpt(oi, ms){
  const qz = window.__quiz; const q = qz.items[qz.i];
  const correct = oi === q.a;
  $$(".opt").forEach((b,bi)=>{ b.disabled = true; if(bi===q.a) b.classList.add("ok"); else if(bi===oi && !correct) b.classList.add("no"); });
  const g = window.gradeAnswer(q.cid, correct, qzConf||"Unsure", ms);
  qz.log.push({cid:q.cid, correct, conf:qzConf||"Unsure"});
  if(correct){ qz.streakOk++; qz.streakNo = 0; if(qz.streakOk>=3 && qz.ladder<3){ qz.ladder++; qz.streakOk = 0; } }
  else { qz.streakNo++; qz.streakOk = 0; if(qz.streakNo>=2 && qz.ladder>1){ qz.ladder = 1; window.toast("Bridge mode — wapas basic se, help ke saath"); } }
  $("#quizDna").innerHTML = window.MD(g.msg);
  $("#quizWhy").innerHTML = '<div class="why">' + esc(q.why||"") + '</div>';
  $("#quizWhy").classList.remove("hidden");
  $("#quizNext").classList.remove("hidden");
}
function quizNext(){
  const qz = window.__quiz; qz.i++; qzConf = null; qz.t0 = Date.now();
  if(qz.i < qz.items.length) renderQuizQ(); else quizEnd();
}
function quizEnd(){
  const qz = window.__quiz;
  const right = qz.log.filter(l=>l.correct).length;
  const pct = Math.round(right/qz.log.length*100);
  const pos = qz.log.filter(l=>l.conf==="Sure"&&!l.correct);
  let dnaLine = "";
  if(pos.length) dnaLine = '<div class="why"><b>' + pos.length + ' "Sure but wrong"</b> — ye misconception hai, carelessness nahi. Kal inke re-queue questions aayenge, alag skin me. Pakka Meter ne kaam kar diya.</div>';
  const gues = qz.log.filter(l=>l.conf==="Guess").length;
  if(gues) dnaLine += '<div class="why" style="margin-top:8px">' + gues + ' Guess — honest raho, luck discount ho gaya. Kal different version aayega.</div>';
  if(pct>=80) window.award("Concept crusher");
  openRunner('<div style="text-align:center;padding:10px 0"><img src="' + window.ASSETS["pose_" + (pct>=60?"cheering":"explaining")] + '" style="width:110px" class="mascot-float"><div class="score-big">' + right + '/' + qz.log.length + '</div><p style="color:var(--sub);font-size:13.5px;margin:4px 0 10px">≥60% = session complete. ' + (pct>=60?"Ho gaya. Below tha to bridge path hota — no fail language here.":"Isliye ab bridge path — ekdum basic se.") + '</p>' + dnaLine +
    '<button class="btn block" id="quizAgain">Ek aur round</button><button class="btn ghost block" id="quizDone" style="margin-top:8px">Done</button></div>');
  $("#quizAgain").addEventListener("click", ()=>window.startQuiz());
  $("#quizDone").addEventListener("click", ()=>{ window.closeRunner(); window.renderHome(); });
  renderHome();
}

/* ---- flashcards ---- */
window.startFlash = function(c){
  const s = state();
  let cards = [];
  if(c && c.fl) cards = c.fl.map(f=>({cid:c.id, ...f}));
  else {
    window.CONCEPTS.filter(x=>x.cls===s.cls && x.fl).sort(()=>Math.random()-.5).slice(0,5).forEach(x=>x.fl.forEach(f=>cards.push({cid:x.id, t:x.t, ...f})));
  }
  if(!cards.length){ window.toast("Cards jald aa rahe hain"); return; }
  window.__fc = {cards, i:0, knew:0, almost:0, forgot:0};
  renderFlash();
};
function renderFlash(){
  const fc = window.__fc; const c = fc.cards[fc.i];
  openRunner('<div style="display:flex;align-items:center;gap:8px"><span class="lvl">Rapid revision</span><span style="margin-left:auto;font-size:12px;color:var(--sub);font-weight:700">' + (fc.i+1) + '/' + fc.cards.length + '</span></div>' +
    '<div class="fc" id="fcCard"><div class="inner"><div class="face"><div class="lab">Front · tap to flip</div><div class="txt">' + esc(c.f) + '</div>' + (c.t?'<small style="color:var(--sub);margin-top:8px;font-size:11px">'+esc(c.t)+'</small>':'') + '</div><div class="face back"><div class="lab">Back</div><div class="txt" style="font-size:14.5px">' + esc(c.b) + '</div></div></div></div>' +
    '<div class="rate"><button class="k" data-rate="k">Knew it</button><button class="a" data-rate="a">Almost</button><button class="f" data-rate="f">Forgot</button></div>');
}
function flashFlip(){ $("#fcCard").classList.toggle("flip"); }
function flashRate(r){
  const fc = window.__fc; const c = fc.cards[fc.i];
  const m = state().mastery[c.cid] || {score:40, seen:0, last:0};
  m.score = Math.max(0, Math.min(100, m.score + (r==="k"?4:r==="a"?1:-5)));
  m.seen++; m.last = Date.now(); state().mastery[c.cid] = m; SAVE();
  if(r==="k") fc.knew++; else if(r==="a") fc.almost++; else fc.forgot++;
  fc.i++;
  if(fc.i < fc.cards.length) renderFlash();
  else openRunner('<div style="text-align:center;padding:12px 0"><div class="score-big">' + fc.knew + '</div><p style="color:var(--sub)">knew it · ' + fc.almost + ' almost · ' + fc.forgot + ' forgot</p><p style="font-size:13.5px;color:var(--ink);margin:10px 4px">' + (fc.forgot>0 ? "Jo fade hua, wo kal Next-Action me wahi aayega — forgetting curve ka hisaab rakha hai maine." : "Sab solid! Revision radar aaj shaant.") + '</p><button class="btn block" id="fcDone">Done</button></div>'), $("#fcDone").addEventListener("click", ()=>{ window.closeRunner(); renderHome(); });
  renderHome();
}

/* ---- MCQ Rush game ---- */
window.startRush = function(){
  const s = state();
  const items = [];
  window.CONCEPTS.filter(c=>c.cls===s.cls && c.qz).forEach(c=>c.qz.forEach(q=>items.push({cid:c.id, ...q})));
  if(items.length < 4){ window.toast("Rush ke liye questions kam pad rahe"); return; }
  window.__rush = {items: items.sort(()=>Math.random()-.5).slice(0,40), i:0, score:0, left:60};
  openRunner('<div class="timer" id="rushT">60</div><div class="lvl" style="text-align:center;display:block;margin:4px auto 10px">Best: ' + (s.game.best||0) + '</div><div id="rushQ"></div>');
  window.__rush.t = setInterval(()=>{
    window.__rush.left--; const el = $("#rushT"); if(el) el.textContent = window.__rush.left;
    if(window.__rush.left <= 0) rushEnd();
  }, 1000);
  rushQ();
};
function rushQ(){
  const r = window.__rush; const q = r.items[r.i % r.items.length];
  $("#rushQ").innerHTML = '<div class="qwrap"><div class="qq" style="font-size:14.5px">' + esc(q.q) + '</div>' + q.o.map((o,oi)=>'<button class="opt" data-ro="' + oi + '"><b>' + "ABCD"[oi] + '</b>' + esc(o) + '</button>').join("") + '</div>';
}
function rushPick(oi){
  const r = window.__rush; const q = r.items[r.i % r.items.length];
  if(oi === q.a){ r.score += 10; window.toast("+10 streak!") }
  else { r.score = Math.max(0, r.score-4) }
  r.i++; rushQ();
}
function rushEnd(){
  const r = window.__rush; clearInterval(r.t);
  const s = state();
  const best = Math.max(s.game.best||0, r.score); const isPB = r.score > (s.game.best||0);
  s.game.best = best; SAVE();
  if(isPB && r.score>0) window.award("Boss level");
  openRunner('<div style="text-align:center;padding:14px 0"><div class="score-big">' + r.score + '</div><div class="pill ' + (isPB?"g":"n") + '" style="margin-top:6px">' + (isPB?"New personal best!":"Best: " + best) + '</div><p style="color:var(--sub);font-size:13px;margin:12px 6px">No leaderboard — sirf tum vs tum. Ye rule Product Master File se aaya hai.</p><button class="btn block" id="rushAgain">Phir se</button><button class="btn ghost block" id="rushOut" style="margin-top:8px">Done</button></div>');
  $("#rushAgain").addEventListener("click", ()=>window.startRush());
  $("#rushOut").addEventListener("click", ()=>{ window.closeRunner(); renderHome(); });
}

/* ================= delegation (all dynamic buttons) ================= */
document.addEventListener("click", async e=>{
  const t = e.target.closest("[data-open-yt]");
  if(t){ window.open(t.dataset.openYt, "_blank"); return; }
  const rev = e.target.closest("[data-rev]");
  if(rev){ const a = rev.querySelector(".a"); if(a) a.classList.toggle("hidden"); return; }
  const say = e.target.closest("[data-say]");
  if(say){ window.send(say.dataset.say); return; }
  const hact = e.target.closest("[data-hact]");
  if(hact){
    const a = hact.dataset.hact;
    if(a.startsWith("Quiz")) window.startQuiz();
    else if(a.startsWith("Flashcards")) window.startFlash();
    else if(a.startsWith("Watch")) { window.goTab("learn"); $$("#learnSeg button")[1].click(); }
    else if(a === "MCQ Rush") window.startRush();
    return;
  }
  const subj = e.target.closest("[data-subj]");
  if(subj){ learnFilter = subj.dataset.subj; renderLearn(); return; }
  const cid = e.target.closest("[data-cid]");
  if(cid){ openConcept(cid.dataset.cid); return; }
  const dopt = e.target.closest("[data-do]");
  if(dopt){ diagPick(+dopt.dataset.do); return; }
  const sd = e.target.closest("[data-start-diag]");
  if(sd){ window.startDiag(sd.dataset.startDiag, +(sd.dataset.cls||9), sd.dataset.sub||"Sci"); return; }
  const qo = e.target.closest("[data-qo]");
  if(qo && !qo.disabled){ quizPickOpt(+qo.dataset.qo, +qo.dataset.ms||Date.now()); return; }
  const pk = e.target.closest("[data-p]");
  if(pk){
    $$(".pk").forEach(x=>x.classList.remove("on")); pk.classList.add("on");
    qzConf = pk.dataset.p;
    document.querySelectorAll("#quizDna").forEach(d=>d.textContent = 'Confidence: ' + qzConf + ' — ab answer lock karo');
    return;
  }
  const pk2 = e.target.closest("[data-p2]");
  if(pk2){
    $$("#runnerBody .pk").forEach(x=>x.classList.remove("on")); pk2.classList.add("on");
    qzConf = pk2.dataset.p2;
    $("#quizDna").textContent = qzConf + ' locked — ab option choose karo';
    return;
  }
  const nxt = e.target.closest("#quizNext");
  if(nxt){ quizNext(); return; }
  const fc = e.target.closest("#fcCard");
  if(fc){ flashFlip(); return; }
  const rate = e.target.closest("[data-rate]");
  if(rate){ flashRate(rate.dataset.rate); return; }
  const ro = e.target.closest("[data-ro]");
  if(ro){ rushPick(+ro.dataset.ro); return; }
  // chat artifact options (inline mini-checks)
  const opt = e.target.closest(".opt[data-a]");
  if(opt && !opt.disabled){
    const wrap = opt.closest("[data-qi]");
    const correct = +opt.dataset.a === +opt.dataset.oi;
    $$(".opt", wrap).forEach(b=>{ b.disabled = true; if(+b.dataset.oi === +opt.dataset.a) b.classList.add("ok"); else if(b === opt && !correct) b.classList.add("no"); });
    const dna = opt.closest(".art").querySelector(".dna");
    const g = window.gradeAnswer(opt.dataset.cid, correct, qzConf||"Unsure", 20000);
    if(dna){ dna.classList.remove("hidden"); dna.innerHTML = '<div class="why">' + (esc(opt.dataset.why||"") + " " + g.msg.replace(/\*\*/g,"<b>").replace(/\*/g,"")) + '</div>'; }
    if(correct){ setPose("happy"); setTimeout(()=>setPose("idle"),1500); } else { setPose("explain"); setTimeout(()=>setPose("idle"),1800); }
    window.touchStreak();
    return;
  }
  const pkc = e.target.closest(".pakka[data-pk] .pk");
  if(pkc){
    $$(".pakka[data-pk] .pk").forEach(x=>x.classList.remove("on")); pkc.classList.add("on");
    qzConf = pkc.dataset.p;
    return;
  }
  const gr = e.target.closest("[data-graph-range]");
  if(gr){ /* handled by input event */ }
});
document.addEventListener("input", e=>{
  const gr = e.target.closest("[data-graph-range]");
  if(gr){
    const art = gr.closest(".art");
    const v = +gr.value;
    art.querySelector("[data-graph-v]").textContent = v + " m/s";
    const line = art.querySelector("[data-graph-line]");
    line.setAttribute("x2", String(26 + 18.8 * v));
    return;
  }
});

/* practice entries */
$("#diagStart").addEventListener("click", ()=>{
  const s = state();
  const pool = window.CONCEPTS.filter(c=>c.cls===s.cls && !s.bands[c.id] && c.qz);
  const pick = pool[0] || window.CONCEPTS.find(c=>c.cls===s.cls && c.qz);
  if(pick) window.startDiag(pick.ch, pick.cls, pick.sub);
});
$("#quizStart").addEventListener("click", ()=>window.startQuiz());
$("#fcStart").addEventListener("click", ()=>window.startFlash());
$("#rushStart").addEventListener("click", ()=>window.startRush());

/* ================= boot views ================= */
renderChips(); renderMsgs(); renderHome();
window.renderHome = renderHome;
window.renderLearn = renderLearn;
window.renderPractice = renderPractice;
window.renderMsgs = renderMsgs;
window.renderPracticeAssets = ()=>{};
})();

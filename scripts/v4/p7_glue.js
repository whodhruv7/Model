/* ================= GLUE: old chat shell ⇄ backend powers =================
   Adapts the v1 state store to the learning engine (S), patches the model
   layer (identity + feature instructions + plug-and-play), adds the chat
   intent router and inline card builders, and boots everything guarded. */
"use strict";

/* ---------- S adapter: learning state lives inside the v1 store ---------- */
const LEARN_DEFAULTS = { mastery:{}, trail:[], streak:{n:0,day:""}, xp:0, badges:[], weights:{example:.5,practice:.5}, games:{mcqBest:0,bossWins:[]}, files:[] };
let S = null;
function buildS(){
  if(!state.learn) state.learn = JSON.parse(JSON.stringify(LEARN_DEFAULTS));
  for(const k of Object.keys(LEARN_DEFAULTS)) if(state.learn[k]===undefined) state.learn[k]=JSON.parse(JSON.stringify(LEARN_DEFAULTS[k]));
  S = {
    profile:{ name:"", cls:parseInt(state.student.cls)||9, lang:state.prefs.lang, budget:25 },
    api:{ key:state.founder.key||"", provider:state.founder.provider||"openai", model:state.founder.model||"", ok:!!state.founder.key && state.founder.ok===true },
    founder:{ get unlocked(){ return !!window.__founderUnlocked; }, files:state.learn.files },
    mastery:state.learn.mastery, trail:state.learn.trail, streak:state.learn.streak,
    xp:state.learn.xp, badges:state.learn.badges, weights:state.learn.weights, games:state.learn.games
  };
}
function syncSBack(){
  if(!S) return;
  state.learn = { mastery:S.mastery, trail:S.trail, streak:S.streak, xp:S.xp, badges:S.badges, weights:S.weights, games:S.games, files:S.founder.files };
}
/* v3-style save() → sync + persist through the v1 store */
function save(){ syncSBack(); saveState(); }
/* the v1 init() is wrapped to build S after state exists */
const _initV1 = init;
init = function(){ _initV1(); buildS(); renderHeaderStatus(); };

/* ---------- header status line (kept v1, tiny refresh helper) ---------- */
function renderHeaderStatus(){ try{ renderHeader(); }catch(e){} }

/* ---------- upgraded system prompt: old voice + identity lock + feature routing ---------- */
const _systemPromptV1 = systemPrompt;
function systemPrompt() {
  const base = _systemPromptV1();
  const weak=weakConcepts(3).map(m=>conceptName(m.k)+" ("+Math.round(m.score)+"%)").join("; ")||"none yet";
  const decays=decayed().map(conceptName).join("; ")||"none";
  const kb=allChapters().length?`Trained books (offline, searchable): ${Object.values(BOOKS).map(b=>b.name+" ("+b.chapters.length+" chapters)").join(", ")}.`:"";
  return [
    IDENTITY,
    base.replace(/^You are Saathy, the personal AI learning companion of VidhyaSaathy[^\n]*\n?/, ""),
    `Band depth: ${userBand()} of 4. At band 1: simplest words, everyday analogies, tiny steps. Band 2: worked examples step by step. Band 3: application focus, "where students slip" callouts. Band 4: concise, board twists, coach tone.`,
    `Known weak concepts: ${weak}. Decaying (needs warm-up): ${decays}. ${kb}`,
    `Hard rules: never fabricate page numbers, links, citations or data. If unsure, say honestly "I don't know, but here's how we can find out". No fear, no shame, no comparison with other students. If a task is clearly homework, guide Socratically — hints first, not the final answer. Always end teaching answers with ONE tiny next step.`,
    FEATURE_ROUTING
  ].filter(Boolean).join("\n");
}

/* ---------- plug-and-play: key paste auto-detects provider + model ---------- */
function bindKeyAutodetect(){
  const keyEl=$("#fKey"); if(!keyEl) return;
  keyEl.addEventListener("input", ()=>{
    const d=detectProvider(keyEl.value);
    if(d){
      state.founder.provider=d.provider;
      $("#fProvider").value=d.provider;
      const prov=PROVIDERS[d.provider];
      $("#fBase").placeholder=d.base||prov.defBase;
      $("#fBaseHint").textContent = d.provider==="gemini" ? "Auto-detected: Google Gemini — the AIza key works as-is." : "Auto-detected endpoint — usually no need to change this.";
      if(!$("#fModel").value.trim() || detectProvider($("#fModel").value+"")===null){
        $("#fModel").value=d.models[0]||"";
        $("#fModelHint").textContent="Suggested: "+(d.models[0]||"");
      }
    }
  });
}

/* ---------- chat intent router (backend powers, deterministic) ---------- */
let pendingVideoHits=null;
const _sendMessageV1 = sendMessage;
async function sendMessage(text){
  const t=(text||"").trim();
  if(!t||busy) return;
  if(await handleIntent(t)) return;
  return _sendMessageV1(t);
}
function guessChapterKey(t){
  const words=String(t).toLowerCase();
  const hit=allChapters().find(c=>{
    const key=c.title.toLowerCase().split(/[:(]/)[0].trim();
    return key.length>3 && words.includes(key);
  });
  return hit? hit.book+":"+hit.number : (currentPlanKey()||null);
}
async function handleIntent(t){
  const q=t.toLowerCase();

  /* YouTube link → understand + timeline card */
  const yt=ytParse(t);
  if(yt){ addCardMsg({kind:"yt", yt, topic:t.replace(/https?:\/\/\S+/g,"").trim()}); return true; }

  /* explicit video request → verified kit card (+ AI answer stays separate) */
  const wantsVideo=/\b(video|videos|youtube)\b/.test(q);
  if(wantsVideo){
    const hits=matchVideos(t,{cls:parseInt(state.student.cls)||9,limit:2});
    if(hits.length){
      if(/\b(explain|samjha|samjhao|teach|doubt|what|why|how)\b/.test(q)){ pendingVideoHits=hits; return false; } // AI answers, card attaches after
      addAssistantNote("From your verified video kit — every link checked live, 3 teachers per concept:");
      addCardMsg({kind:"videos", hits:hits.map(h=>({subject:h.subject,subjectName:h.subjectName,cls:h.cls,concept:h.concept,vids:[h.primary,...h.alternates]}))});
      return true;
    }
    addAssistantNote("I don't have a verified video for that exact topic in the kit yet — I won't invent a link. Open the full kit to search, or try another keyword:");
    addCardMsg({kind:"videokit", q:t});
    return true;
  }

  /* plan */
  if(/(^|\s)(plan|schedule)\b|kya padhu|padhai plan|study plan/.test(q)){ openPlanMaker(t); return true; }
  /* quiz / test me / practise */
  if(/\b(quiz|test me|testme)\b/.test(q)){ const k=guessChapterKey(t); openQuiz(k, "Quiz"+(k?" — "+conceptName(k.split(":").join(":")):"")); return true; }
  /* games */
  if(/\b(game|games|khelo|khel)\b/.test(q)){ openGamePicker(guessChapterKey(t)); return true; }
  /* flashcards */
  if(/\b(flashcard|flash card|revision sprint)\b/.test(q)){ const k=guessChapterKey(t); const ch=k?chapterOf(k):null; if(ch) openFlash(k,ch); else toast("Tell me the chapter too — e.g. flashcards Motion","info"); return true; }
  /* reports / progress */
  if(/\b(report|progress|mastery|my position|how am i doing)\b/.test(q)){ openReportsStage(); return true; }
  /* labs */
  if(/\b(lab|labs|experiment|simulation|simulat)\b/.test(q)){ openLabPicker(t); return true; }
  return false;
}

/* ---------- inline chat cards (persisted as messages) ---------- */
function addCardMsg(card){
  let chat=activeChat(); if(!chat) chat=newChatObj();
  chat.messages.push({role:"card", card, ts:Date.now()});
  chat.updated=Date.now();
  saveState(); renderList(); renderThread();
}
function addAssistantNote(text){
  let chat=activeChat(); if(!chat) chat=newChatObj();
  chat.messages.push({role:"assistant", content:text, ts:Date.now()});
  chat.updated=Date.now();
  saveState(); renderList(); renderThread();
}
function buildCardMsg(m){
  const wrap=document.createElement("div");
  wrap.className="msg msg-a";
  const av=pose("explaining"); av.className="ava"; wrap.appendChild(av);
  const body=document.createElement("div"); body.className="msg-body";
  const c=m.card||{};
  if(c.kind==="yt"){
    const el=document.createElement("div"); el.className="inline-card";
    el.innerHTML=`<div class="ic-head"><svg viewBox="0 0 24 24" fill="none" stroke="#B42318" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z" fill="#B42318"/></svg><b>YouTube link understood</b></div>
    <p class="muted" style="margin:0 0 8px">${c.topic?`Topic guess: <b>${esc(c.topic)}</b> · `:""}Start at <b>${c.yt.startLabel}</b>. Watch-plan timeline (suggested):</p>
    <div class="vt-row"><b class="t">+0:00</b><span>Intro — what this video covers</span></div>
    <div class="vt-row"><b class="t">+25%</b><span>Core idea 1 — pause &amp; try</span></div>
    <div class="vt-row"><b class="t">+50%</b><span>Core idea 2 — checkpoint question</span></div>
    <div class="vt-row"><b class="t">+75%</b><span>Examples — attempt before reveal</span></div>
    <div class="row" style="margin-top:8px">
      <a class="vlink" href="${c.yt.url}${c.yt.start?`&t=${Math.round(c.yt.start)}s`:""}" target="_blank" rel="noopener">▶ Open at ${c.yt.startLabel}</a>
      <a class="vlink" href="${c.yt.url}" target="_blank" rel="noopener">Open full video</a>
      <button class="btn peach sm" data-quizafter>Quiz me after watching</button>
    </div>`;
    el.querySelector("[data-quizafter]").onclick=()=>openQuiz(null,"Mixed — video follow-up");
    body.appendChild(el);
  } else if(c.kind==="videos"){
    const el=document.createElement("div");
    el.innerHTML=c.hits.map(g=>vkCardHTML({subject:g.subject,cls:g.cls,concept:g.concept,vids:g.vids})).join("");
    body.appendChild(el);
  } else if(c.kind==="videokit"){
    const el=document.createElement("div"); el.className="inline-card";
    el.innerHTML=`<div class="ic-head"><svg viewBox="0 0 24 24" fill="none" stroke="#2A5A8A" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z" fill="#2A5A8A"/></svg><b>Verified video kit</b></div>
    <p class="muted" style="margin:0 0 10px">${VIDEO_KIT.length} concepts · ${VIDEO_DB.length} checked direct links. Search inside:</p>
    <button class="btn primary sm" data-openkit>Open the video kit</button>`;
    el.querySelector("[data-openkit]").onclick=()=>openVideoKit(c.q||"");
    body.appendChild(el);
  } else if(c.kind==="labmenu"){
    const el=document.createElement("div");
    el.innerHTML=`<div class="grid2">${ARTIFACTS.map(a=>`<div class="art-tile" data-a="${a.id}"><div class="a-ico" style="background:${a.bg}">${a.t[0]}</div><h4>${a.t}</h4><p>${a.s}</p></div>`).join("")}</div>`;
    el.querySelectorAll("[data-a]").forEach(x=>x.onclick=()=>openArtifact(x.dataset.a));
    body.appendChild(el);
  }
  wrap.appendChild(body);
  return wrap;
}
/* renderThread/buildMsg patched: card messages render; lead-avatar logic skips cards */
const _buildMsgV1 = buildMsg;
function buildMsg(m, chat, prev, isLastAssistant){
  if(m.role==="card") return buildCardMsg(m);
  return _buildMsgV1(m, chat, prev, isLastAssistant);
}
const _renderThreadV1 = renderThread;
function renderThread(){
  const chat=activeChat();
  const thread=$("#thread"), welcome=$("#welcome");
  const empty=!chat||!chat.messages.length;
  welcome.classList.toggle("hidden",!empty);
  thread.innerHTML="";
  if(!chat||empty){ $("#scroller").scrollTop=0; return; }
  const msgs=chat.messages;
  for(let i=0;i<msgs.length;i++){
    const isLastA = msgs[i].role==="assistant" && !msgs.slice(i+1).some(x=>x.role==="assistant"||x.role==="card");
    let prev=msgs[i-1];
    if(prev&&prev.role==="card"){ for(let j=i-1;j>=0;j--){ if(msgs[j].role!=="card"){ prev=msgs[j]; break; } prev=null; } }
    thread.appendChild(buildMsg(msgs[i], chat, prev, isLastA));
  }
  $("#scroller").scrollTop=$("#scroller").scrollHeight;
}

/* attach a pending video card after an AI reply (explain + video in one ask) */
const _runModelTurnV1 = runModelTurn;
async function runModelTurn(chat){
  await _runModelTurnV1(chat);
  if(pendingVideoHits){
    const hits=pendingVideoHits; pendingVideoHits=null;
    addCardMsg({kind:"videos", hits:hits.map(h=>({subject:h.subject,subjectName:h.subjectName,cls:h.cls,concept:h.concept,vids:[h.primary,...h.alternates]}))});
  }
}

/* ---------- boot v4: stage, corpus, plug-and-play, escape ---------- */
function bootV4(){
  const guard=(name,fn)=>{ try{ fn(); }catch(e){ console.error(name,e); } };
  loadBooks(); buildVideoKit();
  guard("stage",()=>{
    $("#closeStage").addEventListener("click",closeStage);
    $("#stageWrap").addEventListener("click",e=>{ if(e.target.id==="stageWrap") closeStage(); });
  });
  guard("corpus",()=>{
    const dz=$("#dropzone"), pick=$("#filePick");
    if(dz&&pick){
      dz.onclick=()=>pick.click();
      dz.ondragover=e=>{e.preventDefault();dz.classList.add("drag");};
      dz.ondragleave=()=>dz.classList.remove("drag");
      dz.ondrop=e=>{e.preventDefault();dz.classList.remove("drag");handleFiles(e.dataTransfer.files);};
      pick.onchange=()=>handleFiles(pick.files);
    }
  });
  guard("plugplay",bindKeyAutodetect);
  guard("founder-ok",()=>{
    const _setCfg=setCfgStatus;
    $("#btnTest").addEventListener("click",()=>{ setTimeout(()=>{ buildS(); renderHeaderStatus(); },1500); });
  });
  guard("escape",()=>{
    document.addEventListener("keydown",e=>{
      if(e.key==="Escape"&&$("#stageWrap")&&!$("#stageWrap").classList.contains("hidden")) closeStage();
    });
  });
  guard("streak",()=>{ checkStreak(); renderHeaderStatus(); });
  console.log("Saathy v.4 booted — old chat front end, full backend engine ("+VIDEO_KIT.length+" concepts, "+VIDEO_DB.length+" verified links, "+allChapters().length+" chapters)");
}
/* global shims the ported features expect */
function renderHome(){ checkStreak(); renderHeaderStatus(); }
function go(tab){ if(tab==="reports") openReportsStage(); }
const Saathy={closeStage,openArtifact,openReportsStage,openVideoKit,openLabPicker,openPlanMaker,go};
window.Saathy=Saathy;
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",()=>{ bootV4(); }); else bootV4();

/* ================= FEATURES: stage · quiz · plan · games · flash · videos · labs · reports · corpus ================= */
"use strict";

/* ---------- Stage sheet ---------- */
function openStage(title, agentKey, build){
  $("#stageTitle").textContent=title;
  const ag=AGENTS[agentKey];
  $("#stageAgent").innerHTML= ag? `<span class="agent-chip"><span class="adot"></span>${ag.name} — ${ag.role}</span> <span class="muted" style="font-size:12px">${ag.line}</span>`:"";
  const body=$("#stageBody"); body.innerHTML="";
  build(body);
  $("#stageWrap").classList.remove("hidden");
  if(navigator.vibrate) navigator.vibrate(8);
}
function closeStage(){ $("#stageWrap").classList.add("hidden"); }

/* ---------- Quiz runner (ladder + confidence + Error DNA + bridge) ---------- */
let QZ=null;
function openQuiz(chKey, label, opts={}){
  const qs=opts.qs||questionsForChapter(chKey, opts.diagnostic?3:6);
  if(!qs.length){ toast("No questions ready for that topic yet","err"); return; }
  QZ={qs,i:0,ladder:2,streakC:0,ok:0,conf:null,t0:0,chKey,label,diagnostic:!!opts.diagnostic,answers:[],bridge:null};
  openStage(label||(opts.diagnostic?"Level check":"Quiz"), opts.diagnostic?"diag":"quiz", b=>renderQ(b));
}
function renderQ(b){
  const z=QZ, q=z.qs[z.i];
  delete b.dataset.done;
  z.t0=Date.now(); z.conf=null;
  b.innerHTML=`
    <div class="q-meta"><span>${z.diagnostic?"Not a test — routing only":z.label} · Q${z.i+1}/${z.qs.length}</span>
    <span class="ladder">${[1,2,3].map(l=>`<i class="${z.ladder>=l?"l"+z.ladder:""}"></i>`).join("")} L${z.ladder}</span></div>
    <div style="font-size:16px;font-weight:700;margin-bottom:14px">${esc(q.q)}</div>
    <div id="qOpts">${q.opts.map((o,i)=>`<button class="opt" data-i="${i}"><span class="k">${"ABCD"[i]}</span><span>${esc(o)}</span></button>`).join("")}</div>
    <div class="conf-row">
      <button class="conf" data-c="Sure">Sure</button><button class="conf" data-c="Unsure">Unsure</button><button class="conf" data-c="Guess">Guess</button>
    </div>
    <p class="muted" style="margin:4px 0 0">Tap your gut BEFORE the reveal — it's the most honest signal in the app.</p>
    <div id="qFeedback"></div>`;
  b.querySelectorAll(".conf").forEach(c=>c.onclick=()=>{ b.querySelectorAll(".conf").forEach(x=>x.className="conf"); c.classList.add("on-"+c.dataset.c.toLowerCase()); z.conf=c.dataset.c; });
  b.querySelectorAll(".opt").forEach(o=>o.onclick=()=>answer(+o.dataset.i,b));
}
function answer(pick,b){
  const z=QZ,q=z.qs[z.i]; if(b.dataset.done) return; b.dataset.done=1;
  const secs=Math.round((Date.now()-z.t0)/1000);
  const right=pick===q.a;
  b.querySelectorAll(".opt").forEach((o,i)=>{ if(i===q.a)o.classList.add("right"); else if(i===pick)o.classList.add("wrong"); });
  if(right){z.streakC++; z.ok++; if(z.streakC>=3&&z.ladder<3){z.ladder++;z.streakC=0;}}
  else { z.streakC=0; if(z.ladder===3)z.ladder=2; else if(z.ladder===2&&z.answers.filter(a=>!a.ok).slice(-1).length&&z.ladder>1){z.ladder=1;} }
  const key=z.chKey||("topic:"+z.label);
  if(!z.diagnostic) recordAnswer(key,right,z.conf||"Unsure",secs,q.L);
  else { S.trail.push({t:Date.now(),ev:"diagnostic",key,ok:right?1:0}); save(); }
  z.answers.push({ok:right,conf:z.conf,secs});
  const fb=$("#qFeedback");
  const wrongType = !right ? classifyDNA(z.conf||"Unsure",secs,q.L,key) : null;
  fb.innerHTML=`
    ${right?`<div class="card" style="background:#F0F9F3"><b>${z.conf==="Guess"?"Lucky tap — counted honestly, but lightly":"Correct!"}</b><p class="muted" style="margin:6px 0 0">${esc(q.why)}</p></div>`
    :`<div class="card" style="background:#FDF1EF"><b>Why it went wrong — ${wrongType.name}</b><p class="muted" style="margin:6px 0 0">${esc(q.why)}</p><p style="margin:8px 0 0;font-size:13.5px"><b>Repair:</b> ${wrongType.repair}</p></div>`}
    <div class="row" style="margin-top:10px"><button class="btn primary" id="qNext">${z.i+1<z.qs.length?"Next question":"Finish"}</button></div>`;
  $("#qNext").onclick=()=>{ z.i++; if(z.i<z.qs.length) renderQ(b); else finishQuiz(b); };
}
function classifyDNA(conf,secs,L,key){
  const m=S.mastery[key];
  if(conf==="Guess") return {name:"Guess",repair:"Honest acknowledgement — this question returns tomorrow in a different skin, so the guess becomes knowledge."};
  if(secs<=6&&(!m||m.score>=60)) return {name:"Careless slip",repair:"One-line nudge, no re-teach: slow down on signs and units — you know this."};
  if(L>=3&&m&&m.score>=50) return {name:"Method error",repair:"A worked example of the exact same pattern is queued, step highlighted where it broke."};
  return {name:"Concept gap",repair:"Bridge back: the prerequisite is re-taught in the simplest variant first, then we re-test."};
}
function finishQuiz(b){
  const z=QZ,pct=Math.round(100*z.ok/z.qs.length);
  let extra="";
  if(z.diagnostic){
    const band=pct>=75?4:pct>=50?3:pct>=25?2:1;
    extra=`<div class="card bluecard"><b>Routing: ${FRIENDLY[band-1]}</b><p class="muted" style="margin:6px 0 0">${band<=1?"Basics rebuild first — Guru brings the simplest examples.":band===2?"Standard slides + worked examples, flashcards pushed.":band===3?"Application focus — twists and numericals.":"Challenge sets + Boss Level — you're in top form."}</p></div>`;
  } else {
    extra=`<p class="muted">${z.ok}/${z.qs.length} correct · ladder now L${z.ladder} · evidence logged for parent & teacher reports.</p>`;
  }
  b.innerHTML=`<div style="text-align:center;padding:10px"><div class="big-num">${pct}%</div><p class="muted">final score</p>${extra}
  <div class="row" style="justify-content:center;margin-top:12px"><button class="btn primary" id="qClose">Done</button></div></div>`;
  $("#qClose").onclick=closeStage; checkBadges(); renderHeaderStatus();
}

/* ---------- Plan maker (level check → slides → quiz → game → flashcards → report) ---------- */
let PLAN=null;
function openPlanMaker(preTopic){
  openStage("Plan maker","tutor",b=>{
    b.innerHTML=`
      <div class="card"><h3>What are we mastering tonight?</h3>
      <p class="muted">Pick a chapter — the full VidhyaSaathy loop runs right here: level check → slides → quiz → game → flashcards, each step owned by its own agent.</p>
      <div class="field"><label>Subject</label><select id="planSubj"></select></div>
      <div class="field"><label>Chapter</label><select id="planChap"></select></div>
      <div class="row"><button class="btn primary" id="planGo">Create my plan</button></div></div>
      <div id="planRun"></div>`;
    const sel=$("#planSubj"), selC=$("#planChap");
    sel.innerHTML=Object.entries(BOOKS).map(([k,b])=>`<option value="${k}">${b.name}</option>`).join("");
    const fill=()=>{ const bk=sel.value; selC.innerHTML=BOOKS[bk].chapters.map(c=>`<option value="${c.number}">Ch ${c.number} — ${esc(c.title)}</option>`).join(""); };
    sel.onchange=fill; fill();
    if(preTopic){ const hit=topicToChapter(preTopic); if(hit){ sel.value=hit.book; fill(); selC.value=String(hit.number); } }
    $("#planGo").onclick=()=>{ PLAN={book:sel.value,ch:+selC.value,step:0,done:[]}; renderPlanRun(); };
    renderPlanRun();
  });
}
function renderPlanRun(){
  const host=$("#planRun"); if(!host) return;
  if(!PLAN){ host.innerHTML=""; return; }
  const ch=BOOKS[PLAN.book].chapters.find(c=>c.number===PLAN.ch);
  if(!ch){ PLAN=null; host.innerHTML=""; return; }
  const flow=PLAN_FLOW.map((f,i)=>`<div class="fstep ${i<PLAN.step?"done":i===PLAN.step?"now":""}"><div class="fs-dot">${f.icon}</div><div class="fs-t">${f.title}</div></div>`).join("");
  const cur=PLAN_FLOW[Math.min(PLAN.step,PLAN_FLOW.length-1)];
  host.innerHTML=`
    <div class="card"><h3>${esc(ch.title)} <span class="chip">${BOOKS[PLAN.book].subject}</span></h3>
      <div class="flow">${flow}</div>
      <div class="row"><span class="agent-chip"><span class="adot"></span>${AGENTS[cur.agent].name} — ${AGENTS[cur.agent].role}</span>
      <button class="btn primary sm" id="planStep">${PLAN.step===0?"Start level check":cur.title}</button></div>
      <p class="muted" style="margin:10px 0 0">${AGENTS[cur.agent].line}</p></div>
    <div id="planOut"></div>`;
  $("#planStep").onclick=()=>runStep(cur, ch);
  if(PLAN.step>=PLAN_FLOW.length){ PLAN=null; }
}
function runStep(cur, ch){
  const key=`${PLAN.book}:${PLAN.ch}`;
  if(cur.id==="diag") openQuiz(key,"Level check",{diagnostic:true});
  if(cur.id==="slides") openSlides(key, ch);
  if(cur.id==="quiz") openQuiz(key,"Chapter quiz");
  if(cur.id==="game") openGamePicker(key);
  if(cur.id==="flash") openFlash(key, ch);
  if(cur.id==="report"){ PLAN.step++; renderPlanRun(); toast("Plan complete — report updated ✓","ok"); openReportsStage(); }
}
function advancePlan(){ if(PLAN){ PLAN.step++; renderPlanRun(); } }

/* ---------- Concept slides ---------- */
function firstLines(t,n){ return (t||"").split("\n").filter(x=>x.trim()).slice(0,n).join("\n"); }
function openSlides(key,ch){
  openStage("Concept slides — "+ch.title,"tutor",b=>{
    const band=userBand();
    const secs=(ch.sections||[]).slice(0,4);
    b.innerHTML=`<div class="q-meta"><span>${BOOKS[ch.book].name}</span><span class="chip">${FRIENDLY[band-1]}</span></div>`+
    secs.map((s,i)=>`<div class="card bluecard"><b>Slide ${i+1} · ${esc(s.title)}</b><p style="font-size:14.5px;white-space:pre-wrap;margin:8px 0">${esc(band<=2?firstLines(s.content,3):firstLines(s.content,2))}</p>${band<=2?`<p class="muted">Think of it like this: everyday examples first, jargon later.</p>`:`<p class="muted">Where students slip: watch the definitions and units — examiners trap exactly here.</p>`}</div>`).join("")+
    `<div class="row"><button class="btn primary" id="slQuiz">Checkpoint quiz</button><button class="btn ghost" id="slVideo">Watch a video for this</button></div>`;
    $("#slQuiz").onclick=()=>openQuiz(key,"Checkpoint quiz");
    $("#slVideo").onclick=()=>{ closeStage(); openVideoKit(ch.title.split(/[:(]/)[0].trim()); };
  });
  advancePlanSoon();
}
function userBand(){
  const ms=Object.values(S.mastery).filter(m=>m.seen);
  if(!ms.length) return 2;
  return Math.round(ms.reduce((a,m)=>a+m.band,0)/ms.length);
}
function advancePlanSoon(){ setTimeout(advancePlan, 400); }

/* ---------- Flashcards ---------- */
function openFlash(key,ch){
  const secs=(ch.sections||[]).filter(s=>s.title&&s.content).slice(0,8);
  if(!secs.length){ toast("No deck for this chapter yet","err"); return; }
  openStage("Flashcards — "+ch.title,"flash",b=>{
    let i=0; const rates=[];
    const draw=()=>{
      const s=secs[i%secs.length];
      b.innerHTML=`<p class="muted">${i+1} / ${secs.length} · tap the card to flip</p>
      <div class="fc-stage"><div class="fc" id="fc"><div class="face front"><small>${esc(ch.title)}</small>${esc(s.title)}</div><div class="face back">${esc(firstLines(s.content,2))}</div></div></div>
      <div class="row" style="justify-content:center;margin-top:14px">
        <button class="btn ghost sm" id="r0">Forgot</button><button class="btn peach sm" id="r1">Almost</button><button class="btn primary sm" id="r2">Knew it</button>
      </div>`;
      $("#fc").onclick=()=>$("#fc").classList.toggle("flip");
      [["r0","forgot"],["r1","almost"],["r2","knew"]].forEach(([id,rate])=>{ $("#"+id).onclick=()=>{ rates.push(rate); S.trail.push({t:Date.now(),ev:"flash",key,rate}); S.xp+=2; save(); i++; draw(); }; });
    };
    draw();
    const done=document.createElement("div"); done.className="row"; done.style.marginTop="12px";
    done.innerHTML=`<button class="btn primary" id="fDone">Finish sprint</button>`;
    b.appendChild(done);
    done.querySelector("#fDone").onclick=()=>{ closeStage(); toast("Revision sprint logged — mastery signal saved","ok"); advancePlan(); };
  });
}

/* ---------- Games arcade (5 games, one bank) ---------- */
const GAMES=[
 {id:"mcq",name:"MCQ Rush",desc:"60-second streaks of quick MCQs — same bank, faster world."},
 {id:"match",name:"Match the Concept",desc:"Term ↔ definition pairs against the clock."},
 {id:"rapid",name:"Rapid Revision",desc:"The flashcard deck as a self-rated sprint."},
 {id:"streak",name:"Streak Challenge",desc:"Bank your XP… or risk it on one more question."},
 {id:"boss",name:"Boss Level",desc:"Chapter boss — unlock at 70% mastery. Defeat it to preview the next chapter."}
];
function openGamePicker(chKey, force){
  const key=chKey||currentPlanKey()||null;
  if(force==="mcq") return gameMCQ();
  if(force==="match") return gameMatch();
  if(force==="rapid") return gameRapid();
  if(force==="streak") return gameStreak();
  if(force==="boss") return gameBoss();
  openStage("Game break","game",b=>{
    b.innerHTML=`<p class="muted" style="margin:0 2px 12px">One question bank, five games. Every score feeds your concept mastery — never a leaderboard.</p><div class="grid2">`+GAMES.map(g=>`<div class="game-tile"><div class="g-ico">${g.name[0]}</div><h4>${g.name}</h4><p>${g.desc}</p><button class="btn peach sm" data-g="${g.id}">Play</button></div>`).join("")+`</div>`;
    b.querySelectorAll("[data-g]").forEach(x=>x.onclick=()=>openGamePicker(key,x.dataset.g));
  });
}
function currentPlanKey(){ return PLAN?`${PLAN.book}:${PLAN.ch}`:(weakConcepts(1)[0]?weakConcepts(1)[0].k:null); }
function gameMCQ(){
  const key=currentPlanKey(); const qs=key?questionsForChapter(key,20):bankQs(20);
  let i=0,score=0,t=60,timer=null;
  openStage("MCQ Rush — 60 seconds","game",b=>{
    const draw=()=>{
      if(i>=qs.length||t<=0){ clearInterval(timer); if(score>S.games.mcqBest){S.games.mcqBest=score;checkBadges();} S.xp+=score; save();
        b.innerHTML=`<div style="text-align:center;padding:16px"><div class="big-num">${score}</div><p class="muted">best: ${S.games.mcqBest} · +${score} XP · evidence logged</p><button class="btn primary" id="mcqDone">Done</button></div>`;
        $("#mcqDone").onclick=closeStage; renderHeaderStatus(); return; }
      const q=qs[i%qs.length];
      b.innerHTML=`<div class="timerbar"><i style="width:${t/60*100}%"></i></div><p class="muted" style="margin:0 0 8px">Score ${score} · ${t}s</p>
      <div style="font-weight:700;margin-bottom:12px">${esc(q.q)}</div>
      <div>${q.opts.map((o,j)=>`<button class="opt" data-i="${j}"><span class="k">${"ABCD"[j]}</span><span>${esc(o)}</span></button>`).join("")}</div>`;
      b.querySelectorAll(".opt").forEach(o=>o.onclick=()=>{ const ok=+o.dataset.i===q.a; if(ok){score++; if(navigator.vibrate)navigator.vibrate(6);} i++; draw(); });
    };
    draw(); timer=setInterval(()=>{ t--; draw(); },1000);
  });
}
function gameMatch(){
  const key=currentPlanKey(); const ch=key?chapterOf(key):allChapters()[0];
  const secs=shuffle((ch.sections||[]).filter(s=>s.content&&s.title)).slice(0,4);
  if(secs.length<2){ toast("Need a chapter with sections — pick one in Plan","err"); return; }
  const left=shuffle(secs.map(s=>({t:s.title,id:s.id}))), right=shuffle(secs.map(s=>({t:firstLines(s.content,1).slice(0,64)+"…",id:s.id})));
  let selL=null,selR=null,done=0,flips=0;
  openStage("Match the Concept","game",b=>{
    const draw=()=>{
      b.innerHTML=`<p class="muted">${done}/${secs.length} matched · ${flips} flips</p>
      <div class="pair"><div>${left.map(l=>`<button class="p ${l.done?"done":""} ${selL===l.id?"sel":""}" data-l="${l.id}">${esc(l.t)}</button>`).join("")}</div>
      <div>${right.map(r=>`<button class="p ${r.done?"done":""} ${selR===r.id?"sel":""}" data-r="${r.id}">${esc(r.t)}</button>`).join("")}</div></div>`;
      b.querySelectorAll("[data-l]").forEach(x=>x.onclick=()=>{ selL=x.dataset.l; flips++; check(); });
      b.querySelectorAll("[data-r]").forEach(x=>x.onclick=()=>{ selR=x.dataset.r; flips++; check(); });
    };
    const check=()=>{
      if(selL&&selR){
        const hit=selL===selR;
        if(hit){ const L=left.find(x=>x.id===selL), R=right.find(x=>x.id===selR); L.done=R.done=true; done++; S.xp+=5; S.trail.push({t:Date.now(),ev:"game",key:ch.book+":"+ch.number,ok:1}); }
        selL=selR=null;
      }
      if(done===secs.length){ S.xp+=10; save();
        b.innerHTML=`<div style="text-align:center;padding:14px"><div class="big-num">${flips}</div><p class="muted">flips to clear · +${secs.length*5+10} XP</p><button class="btn primary" id="gmDone">Done</button></div>`;
        $("#gmDone").onclick=closeStage; renderHeaderStatus(); }
      else draw();
    };
    draw();
  });
}
function gameRapid(){ const key=currentPlanKey(); const ch=key?chapterOf(key):allChapters()[0]; openFlash(ch.book+":"+ch.number,ch); }
function gameStreak(){
  const qs=bankQs(6); let pot=0,i=0;
  openStage("Streak Challenge","game",b=>{
    const draw=()=>{
      if(i>=qs.length){ S.xp+=pot; save(); renderHeaderStatus();
        b.innerHTML=`<div style="text-align:center;padding:14px"><div class="big-num">+${pot} XP</div><p class="muted">banked safely</p><button class="btn primary" id="stDone">Done</button></div>`;
        $("#stDone").onclick=closeStage; return; }
      const q=qs[i];
      b.innerHTML=`<div class="boss-gate"><b>Round ${i+1}/6</b><p style="color:var(--sky);margin:4px 0 0">Pot: <b>${pot} XP</b> — answer right to grow it, or bank it.</p></div>
      <div style="font-weight:700;margin:12px 0">${esc(q.q)}</div>
      ${q.opts.map((o,j)=>`<button class="opt" data-i="${j}"><span class="k">${"ABCD"[j]}</span><span>${esc(o)}</span></button>`).join("")}
      <div class="row" style="margin-top:10px"><button class="btn peach" id="bank">Bank ${pot} XP</button></div>`;
      b.querySelectorAll(".opt").forEach(o=>o.onclick=()=>{ const ok=+o.dataset.i===q.a; if(ok){pot+=10;S.trail.push({t:Date.now(),ev:"game",ok:1});} else { pot=0; S.trail.push({t:Date.now(),ev:"game",ok:0}); toast("Pot lost — brave move, that's the game","err"); } i++; save(); draw(); });
      $("#bank").onclick=()=>{ i=qs.length; draw(); };
    };
    draw();
  });
}
function gameBoss(){
  const key=currentPlanKey(); const ch=key?chapterOf(key):allChapters()[0];
  const secs=(ch.sections||[]).filter(s=>s.content);
  const avg=secs.length?Math.round(secs.reduce((a,s)=>a+mastery(`${ch.book}:${ch.number}:${s.id}`).score,0)/secs.length):0;
  openStage("Boss Level — "+ch.title,"boss",b=>{
    if(avg<70){
      b.innerHTML=`<div class="boss-gate"><h3 style="color:#fff;margin:0 0 6px">LOCKED — the Boss guards this chapter</h3>
      <p style="color:var(--sky)">Chapter mastery: <b>${avg}%</b> — you need <b>70%</b>.</p>
      <p style="color:var(--sky);font-size:14px">No shame in the gate — it means Guru has one more slide-quiz round for you. Beat the quiz, then the boss.</p>
      <button class="btn peach" id="gg">Take the boost quiz (L1)</button></div>`;
      $("#gg").onclick=()=>openQuiz(ch.book+":"+ch.number,"Boost quiz");
      return;
    }
    const qs=questionsForChapter(ch.book+":"+ch.number,5).map(q=>({...q,L:3}));
    let i=0,ok=0;
    const draw=()=>{
      if(i>=qs.length){
        if(ok>=4){ const idx=allChapters().findIndex(c=>c.book===ch.book&&c.number===ch.number); const nxt=allChapters()[idx+1];
          S.xp+=40; if(!S.games.bossWins.includes(ch.book+":"+ch.number)) S.games.bossWins.push(ch.book+":"+ch.number); save();
          b.innerHTML=`<div class="boss-gate" style="background:linear-gradient(135deg,#2F8F62,#1C4066)"><h3 style="color:#fff;margin:0 0 6px">BOSS DEFEATED</h3><p style="color:#fff">+40 XP · next chapter preview unlocked:</p><div class="card" style="text-align:left;margin:12px 0;background:rgba(255,255,255,.12);box-shadow:none;color:#fff"><b>${nxt?esc(nxt.title):"You finished the book — legend."}</b><p style="color:var(--sky);margin:6px 0 0">${nxt?esc(firstLines(nxt.intro||"",1)):""}</p></div><button class="btn peach" id="bbDone">Claim</button></div>`;
          $("#bbDone").onclick=closeStage;
        } else {
          b.innerHTML=`<div class="boss-gate"><h3 style="color:#fff;margin:0 0 6px">So close — ${ok}/5</h3><p style="color:var(--sky)">The boss survives at 4/5. One more flashcard sprint and you've got this.</p><button class="btn peach" id="bbBack">Back</button></div>`;
          $("#bbBack").onclick=closeStage;
        }
        renderHeaderStatus(); return;
      }
      const q=qs[i];
      b.innerHTML=`<p class="muted">Boss HP: ${"▮".repeat(5-i)}${"▯".repeat(i)} · Q${i+1}/5</p><div style="font-weight:700;margin:10px 0">${esc(q.q)}</div>
      ${q.opts.map((o,j)=>`<button class="opt" data-i="${j}"><span class="k">${"ABCD"[j]}</span><span>${esc(o)}</span></button>`).join("")}`;
      b.querySelectorAll(".opt").forEach(o=>o.onclick=()=>{ if(+o.dataset.i===q.a) ok++; i++; draw(); });
    };
    draw();
  });
}

/* ---------- Video kit (stage browse + inline chat cards) ---------- */
let vkF={cls:"all",subj:"all",q:""};
function openVideoKit(preQ){
  vkF={cls:"all",subj:"all",q:preQ||""};
  openStage("Video kit — verified direct links","tutor",b=>{
    b.innerHTML=`<p class="muted" style="margin:0 2px 10px">${VIDEO_KIT.length} concepts · ${VIDEO_DB.length} verified direct video links (3 teachers per concept, every link checked live). Tap Watch now — it opens the exact video.</p>
    <div class="vk-filter" id="vkFilter"></div><div id="vkList"></div>`;
    paintVKFilter(); paintVK();
  });
}
function paintVKFilter(){
  const cats=[["all","All"],["math","Maths"],["sci","Science"],["sst","SST"],["9","Class 9"],["10","Class 10"]];
  const f=$("#vkFilter"); if(!f) return;
  f.innerHTML=cats.map(([v,l])=>`<button class="tm ${vkF.cls===v||vkF.subj===v?"on":""}" data-v="${v}">${l}</button>`).join("")+`<input id="vkQ" placeholder="Search concept…" style="border:1.5px solid var(--line);border-radius:999px;padding:8px 14px;font-size:13px;min-width:150px;background:rgba(255,255,255,.85)" value="${esc(vkF.q)}">`;
  f.querySelectorAll("[data-v]").forEach(btn=>btn.onclick=()=>{ const v=btn.dataset.v; if(v==="math"||v==="sci"||v==="sst") vkF.subj=vkF.subj===v?"all":v; else if(v!=="all") vkF.cls=vkF.cls===v?"all":v; else {vkF.cls="all";vkF.subj="all";} paintVKFilter(); paintVK(); });
  $("#vkQ").oninput=e=>{ vkF.q=e.target.value; paintVK(); const q=$("#vkQ"); q.focus(); q.setSelectionRange(q.value.length,q.value.length); };
}
function vkCardHTML(g){
  const [p,...alts]=g.vids;
  const subj=g.subject==="math"?"Maths":g.subject==="sci"?"Science":"SST";
  const altLinks=alts.slice(0,2).map(v=>`<a class="vlink" target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=${v.vid}">▶ ${esc(v.author)}</a>`).join("");
  const searchMore=`<a class="vlink" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(g.concept+" class "+g.cls+" full chapter")}">find another teacher</a>`;
  return `<div class="vk-card"><span class="v-sub">Class ${g.cls} · ${subj}</span><h4>${esc(g.concept)}</h4>
    <a class="vwatch" target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=${p.vid}">
      <img src="https://i.ytimg.com/vi/${p.vid}/mqdefault.jpg" alt="" loading="lazy" width="160" height="90" style="border-radius:10px;flex:0 0 160px;height:auto;max-height:90px;object-fit:cover">
      <span class="vw-t"><b>▶ Watch now — direct link</b><span class="vw-author">${esc(p.author)}</span><span class="vw-title">${esc(p.title)}</span></span>
    </a>
    ${alts.length?`<div class="vlinks">${altLinks}${searchMore}</div>`:`<div class="vlinks">${searchMore}</div>`}
    <div class="watch-plan"><div class="wp-t">Watch plan · auto checkpoints (jump freely — the video's own chapters help)</div>
    ${AUTO_PLAN.map(([t,lab])=>`<div class="vt-row"><b class="t">${t}</b><span>${lab}</span></div>`).join("")}</div></div>`;
}
function paintVK(){
  const host=$("#vkList"); if(!host) return;
  const groups=VIDEO_KIT.filter(g=>
    (vkF.subj==="all"||g.subject===vkF.subj)&&(vkF.cls==="all"||String(g.cls)===vkF.cls)&&(!vkF.q||g.concept.toLowerCase().includes(vkF.q.toLowerCase())));
  host.innerHTML=groups.length?groups.map(g=>vkCardHTML(g)).join(""):`<div class="card"><p class="muted">No match — try another keyword (e.g. "motion", "circle", "democracy").</p></div>`;
}

/* ---------- Interactive labs (12) ---------- */
const ARTIFACTS=[
 {id:"motion",t:"Motion Lab",s:"Set u, a — watch s = ut + ½at² come alive",bg:"#DCEBF6"},
 {id:"atom",t:"Atom Builder",s:"Pick an element — shells fill by the 2n² rule",bg:"#FBE9DF"},
 {id:"circuit",t:"Circuit Lab",s:"Series vs parallel — light the bulbs",bg:"#FFF5ED"},
 {id:"states",t:"States of Matter",s:"Drag temperature — ice → water → steam",bg:"#DCEBF6"},
 {id:"cell",t:"Cell Explorer",s:"Tap organelles, learn their jobs",bg:"#FBE9DF"},
 {id:"sound",t:"Sound Waves",s:"Frequency slider — see the wave, hear the pitch",bg:"#FFF5ED"},
 {id:"timeline",t:"Timeline Explorer",s:"French & Russian revolutions in order",bg:"#FBE9DF"},
 {id:"monsoon",t:"Monsoon Explorer",s:"Season switch — watch the winds flip",bg:"#DCEBF6"},
 {id:"democ",t:"Democracy Detector",s:"Democratic or not? Decide & defend",bg:"#FFF5ED"},
 {id:"india",t:"Physical Features",s:"Tap India's regions — facts on the spot",bg:"#FBE9DF"},
 {id:"identity",t:"Identity Builder",s:"(a+b)² — see it geometrically",bg:"#DCEBF6"},
 {id:"dice",t:"Probability Dice",s:"Roll 100 — watch probability emerge",bg:"#FFF5ED"}
];
function openArtifact(id){
  const a=ARTIFACTS.find(x=>x.id===id); if(!a) return;
  openStage(a.t, "tutor", b=>({
    motion:artMotion, atom:artAtom, circuit:artCircuit, states:artStates, cell:artCell, sound:artSound,
    timeline:artTimeline, monsoon:artMonsoon, democ:artDemoc, india:artIndia, identity:artIdentity, dice:artDice
  }[id](b)));
}
function openLabPicker(preTopic){
  let tiles=ARTIFACTS;
  const q=String(preTopic||"").toLowerCase();
  if(q && !/^\s*(lab|labs|experiment|demo|show)\b/.test(q.replace(/^\s*/,""))){
    const hits=ARTIFACTS.filter(a=>(a.t+" "+a.s).toLowerCase().includes(q.slice(0,10)));
    if(hits.length) tiles=hits;
  }
  openStage("Interactive labs","tutor",b=>{
    b.innerHTML=`<p class="muted" style="margin:0 2px 12px">Touch it, move it, break it, get it. Science labs, SST explorers, Maths builders — one tap each.</p>
    <div class="grid2">${tiles.map(a=>`<div class="art-tile" data-a="${a.id}"><div class="a-ico" style="background:${a.bg}">${a.t[0]}</div><h4>${a.t}</h4><p>${a.s}</p></div>`).join("")}</div>`;
    b.querySelectorAll("[data-a]").forEach(x=>x.onclick=()=>openArtifact(x.dataset.a));
  });
}

/* ---------- Reports (parent daily + teacher heatmap) ---------- */
function openReportsStage(){
  openStage("Reports — family & teachers","report",b=>{
    b.innerHTML=`<div class="tabs-mini" id="repTabs">
      <button class="tm on" data-r="parent">Parent — Daily report</button>
      <button class="tm" data-r="teacher">Teacher — Class view</button>
    </div><div id="repBody"></div>`;
    const paint=(tab)=>{ $("#repBody").innerHTML = tab==="parent"? repParent() : repTeacher();
      $("#repTabs").querySelectorAll(".tm").forEach(t=>{ t.classList.toggle("on",t.dataset.r===tab); t.onclick=()=>paint(t.dataset.r); }); };
    paint("parent");
  });
}
function repParent(){
  const ms=Object.entries(S.mastery).filter(([,v])=>v.seen);
  const touched=ms.length, weak=weakConcepts(3);
  const today=S.trail.filter(t=>new Date(t.t).toDateString()===new Date().toDateString());
  const qs=today.filter(t=>t.ev==="right"||t.ev==="wrong").length;
  const acc=qs?Math.round(100*today.filter(t=>t.ev==="right").length/qs):0;
  const dn=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short"});
  return `<div class="card"><div class="rep-head"><div class="rep-avatar">S</div>
    <div><b style="font-size:16px">Student · Class ${state.student.cls}</b><div class="muted">${dn} · Daily report for parents</div></div></div>
    <div class="stat-grid">
      <div class="stat"><b>${S.streak.n}</b><span>day streak</span></div>
      <div class="stat"><b>${qs}</b><span>questions today</span></div>
      <div class="stat"><b>${qs?acc+"%":"—"}</b><span>accuracy today</span></div>
      <div class="stat"><b>${S.xp}</b><span>total XP</span></div></div>
    ${touched?`<h4 style="margin:14px 0 8px;font-size:14.5px">Concept map</h4>${ms.slice(0,6).map(([k,v])=>`<div class="heat-row"><span class="hl">${esc(conceptName(k))}</span><div style="width:90px;height:8px;border-radius:4px;background:var(--powder)"><i style="display:block;height:100%;width:${Math.round(v.score)}%;background:${v.score>=75?"var(--ok)":v.score>=40?"var(--ocean)":"var(--err)"};border-radius:4px"></i></div><span class="muted" style="min-width:82px;text-align:right;font-size:12px">${PARENT_WORD[v.band-1].split("—")[0]}</span></div>`).join("")}
    ${weak.length?`<div class="askthis" style="margin-top:14px"><b>Tomorrow's focus:</b> ${esc(conceptName(weak[0].k))} — Saathy will rebuild the basics with simpler examples before re-testing.</div>`:""}
    <div class="askthis" style="margin-top:10px"><b>Ask this at dinner:</b> "What's one concept that finally clicked today?" — progress talk beats marks talk.</div>
    <p class="muted" style="margin-top:10px">Privacy wall: parents never see the child's AI chats or doubts — only evidence-based progress.</p>`:
    `<p class="muted">No learning events yet — once the studying starts tonight, this report fills with honest evidence. Take a quiz or run a plan first.</p>`}
    <button class="btn primary sm" style="margin-top:12px" onclick="window.print()">Print / save report</button></div>`;
}
function repTeacher(){
  const ms=Object.entries(S.mastery).filter(([,v])=>v.seen);
  const heat=v=>v>=75?"d4":v>=50?"d3":v>=25?"d2":"d1";
  const dna=Object.values(S.mastery).reduce((a,m)=>{for(const f in m.dna)a[f]=(a[f]||0)+m.dna[f];return a;},{});
  const clusters={}; S.trail.filter(t=>t.ev==="wrong").forEach(t=>{clusters[conceptName(t.key)]=(clusters[conceptName(t.key)]||0)+1;});
  const demo=[["Rhea S.",68],["Imran K.",54],["Ananya P.",81],["Kabir M.",38],["Meera J.",72],["Dev A.",45]];
  return `<div class="card"><h3>Class ${state.student.cls} · Concept heatmap <span class="chip">Morning view</span></h3>
  <p class="muted">${ms.length?"":"No evidence yet — "}${"this student"}'s data plus 6 sample students to preview the class view.</p>
  ${ms.map(([k,v])=>`<div class="heat-row"><span class="hl">${esc(conceptName(k))}</span><span class="muted" style="font-size:12px">Student ${Math.round(v.score)}%</span>${demo.map(([,sc])=>`<div class="heat-dot ${heat(sc)}" title="sample student ${sc}%"></div>`).join("")}</div>`).join("")||`<div class="heat-row"><span class="hl">Run a quiz or plan first — the heatmap builds itself from the evidence trail.</span></div>`}
  <h4 style="margin:16px 0 6px;font-size:14.5px">Doubt clusters (anonymised)</h4>
  ${Object.entries(clusters).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([c,n])=>`<div class="heat-row"><span class="hl">${esc(c)}</span><span class="chip peach">${n} doubts</span></div>`).join("")||`<p class="muted">No doubt clusters yet.</p>`}
  <h4 style="margin:16px 0 6px;font-size:14.5px">Error DNA (why answers go wrong)</h4>
  <div class="row">${["concept","careless","method","guess"].map(f=>`<span class="badge">${f}: ${dna[f]||0}</span>`).join("")}</div>
  <div class="askthis" style="margin-top:14px"><b>Reteach suggestion:</b> ${ms.length?`Start ${esc(conceptName(weakConcepts(1)[0]?weakConcepts(1)[0].k:""))} from the prerequisite — the DNA shows concept gaps, not carelessness.`:"Publish a session; evidence flows in automatically tonight."}</div>
  <button class="btn primary sm" style="margin-top:12px" onclick="window.print()">Print / save</button></div>`;
}

/* ---------- Founder corpus (100 files, pdf/docx/txt, IndexedDB, downloadable) ---------- */
let _idb=null;
function idb(){ return _idb || (_idb = new Promise((res,rej)=>{
  const r = indexedDB.open("saathy_corpus",1);
  r.onupgradeneeded = () => r.result.createObjectStore("files");
  r.onsuccess = ()=>res(r.result); r.onerror = ()=>rej(r.error);
})); }
async function idbPut(id,text){ const db=await idb(); return new Promise((res,rej)=>{ const tx=db.transaction("files","readwrite"); tx.objectStore("files").put(text,id); tx.oncomplete=res; tx.onerror=()=>rej(tx.error); }); }
async function idbGet(id){ const db=await idb(); return new Promise((res,rej)=>{ const tx=db.transaction("files","readonly"); const q=tx.objectStore("files").get(id); q.onsuccess=()=>res(q.result); q.onerror=()=>rej(q.error); }); }
async function idbDel(id){ const db=await idb(); return new Promise((res,rej)=>{ const tx=db.transaction("files","readwrite"); tx.objectStore("files").delete(id,id); tx.oncomplete=res; tx.onerror=()=>rej(tx.error); }); }
function renderCorpus(){
  const card=$("#corpusCard"); if(!card) return;
  const files=S.founder.files||[];
  $("#corpusCount").textContent=`${files.length}/100 used · ≤300 MB each`;
  $("#tfList").innerHTML=files.map((fl,i)=>`
    <div class="tf-item"><div class="tf-ic">${esc((fl.name||"?").split(".").pop().slice(0,3).toUpperCase())}</div>
    <div class="tf-name"><b>${esc(fl.name)}</b><span>${(fl.size/1048576).toFixed(2)} MB · ${fl.chars?fl.chars.toLocaleString()+" chars indexed":"stored raw"}</span></div>
    <button class="btn ghost sm" data-dl="${i}">Download</button><button class="btn ghost sm" data-rm="${i}" style="color:var(--err)">Remove</button></div>`).join("");
  $("#tfList").querySelectorAll("[data-dl]").forEach(btn=>btn.onclick=()=>downloadFile(+btn.dataset.dl));
  $("#tfList").querySelectorAll("[data-rm]").forEach(btn=>btn.onclick=async()=>{ const i=+btn.dataset.rm; const fl=S.founder.files[i]; await idbDel(fl.id); S.founder.files.splice(i,1); save(); renderCorpus(); });
}
async function handleFiles(list){
  const files=[...list]; if(!files.length) return;
  const log=$("#ingestLog");
  for(const file of files){
    if(S.founder.files.length>=100){ log.textContent="Cap reached: 100 files. Remove one to add more."; toast("100-file cap reached","err"); break; }
    if(file.size>300*1048576){ log.textContent=`${file.name}: over 300 MB — skipped.`; toast(file.name+" over 300 MB","err"); continue; }
    log.textContent=`Ingesting ${file.name} (${(file.size/1048576).toFixed(1)} MB)…`;
    try{
      const id="f_"+Date.now()+"_"+Math.random().toString(36).slice(2,7);
      let text="";
      if(/\.(txt|md|csv|json)$/i.test(file.name)) text=await file.text();
      else if(/\.pdf$/i.test(file.name)) text=await pdfToText(file);
      else if(/\.docx$/i.test(file.name)) text=await docxToText(file);
      if(text && text.length>20){
        await idbPut(id,text);
        S.founder.files.push({id,name:file.name,size:file.size,type:file.type||"file",chars:text.length,added:Date.now()});
        log.textContent=`✓ ${file.name} — ${text.length.toLocaleString()} chars indexed into the teaching corpus.`;
      } else {
        await idbPut(id,await file.text().catch(()=> ""));
        S.founder.files.push({id,name:file.name,size:file.size,type:file.type||"file",chars:0,added:Date.now()});
        log.textContent=`Stored ${file.name} (raw). Text extraction unavailable for this format — it stays downloadable.`;
      }
      save(); renderCorpus();
    }catch(e){ log.textContent="Failed: "+file.name+" — "+e.message; }
  }
}
async function pdfToText(file){
  if(!window.pdfjsLib){
    await new Promise((res,rej)=>{ const s=document.createElement("script"); s.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"; s.onload=res; s.onerror=()=>rej(new Error("PDF engine needs internet once")); document.head.appendChild(s); });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
  const buf=await file.arrayBuffer(); const pdf=await pdfjsLib.getDocument({data:buf}).promise;
  let out=[];
  const pages=Math.min(pdf.numPages,400);
  for(let p=1;p<=pages;p++){ const pg=await pdf.getPage(p); const tc=await pg.getTextContent(); out.push(tc.items.map(i=>i.str).join(" ")); }
  return out.join("\n");
}
async function docxToText(file){
  const buf=new Uint8Array(await file.arrayBuffer());
  const view=new DataView(buf.buffer); let i=4, entry=null;
  while(i<buf.length-30){
    if(view.getUint32(i,true)===0x04034b50){
      const method=view.getUint16(i+8,true), csize=view.getUint32(i+18,true);
      const nlen=view.getUint16(i+26,true), elen=view.getUint16(i+28,true);
      const name=new TextDecoder().decode(buf.slice(i+30,i+30+nlen));
      const start=i+30+nlen+elen;
      if(/word\/document\.xml$/.test(name)) { entry=buf.slice(start,start+csize); entry._method=method; break; }
      i=start+csize;
    } else i++;
  }
  if(!entry) return "";
  let xml;
  if(entry._method===8){ const ds=new DecompressionStream("deflate-raw"); const st=new Blob([entry]).stream().pipeThrough(ds); xml=await new Response(st).text(); }
  else xml=new TextDecoder().decode(entry);
  return xml.replace(/<w:p[ >]/g,"\n<w:p ").replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").trim();
}
function downloadFile(i){
  const fl=S.founder.files[i];
  idbGet(fl.id).then(text=>{
    const blob=new Blob([text||""],{type:"text/plain"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download=fl.name.replace(/\.\w+$/,"")+"_training.txt"; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),4000);
    toast("Downloading "+fl.name,"ok");
  });
}

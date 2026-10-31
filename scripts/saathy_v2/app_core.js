/* ============ Saathy v.1 core: state, storage, router, mascot, UI helpers ============ */
"use strict";
(function(){
const $ = (s, r) => (r||document).querySelector(s);
const $$ = (s, r) => Array.from((r||document).querySelectorAll(s));
const esc = s => String(s==null?"":s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
window.$ = $; window.$$ = $$; window.esc = esc;

/* ---------- state ---------- */
const KEY = "saathy_v2_state";
const DEFAULTS = {
  onboarded:false, cls:9, lang:"hinglish",
  bands:{},            // conceptId -> {band, pct, at}
  mastery:{},          // conceptId -> {score, seen, last}
  streak:{count:0, last:""},
  badges:[],
  threads:{}, cur:null,
  api:{provider:"", key:"", model:"", base:"", status:""},
  game:{best:0}, founder:false,
  queue:[],            // requeued question ids (error DNA: guess/careless)
  answers:{}           // conceptId -> {right, wrong, sureWrong}
};
let S = load();
function load(){
  try{ const raw = localStorage.getItem(KEY); if(!raw) return JSON.parse(JSON.stringify(DEFAULTS));
    return Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), JSON.parse(raw)); }
  catch(e){ return JSON.parse(JSON.stringify(DEFAULTS)); }
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }
window.S = S; window.SAVE = save;

/* ---------- day / streak ---------- */
function today(){ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function touchStreak(){
  const t = today();
  if(S.streak.last === t) return;
  const y = new Date(Date.now()-86400000);
  const yt = y.getFullYear()+"-"+String(y.getMonth()+1).padStart(2,"0")+"-"+String(y.getDate()).padStart(2,"0");
  S.streak.count = (S.streak.last === yt) ? S.streak.count + 1 : 1;
  S.streak.last = t; SAVE();
  if(S.streak.count === 3) award("3-day flame");
  if(S.streak.count === 7) award("Week warrior");
  renderStreak();
}
function renderStreak(){ $("#streakN").textContent = S.streak.count || 0; }
window.touchStreak = touchStreak;

/* ---------- badges ---------- */
const BADGE_LIST = {"3-day flame":"3 din ka streak","Week warrior":"7-day streak","First steps":"Pehla concept seekha","Night owl":"11pm pe bhi padhai","Concept crusher":"Ek quiz me 5 sahi","Boss level":"L3 difficulty clear"};
function award(name){ if(S.badges.includes(name)) return; S.badges.push(name); SAVE(); toast("Badge earned: " + (BADGE_LIST[name]||name)); renderBadges(); }
window.award = award;
window.renderBadges = renderBadges;
window.renderStreak = renderStreak;
function renderBadges(){
  $("#stBadges").textContent = S.badges.length;
  $("#homeBadges").innerHTML = S.badges.map(b=>'<span class="badge-chip">★ '+esc(b)+'</span>').join("") || "";
}

/* ---------- toast ---------- */
let toastT;
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("on"); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove("on"), 2400); }
window.toast = toast;

/* ---------- mascot ---------- */
const POSES = {idle:"pose_idle", greet:"pose_happy", think:"pose_thinking", happy:"pose_cheering", excited:"pose_excited", read:"pose_reading", sleep:"pose_sleeping", wink:"pose_wink", explain:"pose_explaining"};
function mascotEl(el, pose, cls){
  if(!el) return;
  el.src = window.ASSETS[POSES[pose]||POSES.idle] || "";
  if(cls!==undefined) el.classList.toggle("mascot-float", !!cls);
}
window.setPose = (pose, ms) => {
  mascotEl($("#hdrAva"), pose);
  mascotEl($("#mascotBig"), pose, true);
  if(ms) setTimeout(()=>setPose("idle"), ms);
};
function pokeMascot(e){
  const el = e.currentTarget;
  el.classList.remove("poke"); void el.offsetWidth; el.classList.add("poke");
  const lines = ["Hee! Tickles. Kya doubt hai bolo?","Main yahin hoon — fire away!","Cloud ko mat ghasito, sawaal maango.","Boing! Ready to teach."];
  toast(lines[Math.floor(Math.random()*lines.length)]);
  setPose("excited"); setTimeout(()=>setPose("idle"), 1600);
}
window.pokeMascot = pokeMascot;

/* ---------- tabs / router ---------- */
let curTab = "home";
function goTab(name){
  curTab = name;
  $$(".tab").forEach(t=>t.classList.toggle("on", t.dataset.tab===name));
  $$(".view").forEach(v=>v.classList.toggle("on", v.id==="view-"+name));
  if(name==="chat") setTimeout(()=>$("#chatInput").focus(), 120);
  if(name==="home") renderHome();
  if(name==="learn") renderLearn();
  if(name==="practice") renderPractice();
  window.scrollTo(0,0);
}
window.goTab = goTab;
$$(".tab").forEach(t=>t.addEventListener("click", ()=>goTab(t.dataset.tab)));

/* ---------- sheets ---------- */
function openSheet(id){ $(id).classList.add("on"); $("#scrim").classList.add("on"); }
function closeSheets(){ $$(".sheet").forEach(s=>s.classList.remove("on")); $("#scrim").classList.remove("on"); }
window.openSheet = openSheet; window.closeSheets = closeSheets;
$("#scrim").addEventListener("click", closeSheets);

/* ---------- settings (always works — the button the user complained about) ---------- */
function openSettings(){
  openSheet("#settingsSheet");
  // reset gate state each open
  $("#pinGate").classList.toggle("hidden", !!S.founder);
  $("#setPanes").classList.toggle("hidden", false);
  $("#founderHead").style.display = S.founder ? "block" : "none";
  $("#founderTools").style.display = S.founder ? "block" : "none";
  $$("#pinBoxes input").forEach(i=>i.value="");
  $("#pinErr").classList.add("hidden");
  renderApiPanel();
}
window.openSettings = openSettings;
$("#settingsBtn").addEventListener("click", e=>{ e.preventDefault(); e.stopPropagation(); openSettings(); });
$("#moreSettings").addEventListener("click", openSettings);
$("#closeSet").addEventListener("click", closeSheets);

/* PIN gate */
(function(){
  const boxes = $$("#pinBoxes input");
  const CODE = "2405";
  function check(){
    const v = boxes.map(b=>b.value).join("");
    if(v.length < 4) return;
    if(v === CODE){ S.founder = true; SAVE(); $("#pinGate").classList.add("hidden"); $("#founderHead").style.display="block"; $("#founderTools").style.display="block"; toast("Founder mode on"); setPose("happy"); setTimeout(()=>setPose("idle"),1600); }
    else { $("#pinErr").classList.remove("hidden"); boxes.forEach(b=>b.value=""); boxes[0].focus(); setPose("wink"); setTimeout(()=>setPose("idle"),1200); }
  }
  boxes.forEach((b,i)=>{
    b.addEventListener("input", ()=>{ b.value = b.value.replace(/\D/g,"").slice(0,1); if(b.value && i<3) boxes[i+1].focus(); check(); });
    b.addEventListener("keydown", e=>{ if(e.key==="Backspace" && !b.value && i>0) boxes[i-1].focus(); });
  });
  $("#pinSkip").addEventListener("click", ()=>{ $("#pinGate").classList.add("hidden"); });
})();

/* preferences */
$("#clsSel").addEventListener("change", e=>{ S.cls = +e.target.value; SAVE(); renderLearn(); renderHome(); toast("Class set to " + S.cls); });
$("#langSel").addEventListener("change", e=>{ S.lang = e.target.value; SAVE(); toast("Tone: " + e.target.options[e.target.selectedIndex].text); });

/* data tools */
$("#backupBtn").addEventListener("click", ()=>{
  const blob = new Blob([JSON.stringify({mastery:S.mastery, bands:S.bands, streak:S.streak, badges:S.badges}, null, 2)], {type:"application/json"});
  dl(blob, "saathy-learning-data.json"); toast("Data exported");
});
$("#resetBtn").addEventListener("click", ()=>{
  if(confirm("Wipe ALL chats, mastery and the API key from this device?")){ localStorage.removeItem(KEY); location.reload(); }
});
$("#exportChatBtn").addEventListener("click", ()=>{
  const msgs = curMsgs();
  if(!msgs.length){ toast("No chat to export yet"); return; }
  const html = '<!doctype html><meta charset="utf-8"><title>Saathy chat export</title><body style="font-family:Manrope,system-ui;max-width:640px;margin:30px auto;padding:0 16px"><h2>Saathy v.1 — chat export</h2>' +
    msgs.map(m=>'<div style="margin:14px 0"><b style="color:'+(m.who==="me"?"#214F78":"#B4552D")+'">'+(m.who==="me"?"You":"Saathy")+"</b><p style='white-space:pre-wrap'>"+esc(m.text)+"</p></div>").join("") +
    '<p style="color:#637C96;font-size:12px">I am Saathy v.1, trained on NCERT modules and books.</p></body>';
  dl(new Blob([html], {type:"text/html"}), "saathy-chat.html");
});
function dl(blob, name){ const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 4000); }

/* ---------- threads ---------- */
function curMsgs(){ return S.threads[S.cur] || (S.threads[S.cur] = []); }
window.curMsgs = curMsgs;
function newThread(){
  S.cur = "t" + Date.now(); S.threads[S.cur] = []; SAVE(); renderMsgs();
}
window.newThread = newThread;

/* ---------- boot ---------- */
function boot(){
  // mascot
  setPose("idle");
  $("#hdrAva").addEventListener("click", pokeMascot);
  $("#mascotBig").addEventListener("click", pokeMascot);
  renderStreak(); renderBadges();
  $("#clsSel").value = String(S.cls); $("#langSel").value = S.lang;
  // greeting by hour
  const h = new Date().getHours();
  const g = h<5 ? "Raat ke padhai warrior" : h<12 ? "Good morning" : h<17 ? "Good afternoon" : h<22 ? "Good evening" : "11pm crew";
  $("#greetH").textContent = g + "! I'm Saathy.";
  updateApiDot();
  goTab("home");
}
function updateApiDot(){
  const on = !!(S.api.key && S.api.provider);
  $("#apiDot").classList.toggle("on", on);
  $("#hdrSub").innerHTML = on
    ? '<span class="dot on"></span>' + esc(S.api.provider) + " connected · " + esc(S.api.model||"")
    : '<span class="dot"></span>offline brain ready · connect API for full power';
}
window.updateApiDot = updateApiDot;

window.STATE = () => S; // live accessor
document.addEventListener("DOMContentLoaded", boot);
if(document.readyState !== "loading") boot();
})();

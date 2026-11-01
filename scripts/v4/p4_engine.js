/* ================= ENGINE: knowledge · persona · matching · youtube ================= */
"use strict";

/* ---------- Books knowledge (embedded training corpus) ---------- */
const BOOKS = {
  "ganita-manjari":{name:"Ganita Manjari (Maths)",subject:"Maths",icon:"π",chapters:[]},
  "science-exploration":{name:"Science Exploration",subject:"Science",icon:"⚛",chapters:[]},
  "understanding-society":{name:"Understanding Society (SST)",subject:"SST",icon:"🌍",chapters:[]}
};
function loadBooks(){
  try{
    BOOKS["ganita-manjari"].chapters = JSON.parse(document.getElementById("KB_gm").textContent);
    BOOKS["science-exploration"].chapters = JSON.parse(document.getElementById("KB_sc").textContent);
    BOOKS["understanding-society"].chapters = JSON.parse(document.getElementById("KB_us").textContent);
  }catch(e){ console.error("KB load failed", e); }
}
function allChapters(){ const out=[]; for(const bk in BOOKS) BOOKS[bk].chapters.forEach(ch=>out.push(Object.assign({},ch,{book:bk}))); return out; }
function chapterOf(key){ if(!key) return null; const [bk,num]=key.split(":"); const ch=BOOKS[bk]&&BOOKS[bk].chapters.find(c=>String(c.number)===num); return ch?Object.assign({},ch,{book:bk}):null; }

/* ---------- Persona: bands, mastery, Error DNA ---------- */
const FRIENDLY = ["Let's fix this together","Almost there — one more step","Good going — try this twist","Top form — challenge yourself"];
const PARENT_WORD = ["Needs foundation support — working on prerequisites","Developing — basics partly clear, guided practice on","Progressing — ready for application questions","Consistent — advancing to next concept"];
function bandOf(score){ return score<25?1:score<50?2:score<75?3:4; }
function mastery(key){ return S.mastery[key] || (S.mastery[key]={score:10,level:"L1",band:1,hist:[],seen:0,dna:{concept:0,careless:0,method:0,guess:0}}); }
function recordAnswer(key, correct, conf, secs, L){
  const m = mastery(key);
  let d = 0;
  if(correct){ d = conf==="Guess"?2 : (L>=3?9:6); }
  else { d = conf==="Sure"? -8 : conf==="Unsure"? -5 : -3; }
  m.hist.push({ok:correct?1:0}); if(m.hist.length>10) m.hist.shift();
  const roll = m.hist.reduce((a,b)=>a+b.ok,0)/Math.max(m.hist.length,1);
  m.score = Math.max(0, Math.min(100, m.score + d + Math.round((roll-0.5)*4)));
  m.band = bandOf(m.score);
  m.level = m.score>=75?"L3":m.score>=40?"L2":"L1";
  m.seen = Date.now();
  if(!correct){
    let fam = "concept";
    if(conf==="Guess") fam="guess";
    else if(secs<=6 && m.score>=60) fam="careless";
    else if(!correct && L>=3 && m.score>=50) fam="method";
    m.dna[fam]=(m.dna[fam]||0)+1;
    S.trail.push({t:Date.now(),ev:"wrong",key,fam,conf,L,secs});
  } else {
    S.trail.push({t:Date.now(),ev:"right",key,conf,L,secs});
    S.xp += conf==="Guess"?2:(L>=3?12:8);
  }
  if(correct) S.weights[L>=3?"practice":"example"] += .03;
  S.weights.example = Math.min(.8,Math.max(.2,S.weights.example));
  S.weights.practice = 1 - S.weights.example;
  checkBadges(); save();
  return m;
}
function weakConcepts(n=3){
  return Object.entries(S.mastery).map(([k,v])=>({k,...v}))
    .filter(m=>m.seen)
    .sort((a,b)=>a.score-b.score).slice(0,n);
}
function decayed(){
  const now=Date.now(), D=5*864e5;
  return Object.entries(S.mastery).filter(([k,v])=>v.seen && v.score>=40 && now-v.seen>D).map(([k])=>k);
}
function conceptName(key){ const [bk,num,sec]=key.split(":"); const ch=chapterOf(bk+":"+num); if(!ch) return key; const s=(ch.sections||[]).find(x=>String(x.id)===sec); return s? s.title + " · " + ch.title : ch.title; }
function checkBadges(){
  const add=(b)=>{ if(!S.badges.includes(b)){ S.badges.push(b); toast("Badge earned: "+b,"ok"); } };
  if(S.xp>=100) add("First Century"); if(S.xp>=500) add("XP Legend");
  if(S.streak.n>=7) add("Week Warrior");
  if(Object.values(S.mastery).some(m=>m.score>=75)) add("Boss Ready");
  if(S.games.mcqBest>=8) add("MCQ Rush Pro");
}
function checkStreak(){
  const today=new Date().toDateString();
  if(S.streak.day!==today){
    const y=new Date(Date.now()-864e5).toDateString();
    S.streak.n = S.streak.day===y ? S.streak.n+1 : 1;
    S.streak.day=today; save();
  }
}

/* ---------- Providers: paste-and-go detection ---------- */
function detectProvider(key){
  if(!key) return null;
  const k=key.trim();
  if(k.startsWith("AIza")) return {provider:"gemini",models:["gemini-2.0-flash","gemini-2.5-flash","gemini-1.5-flash","gemini-1.5-pro"]};
  if(k.startsWith("gsk_")) return {provider:"openai",base:"https://api.groq.com/v1",models:["llama-3.3-70b-versatile","llama-3.1-8b-instant"]};
  if(k.startsWith("sk-")) return {provider:"openai",base:"https://api.openai.com/v1",models:["gpt-4o-mini","gpt-4o"]};
  return null;
}

/* ---------- Identity + the chat instructions (backend features the chat can call) ---------- */
const IDENTITY = "You are Saathy v.1, trained on NCERT modules and books. You are the AI companion of VidhyaSaathy, the school-anchored learning app for Indian Class 9-10 students. Never reveal or discuss any underlying model, company or provider — if asked, reply: 'I am Saathy v.1, trained on NCERT modules and books.'";
const FEATURE_ROUTING = [
  "Backend powers this app ships (the student invokes them by typing in the chat):",
  "- 'plan <chapter>' → the full VidhyaSaathy study loop: level check → concept slides → quiz → game → flashcards → report.",
  "- 'video <topic>' → direct, verified YouTube links from a curated kit (3 teachers per concept).",
  "- 'test me' / 'quiz <topic>' → ladder quiz with confidence taps. '- game' → five learning games. '- flashcards <topic>' → revision sprint.",
  "- 'report' → honest parent daily note + teacher heatmap from real evidence. '- lab <name>' → 12 interactive labs.",
  "When the student clearly wants one of these, tell them the exact word to type (for example: type 'plan Motion' or 'video gravitation').",
  "NEVER invent YouTube links, video IDs, watch-page URLs or mm:ss timestamps. If the student asks for a video, tell them to type 'video <topic>' so the verified kit serves real links."
].join("\n");

/* ---------- honest offline brain (books run without a key) ---------- */
function offlineBrainSuggest(q){
  const ql=q.toLowerCase();
  if(/\bplan\b|schedule|kya padhu|what to study/.test(ql)) return "Type **plan** + your chapter (for example: plan Motion) and the full loop runs right here — level check → slides → quiz → game → flashcards → report.";
  if(/\bvideo|youtube\b/.test(ql)) return "Type **video** + your topic (for example: video gravitation) and the verified kit gives you direct links — 3 teachers per concept.";
  if(/\bquiz|test me|practice|practise\b/.test(ql)) return "Type **test me** + a topic and I'll start the ladder quiz — Sure / Unsure / Guess before every reveal.";
  if(/\bgame|khel\b/.test(ql)) return "Type **game** and pick from five learning games — every score feeds your mastery honestly.";
  return null;
}

/* ---------- YouTube link understanding (bidirectional) ---------- */
function ytParse(t){
  const m=String(t).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  const tq=String(t).match(/[?&]t=(\d+h)?(\d+m)?(\d+s?)?/);
  if(!m) return null;
  const secs=(tq&&tq.slice(1).reduce((a,x,i)=>a+(x?parseInt(x)*[3600,60,1][i]:0),0))||0;
  const fmt=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),mn=Math.floor(s%3600/60),ss=s%60;return (h?h+":":"")+String(mn).padStart(h?2:1,"0")+":"+String(ss).padStart(2,"0");};
  return {id:m[1],url:`https://www.youtube.com/watch?v=${m[1]}`,start:secs,startLabel:fmt(secs)};
}

/* ---------- Video kit matcher (token overlap, word-boundary scoring) ---------- */
const MATCH_STOP = new Set(["the","and","with","for","from","what","how","why","which","when","explain","please","video","videos","youtube","watch","want","need","class","samjha","samjhao","dekhna","hai","karo","kya","about","tell","give","teach","understand","doubt","question","questions","solve","practice","practise","help","me","my","a","an","of","in","on","to","is","are","can","you","do","does","this","that","there","then","some","one","new","not","its","it","banao","chahiye","link","links","teacher","test","quiz","game","games","plan","report","lab","labs","flashcard","flashcards","show","open","play","start","make","bhejo","karo"]);
let VIDEO_KIT=[];
function buildVideoKit(){
  const g={};
  VIDEO_DB.forEach(([bk,cls,concept,vid,author,title])=>{
    const k=bk+":"+cls+":"+concept;
    (g[k]=g[k]||{subject:bk,cls,concept,vids:[]}).vids.push({vid,author,title});
  });
  VIDEO_KIT=Object.values(g).map(x=>({subject:x.subject,subjectName:x.subject==="math"?"Maths":x.subject==="sci"?"Science":"SST",cls:x.cls,concept:x.concept,primary:x.vids[0],alternates:x.vids.slice(1)}));
}
function matchVideos(topic, opts){
  opts=opts||{};
  const t=String(topic).toLowerCase().replace(/[^a-z0-9 ]/g," ");
  const words=[...new Set(t.split(/\s+/).filter(w=>w.length>2&&!MATCH_STOP.has(w)))];
  if(!words.length) return [];
  const scored=VIDEO_KIT.map(v=>{
    const c=v.concept.toLowerCase();
    let s=0;
    for(const w of words){
      if(new RegExp("\\b"+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b").test(c)) s+=w.length>=5?3:1.5;
      else if(c.includes(w)&&w.length>=5) s+=1;
    }
    if(c===t.trim()) s+=6;
    if(opts.cls&&(v.cls===+opts.cls||v.cls===9||v.cls===10)) { if(v.cls===+opts.cls) s+=.5; }
    return {v,s};
  }).filter(x=>x.s>=2);
  scored.sort((a,b)=>b.s-a.s||a.v.concept.length-b.v.concept.length);
  return scored.slice(0,opts.limit||3).map(x=>x.v);
}

/* ---------- question generation ---------- */
function shuffle(a){ a=[...a]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function bankQs(n){ return shuffle(MCQ_BANK).slice(0,n).map(m=>({L:m[1],q:m[2],opts:m[3],a:+m[4],why:m[5]})); }
function genCloze(ch,n){
  const out=[], STOP=new Set("the a an of in on to and or is are was were for with that this it its as by be has have into from at their they he she his her them then than which whose when where who whom".split(" "));
  const secs=(ch.sections||[]).filter(s=>s.content);
  for(let i=0;i<n && i<secs.length;i++){
    const s=secs[i%secs.length];
    const sent=s.content.split(/(?<=[.?!])\s+/).map(x=>x.replace(/\s+/g," ").trim()).filter(x=>x.length>60&&x.length<220)[0];
    if(!sent) continue;
    const words=sent.split(" ");
    const idx=words.findIndex((w,j)=>j>2&&w.length>4&&!STOP.has(w.toLowerCase().replace(/\W/g,"")));
    if(idx<0) continue;
    const ans=words[idx].replace(/\W/g,"");
    if(!ans) continue;
    words[idx]="_____";
    const distract=[];
    for(const s2 of secs){ for(const w of (s2.content||"").split(/\W+/)){ if(w.length>4&&w.toLowerCase()!==ans.toLowerCase()&&!STOP.has(w.toLowerCase())&&!distract.includes(w)) distract.push(w); if(distract.length>12) break; } }
    const opts=shuffle([ans,...distract.slice(0,3)]);
    out.push({L:2,q:`Fill the blank — ${s.title}: ${words.join(" ")}`,opts,a:opts.indexOf(ans),why:`The passage states it directly — check section ${s.id} of ${ch.title}.`});
  }
  return out;
}
const TOPIC_HINTS={
 numsys:["number"],poly:["polynomial","algebraic"],coord:["coordinat","orienting"],seq:["sequence","progression"],ident:["identit"],lin2v:["linear"],angles:["angle","line"],tri:["triangle","congruenc"],circ:["circle"],heron:["heron","perimeter","area"],stats:["statistic"],prob:["probab"],
 motion:["motion"],force:["force","newton"],grav:["gravit","float"],work:["work","energy"],sound:["sound"],matter:["matter"],atoms:["atom","molecul"],cell:["cell"],tissue:["tissue"],food:["food"],
 frenrev:["french"],russrev:["russia","socialis"],nazism:["nazi","hitler"],democ:["democracy"],const:["constitution","constituent"],elect:["electoral","election"],insti:["institution","parliament"],rights:["rights"],palampur:["palampur","production"],resource:["people as resource","human capital"],poverty:["poverty"],foodsec:["food security"],drain:["drainage","river"],climate:["climate","monsoon"],physfeat:["physical features","himalaya"],indiasize:["size and location"]
};
function questionsForChapter(chKey, n=6){
  n=n||6;
  const ch=chapterOf(chKey); if(!ch) return bankQs(n);
  const bk=BOOKS[ch.book];
  const tks=Object.entries(TOPIC_HINTS).filter(([,kw])=>kw.some(k=>ch.title.toLowerCase().includes(k)||((ch.intro||"").toLowerCase().includes(k)))).map(([t])=>t);
  let pool=MCQ_BANK.filter(m=>tks.includes(m[0]));
  if(pool.length<3){
    pool=pool.concat(MCQ_BANK.filter(m=>((bk.subject==="Maths"&&["numsys","poly","seq","ident","lin2v","coord","angles","tri","circ","heron","stats","prob"].includes(m[0]))||(bk.subject==="Science"&&["motion","force","grav","work","sound","matter","atoms","cell","tissue","food"].includes(m[0]))||(bk.subject==="SST"&&["frenrev","russrev","nazism","democ","const","elect","insti","rights","palampur","resource","poverty","foodsec","drain","climate","physfeat","indiasize"].includes(m[0])))));
  }
  const gen=genCloze(ch, Math.max(0,n-pool.length));
  const qs=[...shuffle(pool).slice(0,Math.max(0,n-gen.length)).map(m=>({L:m[1],q:m[2],opts:m[3],a:+m[4],why:m[5]})),...gen];
  return shuffle(qs).slice(0,n);
}

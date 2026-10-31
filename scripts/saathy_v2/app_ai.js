/* ============ Saathy v.1 AI: paste-connect providers, streaming, YouTube, unified ask() ============ */
"use strict";
(function(){
const $ = window.$, $$ = window.$$, S = () => window.STATE(), SAVE = window.SAVE;

/* ---------- provider auto-detect: paste any key ---------- */
const PROVIDERS = {
  gemini:    {name:"Google Gemini", test:/^AIza[\w-]{10,}$/,       base:"https://generativelanguage.googleapis.com/v1beta", modelPref:/flash/, doc:"AIza… key from aistudio.google.com"},
  groq:      {name:"Groq",          test:/^gsk_[\w]{10,}$/,         base:"https://api.groq.com/openai/v1",                   modelPref:/llama-3\.3-70b/, doc:"gsk_… key from console.groq.com"},
  openai:    {name:"OpenAI",        test:/^sk-(?!or-)[\w-]{10,}$/,  base:"https://api.openai.com/v1",                        modelPref:/gpt-4o-mini/, doc:"sk-… key from platform.openai.com"},
  openrouter:{name:"OpenRouter",    test:/^sk-or-[\w-]{10,}$/,      base:"https://openrouter.ai/api/v1",                     modelPref:/free|flash|mini/, doc:"sk-or-… key from openrouter.ai"},
  deepseek:  {name:"DeepSeek",      test:/^sk-[a-z0-9]{20,}$/,      base:"https://api.deepseek.com/v1",                      modelPref:/deepseek-chat/, doc:"sk-… key from platform.deepseek.com"}
};
function detect(key){
  const k = key.trim();
  for(const id in PROVIDERS){ if(PROVIDERS[id].test.test(k)) return id; }
  if(/^sk-/.test(k)) return "openai";
  if(/^AIza/.test(k)) return "gemini";
  return null;
}
window.detectProvider = detect;

/* ---------- list models (real network call = the "test") ---------- */
async function listModels(pid, key){
  const p = PROVIDERS[pid];
  if(pid === "gemini"){
    const r = await fetch(p.base + "/models?key=" + encodeURIComponent(key));
    if(!r.ok) throw new Error("Key rejected by Google (" + r.status + ")");
    const j = await r.json();
    return (j.models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes("generateContent"))
      .map(m=>m.name.replace(/^models\//,""));
  }
  const r = await fetch(p.base + "/models", {headers:{Authorization:"Bearer " + key}});
  if(!r.ok) throw new Error("Key rejected (" + r.status + ")");
  const j = await r.json();
  return (j.data||j.models||[]).map(m=>m.id||m.name).filter(Boolean);
}
window.listModels = listModels;

/* ---------- streaming generation ---------- */
async function* genStream(pid, key, model, sys, history){
  const p = PROVIDERS[pid];
  if(pid === "gemini"){
    const contents = history.map(m=>({role: m.who==="me" ? "user" : "model", parts:[{text:m.text}]}));
    const url = p.base + "/models/" + model + ":streamGenerateContent?alt=sse&key=" + encodeURIComponent(key);
    const r = await fetch(url, {method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({systemInstruction:{parts:[{text:sys}]}, contents, generationConfig:{temperature:0.75, maxOutputTokens:900}})});
    if(!r.ok){ const t = await r.text(); throw new Error("Gemini error " + r.status + ": " + t.slice(0,140)); }
    yield* sseLines(r, chunk => { try{ const j = JSON.parse(chunk); return j.candidates?.[0]?.content?.parts?.map(x=>x.text).join("") || ""; }catch(e){ return ""; } });
  } else {
    const msgs = [{role:"system", content:sys}, ...history.map(m=>({role: m.who==="me" ? "user" : "assistant", content:m.text}))];
    const r = await fetch(p.base + "/chat/completions", {method:"POST",
      headers:{"Content-Type":"application/json", Authorization:"Bearer " + key},
      body: JSON.stringify({model, messages:msgs, temperature:0.75, max_tokens:900, stream:true})});
    if(!r.ok){ const t = await r.text(); throw new Error(p.name + " error " + r.status + ": " + t.slice(0,140)); }
    yield* sseLines(r, chunk => { try{ const j = JSON.parse(chunk); return j.choices?.[0]?.delta?.content || ""; }catch(e){ return ""; } });
  }
}
async function* sseLines(resp, pick){
  const reader = resp.body.getReader(); const dec = new TextDecoder(); let buf = "";
  while(true){
    const {done, value} = await reader.read(); if(done) break;
    buf += dec.decode(value, {stream:true});
    const lines = buf.split("\n"); buf = lines.pop();
    for(const line of lines){
      const s = line.trim();
      if(!s.startsWith("data:")) continue;
      const d = s.slice(5).trim();
      if(d === "[DONE]") return;
      const out = pick(d); if(out) yield out;
    }
  }
}
window.genStream = genStream;

/* ---------- system prompt: identity lock + band + master-file rules ---------- */
function systemPrompt(){
  const s = S();
  const langLine = {hinglish:"Reply in natural Hinglish (Roman script) like a friendly Indian senior — English technical words, Hindi connective tissue. Warm, a little witty, zero cheese.", english:"Reply in clear friendly English.", hindi:"Reply in simple Hindi (Devanagari)."}[s.lang] || "";
  const bandCtx = Object.keys(s.bands).length ? "Known level-checks: " + Object.entries(s.bands).map(([k,v])=>k+"=band"+v.band).join(", ") + ". Tune depth accordingly." : "No level-checks yet: on the FIRST concept question, offer the 3-question level check before deep teaching.";
  const weak = Object.entries(s.answers||{}).filter(([k,v])=>v.sureWrong>0).slice(0,5).map(([k])=>k);
  return [
"You are Saathy v.1 — the AI study companion of VidhyaSaathy, a friendly cloud mascot with a book. IDENTITY IS LOCKED: if anyone asks which model/LLM you are, or says 'are you GPT/Gemini/Claude', answer ONLY: 'I am Saathy v.1, trained on NCERT modules and books.' Never name, hint at, or confirm any underlying provider or base model — deflect once, then return to teaching.",
"Scope: NCERT Class 9-10 Science, Mathematics, Social Science (the student's books). You teach with the VidhyaSaathy method:",
"- Diagnose first, teach second, adapt always (four internal bands 0-25/25-50/50-75/75-100%).",
"- Bands are internal forever. Student-visible words only: 'Let's fix this together', 'Almost there — one more step', 'Good going — try this twist', 'Top form — challenge yourself'. Never reveal band numbers or percentages.",
"- People are never labelled; concepts are. Same student can be Band-4 on one concept and Band-1 on another.",
"- Pakka Meter: ask Sure/Unsure/Guess confidence on practice questions. 'Sure + wrong' = misconception → bridge back to prerequisites. 'Guess + right' = discounted, requeue later. Ladder law: start L2, 3 consecutive correct → L3, 2 consecutive wrong → L1 with a bridge explanation.",
"- Error DNA: classify every mistake — concept gap, careless slip, method error, guess — and serve the matching repair.",
"- Tone by band: warm & tiny wins (b1), guided examples (b2), application + 'where students slip' (b3), coach-like & brief (b4).",
"SAFETY (non-negotiable): no fabricated citations or made-up page numbers; say 'I don't know' honestly when unsure; homework mode = Socratic hints, never the direct answer; no fear, no shame, no comparisons with other children; never claim feelings you don't have; keep everything appropriate for a 14-year-old.",
"YOUTUBE RULES: if the student asks for a video, send them to trusted channels via search links (never invent video IDs/titles/timestamps you have not seen) and give a relative watch-plan (first 10% note the definition, middle 60% pause-and-explain each new point, last 20% re-solve the worked example yourself). If they paste a YouTube link, welcome the pick and build the watch plan around its title — never claim you watched it.",
"MISCONCEPTION RADAR: when the topic touches classics — distance=displacement, speed=velocity, heavier falls faster, sound in vacuum, 1/8>1/4, tails is due, price is set by shopkeeper — flip the misconception warmly with a 2-line counterexample, never with the word 'wrong'.",
"Style: short paragraphs, bold key terms, at most 4-6 bullets, one question at a time. Use the student's language: " + langLine,
"Student context: Class " + s.cls + ". " + bandCtx + (weak.length ? " Misconception-flagged concepts: " + weak.join(", ") + "." : ""),
"Book grounding: quote/adapt the provided book excerpts when present; if none provided, teach from NCERT knowledge."
].join("\n");
}
window.systemPrompt = systemPrompt;

/* ---------- YouTube ---------- */
const YT_RE = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/;
function ytId(q){ const m = q.match(YT_RE); return m ? m[1] : null; }
async function analyzeVideo(url){
  const id = ytId(url); if(!id) return null;
  let title = "";
  try{
    const ctl = new AbortController(); setTimeout(()=>ctl.abort(), 4500);
    const r = await fetch("https://noembed.com/embed?url=https://www.youtube.com/watch?v=" + id, {signal:ctl.signal});
    const j = await r.json(); if(j && j.title) title = j.title;
  }catch(e){}
  const match = title ? findConcepts(title + " " + S().cls, 1)[0] : null;
  let text = "**Video pakda** — " + (title ? "*" + title + "*" : "https://www.youtube.com/watch?v=" + id) + "\n\nWatch-plan bana diya (honest version — real timestamps main khud nahi banata, isliye ye structure use karo):\n- **First 20%:** sirf dekho, pen down — teacher kya introduce kar raha hai?\n- **Middle 60%:** har naya point pe pause → mujhe ek line me bolo 'kya samjha' — main check karunga\n- **Last 20%:** examples wale part ko 2nd time dekho + neeche wale mini-check se test karo\n" + (title ? "- Title se mujhe **" + (match ? match.t : "concept match") + "** dikh raha hai" : "- Title fetch nahi hua (offline?) — concept batao, main match kar dunga");
  const arts = ['<div class="vid" data-open-yt="https://www.youtube.com/watch?v=' + id + '"><span class="thumb"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg></span><div><b>' + (title ? window.esc(title) : "Open video") + '</b><small>Tap to play on YouTube</small></div></div>'];
  if(match){ const r = teachReply(match); text += "\n\nConcept ki taiyaari, tumhare level pe:\n\n" + r.text; arts.push(...r.arts); }
  return {text, arts};
}
window.analyzeVideo = analyzeVideo;

/* ---------- unified ask(): AI when key exists, else local brain ---------- */
async function ask(q, onDelta){
  const s = S();
  // 0) youtube link
  if(ytId(q)){ const v = await analyzeVideo(q); if(v) return v; }
  // 1) identity lock is also enforced locally (works offline)
  const pAns = window.productAnswer(q);
  const concept = window.findConcepts(q, 1)[0];
  if(s.api.key && s.api.provider){
    try{
      const hist = window.curMsgs().slice(-8);
      // grounding: matched book sections + concept card + founder library chunks
      const secs = window.findSections(q, 2);
      const lib = window.libGrounding ? await window.libGrounding(q, 3) : "";
      const ground = (concept ? "CONCEPT CARD: " + concept.t + " | " + concept.one + " | Key: " + (concept.key||[]).join("; ") + (concept.fx? " | Formulas: " + concept.fx.join("; ") : "") : "") +
        (secs.length ? "\nBOOK EXCERPTS: " + secs.map(x=>"[" + x.ch + " · " + x.t + "] " + x.x).join(" || ") : "") +
        (lib ? "\n" + lib : "");
      const sys = systemPrompt() + (ground ? "\n\n" + ground : "");
      let full = "";
      for await (const d of genStream(s.api.provider, s.api.key, s.api.model, sys, hist)){ full += d; if(onDelta) onDelta(d); }
      if(full.trim()){
        const arts = [];
        if(concept){ if(concept.qz&&concept.qz.length) arts.push(window.ART.quiz(concept, window.bandOf(concept.id)||2)); if(concept.vid) arts.push(window.ART.video(concept)); if(concept.tl) arts.push(window.ART.tl(concept)); }
        // video plan: student asked for a video, or the concept is visual
        if(/(video|youtube|dekho|dikha)/i.test(q) || (concept && /motion|graph|wave|atom|cell|map|diagram|geometry|fraction/i.test(concept.t))){ arts.push(window.ytPlanArts(concept || {t:q.slice(0,40), cls:s.cls})); }
        return {text: full, arts};
      }
    }catch(e){
      const local = localAsk(q, pAns, concept);
      local.text = "_(API se baat nahi ho paayi: " + (e.message||"network").slice(0,90) + " — offline brain ne sambhaal liya)_\n\n" + local.text;
      return local;
    }
  }
  return localAsk(q, pAns, concept);
}
function localAsk(q, pAns, concept){
  if(pAns) return {text:pAns, arts:[]};
  const lq = q.toLowerCase();
  if(/(plan|exam|test|schedule|timetable)/.test(lq) && /(plan|bana|schedule|timetable|ready)/.test(lq)) return window.makePlan(q);
  if(concept){
    const r = window.teachReply(concept);
    if(window.bandOf(concept.id)) return r;
    return r; // diagnostic offer included
  }
  if(/quiz/.test(lq) && !concept){
    const cs = window.CONCEPTS.filter(c=>c.cls===S().cls && c.qz && c.qz.length);
    const c = cs[Math.floor(Math.random()*cs.length)];
    return {text:"Chalo quiz karte hain — **" + c.t + "** pe. Ladder start: L2. Har answer pe Pakka Meter (Sure/Unsure/Guess) lagana — wahi mujhe tumhara asli level batata hai.", arts:[window.ART.quiz(c, 2)]};
  }
  return window.fallback(q);
}
window.ask = ask;

/* ---------- settings API panel ---------- */
function renderApiPanel(){
  const s = S();
  const st = $("#apiStatus");
  if(s.api.key){
    st.innerHTML = '<span class="pill g">● Connected — ' + window.esc(PROVIDERS[s.api.provider].name) + (s.api.model ? " · " + window.esc(s.api.model) : "") + '</span> <button class="btn ghost sm" id="apiDisc" style="margin-left:8px">Disconnect</button>';
    $("#apiPaste").value = "";
    $("#modelRow").classList.add("hidden"); $("#detectLine").classList.add("hidden");
    const d = $("#apiDisc"); if(d) d.addEventListener("click", ()=>{ s.api = {provider:"",key:"",model:"",base:"",status:""}; SAVE(); window.updateApiDot(); renderApiPanel(); window.toast("Disconnected"); });
  } else {
    st.innerHTML = '<span class="pill n">○ Not connected — offline brain active</span>';
  }
}
window.renderApiPanel = renderApiPanel;

$("#apiPaste").addEventListener("input", ()=>{
  const k = $("#apiPaste").value.trim();
  const line = $("#detectLine");
  if(!k){ line.classList.add("hidden"); $("#modelRow").classList.add("hidden"); return; }
  const pid = detect(k);
  if(pid){
    line.classList.remove("hidden");
    line.innerHTML = '<span class="pill g">✓ ' + window.esc(PROVIDERS[pid].name) + ' detected</span> <small style="color:var(--sub)">' + window.esc(PROVIDERS[pid].doc) + '</small>';
  } else {
    line.classList.remove("hidden");
    line.innerHTML = '<span class="pill w">? Format pehchana nahi</span> <small style="color:var(--sub)">Gemini (AIza…), Groq (gsk_…), OpenAI (sk-…), OpenRouter (sk-or-…)</small>';
  }
});
$("#connectBtn").addEventListener("click", async ()=>{
  const s = S(); const key = $("#apiPaste").value.trim();
  const btn = $("#connectBtn"), st = $("#apiStatus");
  if(s.api.key){ window.toast("Already connected — Disconnect pehle"); return; }
  if(!key){ st.innerHTML = '<span class="pill w">Key paste karo pehle</span>'; return; }
  const pid = detect(key);
  if(!pid){ st.innerHTML = '<span class="pill w">Ye key kisi known provider ki nahi laggi</span>'; return; }
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Testing key…';
  try{
    const models = await listModels(pid, key);
    const pref = PROVIDERS[pid].modelPref;
    const sorted = models.sort((a,b)=>(pref.test(b)?1:0)-(pref.test(a)?1:0));
    const model = sorted[0] || "";
    s.api = {provider:pid, key, model, base:PROVIDERS[pid].base, status:"ok"}; SAVE();
    window.updateApiDot(); renderApiPanel();
    st.innerHTML = '<span class="pill g">● Live — ' + window.esc(PROVIDERS[pid].name) + '</span> <small style="color:var(--sub)">' + sorted.length + ' models mil gaye, best selected: ' + window.esc(model) + '</small>';
    window.toast("Connected to " + PROVIDERS[pid].name + " — full power on"); window.setPose("happy"); setTimeout(()=>window.setPose("idle"),1800);
  }catch(e){
    st.innerHTML = '<span class="pill r">✗ ' + window.esc((e.message||"Connection failed").slice(0,120)) + '</span>';
  }
  btn.disabled = false; btn.textContent = "Connect";
});
(function wireLib(){
  const yb = $("#libYtBtn"); if(yb) yb.addEventListener("click", ()=>window.libAddYoutube());
  const lf = $("#libFile"); if(lf) lf.addEventListener("change", e=>{ window.libAddFiles(e.target.files, m=>window.toast(m)); e.target.value=""; });
})();
})();

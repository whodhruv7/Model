function artMotion(b){
  b.innerHTML=`<div class="art-stage"><h4 style="margin-bottom:8px">v = u + at · s = ut + ½at²</h4>
  <div class="sim-ctl"><span class="muted" style="min-width:86px">u (m/s)</span><input type="range" id="mU" min="0" max="30" value="5"><span class="sim-val" id="mUv">5</span></div>
  <div class="sim-ctl"><span class="muted" style="min-width:86px">a (m/s²)</span><input type="range" id="mA" min="-5" max="10" value="2"><span class="sim-val" id="mAv">2</span></div>
  <div id="mTable" style="margin-top:10px"></div></div>`;
  const draw=()=>{ const u=+$("#mU").value,a=+$("#mA").value; $("#mUv").textContent=u; $("#mAv").textContent=a;
    $("#mTable").innerHTML=`<table style="width:100%;font-size:14px;text-align:center;border-collapse:collapse"><tr><th>t(s)</th><th>v(m/s)</th><th>s(m)</th></tr>`+
    [0,1,2,3,4,5].map(t=>{const v=u+a*t,s=u*t+.5*a*t*t;return `<tr style="border-top:1px dashed var(--border)"><td>${t}</td><td>${v}</td><td>${s}</td></tr>`}).join("")+"</table>"+
    `<p class="muted" style="margin-top:8px">a<0 slows it down (deceleration) — exactly why negative acceleration is signed.</p>`;
  };
  $("#mU").oninput=draw; $("#mA").oninput=draw; draw();
}
function artAtom(b){
  const EL=[["H",1],["He",2],["Li",3],["Be",4],["B",5],["C",6],["N",7],["O",8],["F",9],["Ne",10],["Na",11],["Mg",12],["Al",13],["Si",14],["P",15],["S",16],["Cl",17],["Ar",18],["K",19],["Ca",20]];
  b.innerHTML=`<div class="art-stage"><div class="sim-ctl"><span class="muted">Element</span><select id="aEl" style="padding:9px 12px;border-radius:10px;border:1.5px solid var(--border)">${EL.map((e,i)=>`<option value="${i}" ${e[1]===6?"selected":""}>${e[0]} (Z=${e[1]})</option>`).join("")}</select></div>
  <div class="atom-shell" id="aShells"></div><p class="muted" id="aNote" style="text-align:center"></p></div>`;
  const draw=()=>{ const [sym,Z]=EL[+$("#aEl").value];
    const caps=[2,8,8,2]; const shells=[]; let left=Z;
    for(const c of caps){ const take=Math.min(left,c); shells.push(take); left-=take; if(!left)break; }
    $("#aShells").innerHTML=`<div class="atom-orb"><b>${sym}</b>p+n</div>`+shells.map(s=>`<div class="atom-orb"><b>${s}</b>e⁻</div>`).join("");
    $("#aNote").textContent=`Z=${Z} → ${Z} protons, ${Z} electrons in ${shells.length} shell(s): ${shells.join(", ")}. Valence shell: ${shells[shells.length-1]}.`;
  };
  $("#aEl").onchange=draw; draw();
}
function artCircuit(b){
  b.innerHTML=`<div class="art-stage"><div class="row" style="justify-content:center">
  <button class="pill on" id="cSer">Series</button><button class="pill" id="cPar">Parallel</button>
  <span class="muted" style="min-width:80px">Bulbs: <b id="cN">3</b></span><input type="range" id="cR" min="1" max="4" value="3" style="max-width:130px"></div>
  <div class="circuit" id="cBulbs"></div><p class="muted" id="cNote" style="text-align:center"></p></div>`;
  let par=false;
  const draw=()=>{ const n=+$("#cR").value;
    $("#cSer").classList.toggle("on",!par); $("#cPar").classList.toggle("on",par);
    $("#cBulbs").innerHTML=[...Array(n)].map((_,i)=>`<div class="c-bulb ${par?"lit":n===1?"lit":""}" style="${par?"":"opacity:"+(1-(n-1)*.18)}">B${i+1}</div>`).join("")+`<div class="atom-orb"><b>⎓</b>cell</div>`;
    $("#cNote").textContent=par?`Parallel: every bulb gets full voltage — all shine bright. Break one, rest still glow.`:`Series: current is same, voltage splits across ${n} bulbs — each dims. Break one, all die.`;
  };
  $("#cSer").onclick=()=>{par=false;draw();}; $("#cPar").onclick=()=>{par=true;draw();}; $("#cR").oninput=()=>{$("#cN").textContent=$("#cR").value;draw();}; draw();
}
function artStates(b){
  b.innerHTML=`<div class="art-stage"><div class="sim-ctl"><span class="muted" style="min-width:80px">Temp (°C)</span><input type="range" id="sT" min="-20" max="130" value="25"><span class="sim-val" id="sTv">25</span></div>
  <div id="sBox" style="text-align:center;font-size:44px;min-height:70px"></div><p class="muted" id="sNote" style="text-align:center"></p></div>`;
  const draw=()=>{ const t=+$("#sT").value; $("#sTv").textContent=t;
    let box,note;
    if(t<0){ box="▪ ▪ ▪"; note="Solid — particles vibrate in fixed spots. Strong forces, fixed shape."; }
    else if(t<100){ box="● ● ●"; note="Liquid — particles slide past each other. Fixed volume, takes container's shape."; }
    else { box="· · ·   · · ·"; note="Gas — particles fly free. Diffusion, compressible, fills everything."; }
    if(t===0)note="Melting point of ice — phase change, temperature pauses while latent heat works.";
    if(t===100)note="Boiling point — latent heat of vaporisation, temperature holds at 100 °C.";
    $("#sBox").textContent=box; $("#sNote").textContent=note;
  };
  $("#sT").oninput=draw; draw();
}
function artCell(b){
  const parts=[["Nucleus","Control room — holds chromosomes (DNA), directs all activity"],["Mitochondria","Powerhouse — releases energy as ATP from food"],["Chloroplast","(plants only) — photosynthesis kitchen, holds chlorophyll"],["Ribosome","Protein factory of the cell"],["Plasma membrane","Selectively permeable gatekeeper — osmosis lives here"],["Cell wall","(plants only) — rigid cellulose armour"],["Vacuole","Storage tank — sap in plants, big and central"],["Lysosome","Suicide bag — cleanup crew, digests worn parts"]];
  b.innerHTML=`<div class="art-stage"><div class="cell-map">${parts.map((p,i)=>`<div class="cell-part" data-i="${i}">${p[0]}</div>`).join("")}</div><div class="card" id="cInfo" style="margin:12px 0 0;background:var(--cream)">Tap an organelle — its story appears here.</div></div>`;
  b.querySelectorAll(".cell-part").forEach(x=>x.onclick=()=>{ b.querySelectorAll(".cell-part").forEach(y=>y.classList.remove("on")); x.classList.add("on"); $("#cInfo").innerHTML=`<b>${parts[+x.dataset.i][0]}</b><p class="muted" style="margin:6px 0 0">${parts[+x.dataset.i][1]}</p>`; });
}
function artSound(b){
  b.innerHTML=`<div class="art-stage"><div class="sim-ctl"><span class="muted" style="min-width:86px">Frequency (Hz)</span><input type="range" id="sF" min="60" max="600" value="220"><span class="sim-val" id="sFv">220</span></div>
  <div id="sWave" style="display:flex;gap:3px;align-items:flex-end;height:90px;margin:14px 0"></div><p class="muted" id="sN" style="text-align:center"></p>
  <button class="btn peach sm" id="sPlay">Play the tone</button></div>`;
  let ac=null;
  const draw=()=>{ const f=+$("#sF").value; $("#sFv").textContent=f;
    $("#sWave").innerHTML=[...Array(40)].map((_,i)=>`<div style="width:7px;height:${38+34*Math.sin(i*f/40)}px;background:var(--ocean);border-radius:4px"></div>`).join("");
    $("#sN").textContent=`f = ${f} Hz — higher frequency = higher pitch. Amplitude (height) = loudness.`;
  };
  $("#sF").oninput=draw;
  $("#sPlay").onclick=()=>{ try{ ac=ac||new (window.AudioContext||window.webkitAudioContext)(); const o=ac.createOscillator(),g=ac.createGain(); o.frequency.value=+$("#sF").value; o.type="sine"; g.gain.value=.08; o.connect(g); g.connect(ac.destination); o.start(); setTimeout(()=>o.stop(),600); }catch(e){ toast("Audio not available here"); } };
  draw();
}
function artTimeline(b){
  const EV={ "1789":["Bastille falls","Rioters storm the Bastille — feudal order cracks. France becomes a constitutional monarchy by 1791."],
    "1791":["Constitution of 1791","Powers separated — National Assembly elected by active citizens (men 25+, paying taxes)."],
    "1793":["Reign of Terror begins","Robespierre's Committee of Public Safety — enemies executed, price caps on bread."],
    "1794":["Robespierre executed","The Terror devours its own — arrests then a final 'Republic of Virtue' bid fails."],
    "1804":["Napoleon crowned Emperor","Monarchy returns — but laws (the Code) keep revolutionary reforms."],
    "1914":["WWI begins","Russia's army breaks; food shortages by 1917, Tsar loses support."],
    "1917 Feb":["February Revolution","Petrograd strikes; Tsar abdicates — Provisional Government forms."],
    "1917 Oct":["October Revolution","Lenin's Bolsheviks seize power — land to peasants, banks nationalised."],
    "1918":["Brest-Litovsk","Russia exits WWI; civil war follows, 'War Communism'."]};
  const yrs=Object.keys(EV);
  b.innerHTML=`<div class="art-stage">${yrs.map((y,i)=>`<div class="tl-item" data-i="${i}" style="cursor:pointer"><div class="yr">${y}</div><div>${EV[y][0]}</div></div>`).join("")}<div class="card" id="tlInfo" style="margin:12px 0 0;background:var(--cream)">Tap an event for the full story.</div></div>`;
  b.querySelectorAll(".tl-item").forEach(x=>x.onclick=()=>{ const e=EV[yrs[+x.dataset.i]]; $("#tlInfo").innerHTML=`<b>${e[0]} — ${yrs[+x.dataset.i]}</b><p class="muted" style="margin:6px 0 0">${e[1]}</p>`; });
}
function artMonsoon(b){
  const SEAS={Summer:["Sea → Land","South-west monsoon winds blow FROM the ocean TO land, heavy with moisture — June onwards, the whole country breathes rain.","Rain","low-pressure over land pulls moisture in"],Winter:["Land → Sea","North-east winds blow FROM land TO sea — dry over most of India; Tamil Nadu coast catches rain.","Sun","land cools fast, high pressure over land pushes air seaward"],Retreating:["Oct–Nov shift","Monsoon withdraws; October heat; cyclones hit the eastern coast.","Shift","wind reversal as the sun moves south"]};
  b.innerHTML=`<div class="art-stage"><div class="row">${Object.keys(SEAS).map(s=>`<button class="pill ${s==="Summer"?"on":""}" data-s="${s}">${s}</button>`).join("")}</div>
  <div style="text-align:center;font-size:40px;margin:14px 0" id="moIco">🌧</div>
  <div style="text-align:center;font-weight:800;color:var(--ocean)" id="moDir">Sea → Land</div>
  <p class="muted" style="text-align:center;margin-top:8px" id="moWhy"></p></div>`;
  b.querySelectorAll("[data-s]").forEach(x=>x.onclick=()=>{ b.querySelectorAll("[data-s]").forEach(y=>y.classList.remove("on")); x.classList.add("on");
    const d=SEAS[x.dataset.s]; $("#moIco").textContent=d[2]; $("#moDir").textContent=d[0]; $("#moWhy").textContent=d[1]+" Why: "+d[3]; });
  b.querySelectorAll("[data-s]")[0].click();
}
function artDemoc(b){
  const Q=[["A king decides everything but builds great roads","Not democratic — power isn't with the people, however good the roads."],
  ["People vote every 5 years; whoever loses accepts the result","Democratic — free, fair, regular elections with real choice."],
  ["One party wins 99% 'yes' votes in a referendum","Not democratic — no real choice, no fair contest."],
  ["Women vote, men don't","Not democratic — universal adult franchise means EVERY adult citizen."],
  ["Court strikes down an unfair law made by Parliament","Democratic — independent judiciary protecting rights is part of the system."]];
  let i=0;
  const draw=()=>{ if(i>=Q.length){ b.innerHTML=`<div class="card" style="text-align:center"><b>Detector complete — you think like a civics examiner now.</b><button class="btn primary" style="margin-top:10px" onclick="Saathy.openArtifact('democ')">Again</button></div>`; return; }
    b.innerHTML=`<div class="art-stage"><p class="muted">${i+1}/${Q.length}</p><div style="font-weight:700;margin:8px 0 14px">${Q[i][0]}</div>
    <div class="row"><button class="btn primary" id="dY">Democratic</button><button class="btn danger" id="dN">Not democratic</button></div><div id="dFb" style="margin-top:12px"></div></div>`;
    $("#dY").onclick=()=>judge(true); $("#dN").onclick=()=>judge(false);
  };
  const judge=(saidYes)=>{ $("#dFb").innerHTML=`<div class="card" style="background:var(--cream)"><b>${Q[i][0].startsWith("People vote")||Q[i][0].startsWith("Court")? "It IS democratic —":"It is NOT democratic —"}</b><p class="muted" style="margin:6px 0 0">${Q[i][1]}</p><button class="btn primary sm" style="margin-top:10px" id="dNext">Next</button></div>`;
    $("#dNext").onclick=()=>{i++;draw();}; };
  draw();
}
function artIndia(b){
  const R={ "Himalayas":"Young fold mountains — Indo-Australian plate hit the Eurasian plate. Glaciers feed the Ganga, Indus, Brahmaputra.",
  "Northern Plains":"Alluvial flatland by the three river systems — food bowl, dense population.",
  "Thar Desert":"Arid west — Luni is the only big river; altitude matters less than rainfall here.",
  "Deccan Plateau":"Triangular ancient lava (black soil) plateau — cotton country, Western Ghats wall it in.",
  "Coastal Strips":"Konkan (west, narrow) vs Coromandel (east, wider) — ports and deltas.",
  "Islands":"Lakshadweep: coral. Andaman & Nicobar: submerged mountain chain — India's eastern point."};
  b.innerHTML=`<div class="art-stage">${Object.keys(R).map(k=>`<button class="cell-part" data-k="${k}" style="width:100%;text-align:left;margin-bottom:8px">${k}</button>`).join("")}<div class="card" id="inInfo" style="background:var(--cream);margin-top:6px">Tap a region.</div></div>`;
  b.querySelectorAll("[data-k]").forEach(x=>x.onclick=()=>{ b.querySelectorAll("[data-k]").forEach(y=>y.classList.remove("on")); x.classList.add("on"); $("#inInfo").innerHTML=`<b>${x.dataset.k}</b><p class="muted" style="margin:6px 0 0">${R[x.dataset.k]}</p>`; });
}
function artIdentity(b){
  b.innerHTML=`<div class="art-stage"><div class="sim-ctl"><span class="muted">a =</span><input type="range" id="ia" min="1" max="6" value="2"><span class="sim-val" id="iav">2</span></div>
  <div class="sim-ctl"><span class="muted">b =</span><input type="range" id="ib" min="1" max="6" value="3"><span class="sim-val" id="ibv">3</span></div>
  <div id="iGrid" style="display:grid;gap:4px;max-width:280px;margin:14px auto"></div><p class="muted" id="iWhy" style="text-align:center"></p></div>`;
  const draw=()=>{ const a=+$("#ia").value,bb=+$("#ib").value; $("#iav").textContent=a; $("#ibv").textContent=bb;
    const cells=[]; for(let r=0;r<a+bb;r++){ const row=[]; for(let c=0;c<a+bb;c++){ const inA=r<a&&c<a, inB=(r>=a&&c>=a), restA=r<a, restC=c<a;
      row.push(inA?`<div style="background:var(--ocean);color:#fff;border-radius:6px;padding:9px 0;font-weight:800">a²</div>`:inB?`<div style="background:var(--peach);border-radius:6px;padding:9px 0;font-weight:800">b²</div>`:restA?`<div style="background:var(--sky);border-radius:6px;padding:9px 0;font-weight:800">ab</div>`:`<div style="background:var(--powder);border-radius:6px;padding:9px 0;font-weight:800">ab</div>`);} cells.push(`<div style="display:grid;grid-template-columns:repeat(${a+bb},1fr);gap:4px">${row.join("")}</div>`); }
    $("#iGrid").innerHTML=cells.join("");
    $("#iWhy").textContent=`Square of side (${a}+${bb}) = ${a+bb}. Two big squares (${a}²=${a*a}, ${bb}²=${bb*bb}) + two rectangles (${a}×${bb} twice = ${2*a*bb}) → (a+b)² = a² + 2ab + b² = ${a*a}+${2*a*bb}+${bb*bb} = ${a*a+2*a*bb+bb*bb}.`;
  };
  $("#ia").oninput=draw; $("#ib").oninput=draw; draw();
}
function artDice(b){
  b.innerHTML=`<div class="art-stage"><p class="muted">Two dice, 100 rolls — watch P(sum=7) approach 6/36 ≈ 0.167.</p>
  <button class="btn peach" id="dRoll">Roll 100</button><div id="dBars" style="display:flex;gap:3px;align-items:flex-end;height:110px;margin-top:14px"></div><p class="muted" id="dStat" style="text-align:center;margin-top:8px"></p></div>`;
  const tally={}; 
  $("#dRoll").onclick=()=>{ let n=0,total=Object.values(tally).reduce((a,b)=>a+b,0);
    for(let k=0;k<100;k++){ const s=1+Math.floor(Math.random()*6)+1+Math.floor(Math.random()*6); tally[s]=(tally[s]||0)+1; }
    total=Object.values(tally).reduce((a,b)=>a+b,0);
    const max=Math.max(...Object.values(tally));
    $("#dBars").innerHTML=[...Array(11)].map((_,i)=>{const s=i+2,v=tally[s]||0;return `<div style="flex:1;text-align:center"><div style="height:${v/max*90||2}px;background:var(--ocean);border-radius:4px 4px 0 0"></div><small style="font-size:10px">${s}</small></div>`}).join("");
    $("#dStat").textContent=`Total rolls: ${total} · P(7) so far = ${((tally[7]||0)/total).toFixed(3)} (theory 0.167) — law of large numbers in action.`;
  };
}

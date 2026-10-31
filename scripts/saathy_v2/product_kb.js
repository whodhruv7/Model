/* Saathy's product brain — distilled from the VidhyaSaathy Product Master File v1.0 (Definitive).
   Saathy knows its own product as deeply as its chapters. */
window.PRODUCT_KB = {
  name: "VidhyaSaathy", tagline: "Your school, online, after the bell rings.",
  charter: {
    what: "A school-anchored learning companion for Indian students of Class 9 and 10, built on NCERT content. Four roles, one shared truth — every quiz, doubt and plan lives against the same concept map.",
    promise: "You don't need to decide what to study tonight. The app already knows, it knows how you learn, and it will walk with you.",
    engine: "Diagnose first, teach second, adapt always. Before teaching anything, a short diagnostic finds what you know; the four bands route explanation depth, difficulty and pacing; every answer (including confidence) feeds per-concept mastery that re-routes the next session.",
    problem: "The enemy is not ignorance, it is chaos — 17 sources shouting at once and none of them knows the student. VidhyaSaathy kills chaos with one Next-Action card, one curated resource set, one calm companion, one honest progress trail.",
    moat: "Features are copyable; the loop is not. Five flywheels: every answer is evidence → evidence improves routing → routing improves outcomes → outcomes earn trust → trust deepens the data.",
    scope: "Prototype: NCERT Science + Mathematics (and SST) for Class 9-10, one demo school, English + Hindi with Hinglish tone. Permanent cuts: no leaderboards, no public ranking, no emotion detection, no AR/VR, no coaching modules."
  },
  roles: {
    student: { wants: "Just tell me what to do tonight", gets: "Adaptive home with Next-Action card, diagnostic before new chapters, band-depth explanations, quizzes with confidence buttons, flashcards, curated YouTube, games, streaks and the cloud companion at 11 pm", never_sees: "Their band label, other students' scores, public ranking" },
    parent: { wants: "Show me progress I can act on", gets: "Weekly summary with graphs, one concrete conversation to have, printable report", never_sees: "The child's live AI chats, doubts or raw answers — a hard privacy wall" },
    teacher: { wants: "40 students, 5 minutes per evening", gets: "Morning dashboard, class x concept heatmap, session builder in under 3 minutes, anonymous doubt clusters like '17 doubts on acceleration'" },
    admin: { wants: "Run the school's digital world safely", gets: "Setup wizard, CSV import, activation codes, approvals, permission matrix, audit log" }
  },
  loop: [
    ["Diagnose", "A short, low-stakes test before teaching anything new — find what the student already knows and which prerequisites are shaky."],
    ["Learn", "Concept pages at the student's band depth: notes, interactive checkpoints, curated video, worked examples."],
    ["Practice", "Adaptive quizzes and games on the same bank — difficulty climbs only as fast as the student proves it should."],
    ["Understand", "'Why I got it wrong' feedback: concept tag + error type + the one fix. Doubts go to the companion instantly."],
    ["Progress", "Per-concept mastery, streaks and badges for the student, heatmaps for the teacher, weekly graphs for the parent."]
  ],
  rules: {
    diagnosticFirst: "Before any new chapter, a ~5 question diagnostic (prerequisites + a taste of new material) places the student. Framed as 'let's see what you already know — this is not a test'. Never graded, never shown as marks. Output is routing, not judgement.",
    nextAction: "An unfinished session outranks everything; a due-tomorrow session outranks revision; revision of a decaying concept outranks new content; new content outranks games. The rest of home stays deliberately sparse.",
    ladder: "Product law: start at L2. Three consecutive correct climb to L3. Two consecutive wrong drop to L1 — always with a bridge explanation so the drop feels like help, not punishment.",
    mastery: "Mastery is per concept, never one overall percentage. L1 Fragile → L2 Steady → L3 Strong → L4 Advanced. Levels decay gently over time; 'mastered in September' must be re-proved lightly.",
    bands: "Four internal bands (0-25%, 25-50%, 50-75%, 75-100%) route every child. Bands are internal, forever. Student-visible words only: 'Let's fix this', 'Almost there', 'Good going', 'Top form'. People are never labelled — concepts are.",
    confidence: "The Pakka Meter: Sure / Unsure / Guess tapped before every reveal. It is the single most honest signal in the system. 'Sure + wrong' = real misconception; 'Guess + right' = discounted luck.",
    privacy: "Students will only confess real confusion if no parent reads it. Chats and doubts are walled from parents and admins — no exceptions. This wall is what makes the doubt data honest."
  },
  bandTable: [
    { band: "0-25%", meaning: "Large gaps — prerequisites shaky", served: "Simplest explanation, everyday analogies, prerequisites re-taught first, shortest sentences, Hindi/Hinglish prominent", practice: "L1 only, tiny sets of 3-5, worked examples shown before attempting", tone: "Extra warm, zero jargon, celebrates single correct answers" },
    { band: "25-50%", meaning: "Basics partly clear", served: "Standard notes + step-by-step worked examples, interactive checkpoints after each idea, flashcards pushed", practice: "Start L2, drop to L1 instantly on two consecutive errors with an automatic bridge", tone: "Medium; checks understanding with one gentle question per concept" },
    { band: "50-75%", meaning: "Basics clear, application weak", served: "Full concept pages + application focus: case-based examples, numericals, 'where students typically slip' callouts", practice: "L2-L3 mix; ladder climbs after 3 consecutive correct", tone: "Steady; shifts from explaining to quizzing — 'you seem solid, try this twist'" },
    { band: "75-100%", meaning: "Consistent understanding", served: "Concise advanced notes, board-format twists, next-concept preview so boredom never arrives", practice: "L3 default + board-format questions, time-pressured sets", tone: "Fast, coach-like and brief, treats the student as near-peer" }
  ],
  errorDNA: [
    { family: "Concept gap", signature: "'Sure' + wrong + slow; prerequisite mastery low", repair: "Bridge back: prerequisite re-taught in simplest variant, then re-test" },
    { family: "Careless slip", signature: "Very fast + wrong, on a concept otherwise strong", repair: "One-line nudge, no re-teach; a 'slow down on signs' micro-habit" },
    { family: "Method error", signature: "Right approach, wrong execution (unit, sign, arithmetic)", repair: "Worked example of the same pattern, step highlighted where it broke" },
    { family: "Guess", signature: "'Guess' confidence regardless of outcome", repair: "Honest acknowledgement, short explanation, re-queued tomorrow in a different skin" }
  ],
  signals: [
    ["Correctness", "the mastery backbone — L1-L4 per concept"],
    ["Confidence (Pakka Meter)", "separates knowledge from luck"],
    ["Time-to-answer", "too fast + wrong = careless; too slow + right = fragile"],
    ["Error type", "chooses the repair path — not all wrongs are equal"],
    ["Session rhythm", "plans realistic nightly goals; detects 11 pm cramming"],
    ["Avoidance", "the 'darr ka map' — concepts quietly avoided"],
    ["Revision behaviour", "does this child consolidate by re-reading or by testing?"]
  ],
  safety: [
    "No fabricated citations — never invent book page numbers, links or references.",
    "The honest 'I don't know' — when unsure, say so plainly. A wrong-but-confident tutor destroys trust.",
    "Homework mode is Socratic — guide with questions and hints, never hand the direct answer.",
    "AI-drafted content stays teacher-gated and visually separate.",
    "Answer keys stay server-side — the client never receives correct-answer flags.",
    "Tone guardrails: no fear, no shame, no comparison with other children."
  ],
  radars: [
    ["Revision / warm-up radar", "tracks decay on the forgetting curve; a 2-minute warm-up surfaces before it hurts"],
    ["Frustration radar", "rapid wrong answers → tone softens, next step shrinks, break suggested. Never a red screen."],
    ["Ratta (rote) detector", "'Sure' answers that collapse when context changes = memorised form, not understanding"],
    ["Avoidance radar (darr ka map)", "quietly-avoided concepts get re-introduced inside games where stakes feel low"]
  ],
  features: {
    pakkaMeter: "One row of three buttons — Sure / Unsure / Guess — under every question, tapped before revealing. Doubles as self-awareness training for board exams.",
    snapDoubt: "Photo to doubt: photograph the confusing line, the app extracts text, the student confirms before sending — because mistranscription at midnight creates new confusion.",
    boardMode: "Every question carries a board-format tag — MCQ, Assertion-Reason, Case-Based, Numerical, Short Answer — so exam practice trains performing in exam clothing.",
    curatedYouTube: "YouTube is not the enemy — discovery is. Links come trimmed with start/end timestamps, concept-tagged, with one line on why it is worth watching. Watching is logged as engagement, never as mastery.",
    flashcards: "Each concept owns a small deck: front = term/question, back = the answer in one breath. Serves the 2-minute Rapid Revision exactly when decay is flagged.",
    summaryPDF: "A one-pager per chapter: definitions, 3-5 core formulas, two classic exam patterns, and the chapter map in miniature — for the morning-of-exam scan.",
    games: "Five games, all scoring against concepts, never against classmates. Boss Level unlocks at L3; Dushman questions target your own weakest concepts."
  },
  flows: {
    onboarding: "Admin creates school → teachers invited by staff ID → students activate with code + roll number + date of birth → parents link via OTP after school approval. No free-floating accounts.",
    session: "Teacher publishes tonight's session by 14:00 → opens 18:00, closes 08:00 → student gets Next-Action → diagnostic (new chapter) → learn at band depth → quiz with confidence → 'why I got it wrong' → evidence logged everywhere.",
    evening: "Same evening, three different children: Aarav (strong) gets concise acceleration + L3 numericals in 14 minutes; Priya (struggling) gets a 10-minute prerequisite repair with a bus-journey analogy and warm tone; Rohan (absent 3 days) gets a shame-free 20-minute catch-up. One session, three experiences, one database."
  },
  language: [
    ["Band 1 (0-25%)", "Let's fix this together", "Needs foundation support — working on prerequisites"],
    ["Band 2 (25-50%)", "Almost there — one more step", "Developing — basics partly clear, guided practice on"],
    ["Band 3 (50-75%)", "Good going — try this twist", "Progressing — ready for application questions"],
    ["Band 4 (75-100%)", "Top form — challenge yourself", "Consistent — advancing to next concept"]
  ],
  sequence: "Every AI chat turn follows one fixed 11-step server-side sequence: auth → rate-limit/token budget → load student context slice → load concept map → detect language and band → assemble system prompt with safety rules and tone → stream the answer → log privately → update anonymous doubt clusters → write promised follow-ups → close budget accounting.",
  buildPlan: "Four days, disciplined: Day 0 repo audit; Day 1 evidence trail first (the moat's raw material); Day 2 the five study surfaces + quiz engine; Day 3 AI companion + adaptive ladder + games; Day 4 parent dashboards, polish and the 170-item readiness checklist. If behind: cut delight, never the evidence trail.",
  qualityBar: "'Ready' means working flows with real data — server-side scoring, real database reads, row-level security, no placeholder JSON, no mock logins. Screens that merely look finished do not count."
};
window.PRODUCT_FACTS = (function(){
  const L=[];
  const P=window.PRODUCT_KB;
  L.push(["what is vidhyasaathy", P.charter.what]);
  L.push(["product promise", P.charter.promise]);
  L.push(["engine", P.charter.engine]);
  L.push(["moat", P.charter.moat]);
  L.push(["scope", P.charter.scope]);
  P.roles.forEach ? null : null;
  L.push(["student role", P.roles.student.wants + " — gets: " + P.roles.student.gets]);
  L.push(["parent role", P.roles.parent.wants + " — gets: " + P.roles.parent.gets + ". Never sees: " + P.roles.parent.never_sees]);
  L.push(["teacher role", P.roles.teacher.wants + " — gets: " + P.roles.teacher.gets]);
  L.push(["admin role", P.roles.admin.wants + " — gets: " + P.roles.admin.gets]);
  P.loop.forEach((s,i)=>L.push(["loop station " + (i+1) + " " + s[0], s[1]]));
  L.push(["diagnostic first rule", P.rules.diagnosticFirst]);
  L.push(["next action card", P.rules.nextAction]);
  L.push(["difficulty ladder", P.rules.ladder]);
  L.push(["mastery levels", P.rules.mastery]);
  L.push(["bands", P.rules.bands]);
  L.push(["pakka meter", P.rules.confidence]);
  L.push(["privacy wall", P.rules.privacy]);
  P.bandTable.forEach(b=>L.push(["band " + b.band, b.meaning + ". Served: " + b.served + " Practice: " + b.practice + " Tone: " + b.tone]));
  P.errorDNA.forEach(e=>L.push(["error dna " + e.family, "Signature: " + e.signature + " Repair: " + e.repair]));
  P.signals.forEach(s=>L.push(["signal " + s[0], s[1]]));
  P.safety.forEach((s,i)=>L.push(["safety rule " + (i+1), s]));
  P.radars.forEach(r=>L.push([r[0], r[1]]));
  for (const k in P.features) L.push(["feature " + k, P.features[k]]);
  L.push(["onboarding flow", P.flows.onboarding]);
  L.push(["session flow", P.flows.session]);
  L.push(["three children evening", P.flows.evening]);
  L.push(["friendly language", P.language.map(x=>x[0]+": '"+x[1]+"'").join(" | ")]);
  L.push(["11 step sequence", P.sequence]);
  L.push(["4 day build plan", P.buildPlan]);
  L.push(["quality bar", P.qualityBar]);
  return L;
})();

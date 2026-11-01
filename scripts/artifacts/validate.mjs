#!/usr/bin/env node
// Validates all src/data/artifacts/**/*.json against SPEC.md and prints counts.
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../src/data/artifacts');
const BOOK_FILES = { gm: 'ganita-manjari.json', sc: 'science-exploration.json', us: 'understanding-society.json' };
const errors = [];
const warnings = [];
let total = 0;
const perBook = { gm: { files: 0, slides: 0, cards: 0, quiz: 0, examples: 0, maps: 0, flows: 0 }, sc: {}, us: {} };
for (const b of Object.keys(perBook)) perBook[b] = { files: 0, slides: 0, cards: 0, quiz: 0, examples: 0, maps: 0, flows: 0 };

const bookChapters = {};
for (const [bk, f] of Object.entries(BOOK_FILES)) {
  const d = JSON.parse(readFileSync(join(ROOT, '../books', f), 'utf8'));
  bookChapters[bk] = d;
}
const secCount = (bk, chNum) => (bookChapters[bk].find(c => c.number === chNum)?.sections ?? []).length;

const ids = new Set();
const mdRe = /(\*\*|\|---|^#|\n#)/;

for (const bk of readdirSync(ROOT)) {
  const dir = join(ROOT, bk);
  for (const f of readdirSync(dir).filter(x => x.endsWith('.json'))) {
    const path = join(dir, f);
    let j;
    try { j = JSON.parse(readFileSync(path, 'utf8')); }
    catch (e) { errors.push(`${path}: PARSE ERROR ${e.message}`); continue; }
    const tag = `${bk}/${f}`;
    perBook[bk].files++;
    for (const req of ['book', 'chapter', 'title', 'sections', 'slides', 'flashcards', 'quiz', 'examples']) {
      if (j[req] === undefined) errors.push(`${tag}: missing "${req}"`);
    }
    if (j.book !== bk) errors.push(`${tag}: book mismatch "${j.book}"`);
    if (secCount(j.book, j.chapter) === 0) errors.push(`${tag}: chapter ${j.chapter} not found in book`);
    const seenSecs = new Set((j.sections ?? []).map(s => s.id));
    for (const arr of [j.slides ?? [], j.flashcards ?? [], j.quiz ?? []]) {
      for (const it of arr) {
        if (!seenSecs.has(it.sec)) warnings.push(`${tag}: item sec "${it.sec}" not in file sections list`);
        if (it.id && ids.has(it.id)) errors.push(`${tag}: duplicate id ${it.id}`);
        if (it.id) ids.add(it.id);
        for (const [k, v] of Object.entries(it)) {
          if (typeof v === 'string' && mdRe.test(v)) errors.push(`${tag}: markdown symbols in ${it.id}.${k}`);
        }
      }
    }
    const nSec = (j.sections ?? []).length;
    const bySec = {};
    for (const it of j.slides ?? []) bySec[it.sec] = (bySec[it.sec] ?? 0) + 1;
    for (const s of j.sections ?? []) if ((bySec[s.id] ?? 0) < 3) errors.push(`${tag}: section ${s.id} has ${bySec[s.id] ?? 0} slides (<3)`);
    if ((j.slides ?? []).length < 3 * nSec) errors.push(`${tag}: slides ${j.slides.length} < ${3 * nSec}`);
    const cardsBySec = {};
    for (const it of j.flashcards ?? []) cardsBySec[it.sec] = (cardsBySec[it.sec] ?? 0) + 1;
    for (const s of j.sections ?? []) if ((cardsBySec[s.id] ?? 0) < 3) errors.push(`${tag}: section ${s.id} has ${cardsBySec[s.id] ?? 0} flashcards (<3)`);
    const qBySec = {};
    for (const it of j.quiz ?? []) qBySec[it.sec] = (qBySec[it.sec] ?? 0) + 1;
    for (const s of j.sections ?? []) if ((qBySec[s.id] ?? 0) < 3) errors.push(`${tag}: section ${s.id} has ${qBySec[s.id] ?? 0} quiz (<3)`);
    for (const q of j.quiz ?? []) {
      if (!Array.isArray(q.options) || q.options.length !== 4) errors.push(`${tag}: ${q.id} options != 4`);
      if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) errors.push(`${tag}: ${q.id} bad answer`);
      if (!['easy', 'medium', 'hard'].includes(q.difficulty)) errors.push(`${tag}: ${q.id} bad difficulty "${q.difficulty}"`);
    }
    if ((j.examples ?? []).length < 1) errors.push(`${tag}: needs >=1 example`);
    if (j.conceptMap) {
      perBook[bk].maps++;
      const { groups, nodes, edges } = j.conceptMap;
      if (!groups?.length || groups.length < 3 || groups.length > 5) errors.push(`${tag}: conceptMap groups 3-5`);
      if (!nodes?.length || nodes.length < 10 || nodes.length > 14) errors.push(`${tag}: conceptMap nodes 10-14`);
      if (!edges?.length || edges.length < 10 || edges.length > 16) errors.push(`${tag}: conceptMap edges 10-16`);
      const nodeIds = new Set((nodes ?? []).map(n => n.id));
      for (const e of edges ?? []) { if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) errors.push(`${tag}: edge ${e.from}->${e.to} unknown node`); }
    }
    if (j.flowchart) {
      perBook[bk].flows++;
      if (!j.flowchart.steps?.length || j.flowchart.steps.length < 6 || j.flowchart.steps.length > 10) errors.push(`${tag}: flowchart steps 6-10`);
      for (const [a, b] of j.flowchart.edges ?? []) {
        if (a >= j.flowchart.steps.length || b >= j.flowchart.steps.length) errors.push(`${tag}: flowchart edge [${a},${b}] out of range`);
      }
    }
    perBook[bk].slides += (j.slides ?? []).length;
    perBook[bk].cards += (j.flashcards ?? []).length;
    perBook[bk].quiz += (j.quiz ?? []).length;
    perBook[bk].examples += (j.examples ?? []).length;
  }
}

// chapter coverage check: >8 sections -> ch<NN>a.json + ch<NN>b.json, else ch<NN>.json
for (const [bk, chapters] of Object.entries(bookChapters)) {
  const have = new Set();
  const dir = join(ROOT, bk);
  for (const f of readdirSync(dir).filter(x => x.endsWith('.json'))) {
    try { const j = JSON.parse(readFileSync(join(dir, f), 'utf8')); have.add(String(j.chapter) + (j.part ?? '')); } catch { /* already errored */ }
  }
  for (const ch of chapters) {
    const n = String(ch.number);
    if (ch.sections.length > 8) {
      if (!have.has(n + 'a') || !have.has(n + 'b')) errors.push(`${bk}: chapter ${n} "${ch.title}" (${ch.sections.length} sec) needs ch${n}a.json + ch${n}b.json`);
    } else if (!have.has(n)) {
      errors.push(`${bk}: chapter ${n} "${ch.title}" missing (needs ch${n}.json)`);
    }
  }
}

for (const [bk, v] of Object.entries(perBook)) {
  const t = v.slides + v.cards + v.quiz + v.examples + v.maps + v.flows;
  total += t;
  console.log(`${bk.padEnd(3)} files:${String(v.files).padStart(3)}  slides:${String(v.slides).padStart(4)}  cards:${String(v.cards).padStart(4)}  quiz:${String(v.quiz).padStart(4)}  examples:${String(v.examples).padStart(3)}  maps:${String(v.maps).padStart(3)}  flows:${String(v.flows).padStart(3)}  => ${t}`);
}
console.log(`TOTAL ARTIFACT OBJECTS: ${total}  (target >= 1000: ${total >= 1000 ? 'PASS' : 'FAIL'})`);
if (warnings.length) { console.log(`\nWarnings (${warnings.length}):`); for (const w of warnings.slice(0, 20)) console.log('  W ' + w); }
if (errors.length) { console.log(`\nErrors (${errors.length}):`); for (const e of errors.slice(0, 60)) console.log('  E ' + e); process.exit(1); }
console.log('\nALL SCHEMA CHECKS PASSED');

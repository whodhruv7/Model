// Seed: Exploration (NCERT Science Grade 9) — ADDITIVE, non-destructive.
// Creates the Science subject + chapters 201-213 + concepts only if missing;
// never wipes conversations, data docs, settings or mastery.
// Run: bun scripts/kb/seed_science.ts
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

interface ChapterDef {
  number: number; // 201-213 (science number space)
  name: string;
  concepts: Array<[string, string[]]>;
}

const SCIENCE_BOOK: ChapterDef[] = [
  {
    number: 201,
    name: 'Exploration: Entering the World of Secondary Science',
    concepts: [['Scientific Method', []], ['Scientific Attitude and Curiosity', ['Scientific Method']], ['Branches of Science', ['Scientific Method']]],
  },
  {
    number: 202,
    name: 'Cell: The Building Block of Life',
    concepts: [['Cell Structure', []], ['Plasma Membrane and Transport', ['Cell Structure']], ['Cell Organelles', ['Cell Structure']], ['Prokaryotes and Eukaryotes', ['Cell Organelles']]],
  },
  {
    number: 203,
    name: 'Tissues in Action',
    concepts: [['Plant Tissues', []], ['Xylem and Phloem', ['Plant Tissues']], ['Animal Tissues', []], ['Nervous and Muscular Tissue', ['Animal Tissues']]],
  },
  {
    number: 204,
    name: 'Describing Motion Around Us',
    concepts: [['Distance and Displacement', []], ['Speed and Velocity', ['Distance and Displacement']], ['Acceleration', ['Speed and Velocity']], ['Graphs of Motion', ['Speed and Velocity']], ['Kinematic Equations', ['Acceleration']]],
  },
  {
    number: 205,
    name: 'Exploring Mixtures and their Separation',
    concepts: [['Pure Substances and Mixtures', []], ['Solutions and Concentration', ['Pure Substances and Mixtures']], ['Separation Techniques', ['Solutions and Concentration']]],
  },
  {
    number: 206,
    name: 'How Forces Affect Motion',
    concepts: [['Balanced and Unbalanced Forces', []], ["Newton's First Law and Inertia", ['Balanced and Unbalanced Forces']], ["Newton's Second Law", ["Newton's First Law and Inertia"]], ["Newton's Third Law", ["Newton's Second Law"]], ['Friction', ['Balanced and Unbalanced Forces']], ['Thrust and Pressure', ['Friction']]],
  },
  {
    number: 207,
    name: 'Work, Energy, and Simple Machines',
    concepts: [['Work Done by a Force', []], ['Kinetic Energy', ['Work Done by a Force']], ['Potential Energy', ['Work Done by a Force']], ['Conservation of Energy', ['Kinetic Energy', 'Potential Energy']], ['Power', ['Work Done by a Force']], ['Simple Machines', ['Work Done by a Force']]],
  },
  {
    number: 208,
    name: 'Journey Inside the Atom',
    concepts: [['Atomic Models', []], ['Subatomic Particles', ['Atomic Models']], ['Electronic Configuration', ['Subatomic Particles']], ['Valency', ['Electronic Configuration']], ['Isotopes and Isobars', ['Subatomic Particles']]],
  },
  {
    number: 209,
    name: 'Atomic Foundations of Matter',
    concepts: [['Laws of Chemical Combination', []], ['Atomic and Molecular Mass', ['Laws of Chemical Combination']], ['Mole Concept', ['Atomic and Molecular Mass']], ['Chemical Formulae and Ions', ['Laws of Chemical Combination']]],
  },
  {
    number: 210,
    name: 'Sound Waves: Characteristics and Applications',
    concepts: [['Production and Propagation of Sound', []], ['Wave Characteristics', ['Production and Propagation of Sound']], ['Speed of Sound', ['Wave Characteristics']], ['Echo and Sonar', ['Speed of Sound']], ['Human Ear and Hearing Range', ['Wave Characteristics']]],
  },
  {
    number: 211,
    name: 'Reproduction: How Life Continues',
    concepts: [['Asexual Reproduction', []], ['Pollination and Plant Reproduction', ['Asexual Reproduction']], ['Human Reproductive System', []], ['Fertilisation and Development', ['Human Reproductive System']], ['Adolescence and Puberty', ['Human Reproductive System']]],
  },
  {
    number: 212,
    name: 'Patterns in Life: Diversity and Classification',
    concepts: [['Why We Classify', []], ['Hierarchy of Classification', ['Why We Classify']], ['Kingdom Plantae', ['Hierarchy of Classification']], ['Kingdom Animalia', ['Hierarchy of Classification']], ['Scientific Naming', ['Hierarchy of Classification']]],
  },
  {
    number: 213,
    name: 'Earth as a System: Energy, Matter, and Life',
    concepts: [["Earth's Spheres", []], ['Solar Constant and Energy Balance', ["Earth's Spheres"]], ['Biogeochemical Cycles', ["Earth's Spheres"]], ['Interconnected Earth Systems', ['Biogeochemical Cycles']]],
  },
];

const SUBJECT_NAME = 'Science — Exploration (Grade 9)';

async function main() {
  let subject = await db.subject.findFirst({ where: { name: SUBJECT_NAME } });
  if (!subject) subject = await db.subject.create({ data: { name: SUBJECT_NAME, order: 3 } });

  let conceptsCreated = 0;
  for (const [i, ch] of SCIENCE_BOOK.entries()) {
    let chapter = await db.chapter.findFirst({ where: { subjectId: subject.id, number: ch.number } });
    if (!chapter) {
      chapter = await db.chapter.create({
        data: { subjectId: subject.id, number: ch.number, name: ch.name, order: i + 1 },
      });
    }
    for (const [j, [name]] of ch.concepts.entries()) {
      const existing = await db.concept.findFirst({ where: { chapterId: chapter.id, name } });
      if (!existing) {
        await db.concept.create({ data: { chapterId: chapter.id, name, order: j + 1, prerequisites: '[]' } });
        conceptsCreated++;
      }
    }
  }

  // Resolve prerequisites by name within the same chapter
  const all = await db.concept.findMany({ include: { chapter: true } });
  for (const c of all) {
    if (c.chapter.subjectId !== subject.id) continue;
    const def = SCIENCE_BOOK.find((b) => b.number === c.chapter.number);
    const prereq = def?.concepts.find(([n]) => n === c.name)?.[1] ?? [];
    if (prereq.length > 0 && c.prerequisites === '[]') {
      const ids = all.filter((x) => prereq.includes(x.name) && x.chapter.id === c.chapter.id).map((x) => x.id);
      if (ids.length > 0) await db.concept.update({ where: { id: c.id }, data: { prerequisites: JSON.stringify(ids) } });
    }
  }

  const chCount = await db.chapter.count({ where: { subjectId: subject.id } });
  const cCount = await db.concept.count({ where: { chapter: { subjectId: subject.id } } });
  console.log(`Science seed ok: subject "${SUBJECT_NAME}" — ${chCount} chapters, ${cCount} concepts (${conceptsCreated} new). Nothing else touched.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

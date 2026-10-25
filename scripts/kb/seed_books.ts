// Seed: the school's actual textbooks as the mastery tree.
//   Ganita Manjari (maths, chapters 1-14) + Understanding Society (SST, 101-109).
// Run: bun scripts/kb/seed_books.ts
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

interface ChapterDef {
  number: number;
  name: string;
  concepts: Array<[string, string[]]>; // [name, prerequisite concept names]
}

const BOOK: ChapterDef[] = [
  {
    number: 1,
    name: 'Orienting Yourself: The Use of Coordinates',
    concepts: [['The Cartesian Plane', []], ['Plotting Points', ['The Cartesian Plane']], ['Distance Between Two Points', ['Plotting Points']]],
  },
  {
    number: 2,
    name: 'Introduction to Linear Polynomials',
    concepts: [['What is a Linear Polynomial', []], ['Linear Growth and Decay', ['What is a Linear Polynomial']], ['Graphs of Linear Relationships', ['Linear Growth and Decay']]],
  },
  {
    number: 3,
    name: 'The World of Numbers',
    concepts: [['Integers and the Number Line', []], ['Fractions and Rational Numbers', ['Integers and the Number Line']], ['Irrational Numbers', ['Fractions and Rational Numbers']], ['Real Numbers and Decimals', ['Irrational Numbers']]],
  },
  {
    number: 4,
    name: 'Exploring Algebraic Identities',
    concepts: [['Visualising Identities', []], ['Factorisation Using Identities', ['Visualising Identities']], ['Simplifying Rational Expressions', ['Factorisation Using Identities']]],
  },
  {
    number: 5,
    name: 'Circles: Chords, Arcs and Angles',
    concepts: [['Circle Basics and Symmetry', []], ['Chords and Perpendicular Bisectors', ['Circle Basics and Symmetry']], ['Angles Subtended by an Arc', ['Circle Basics and Symmetry']], ['Concyclic Points', ['Angles Subtended by an Arc']]],
  },
  {
    number: 6,
    name: 'Measuring Space: Perimeter and Area',
    concepts: [['Perimeter and Circumference', []], ['Arc Length', ['Perimeter and Circumference']], ['Area of a Triangle', ['Perimeter and Circumference']], ['Area of a Circle', ['Arc Length']]],
  },
  {
    number: 7,
    name: 'The Mathematics of Maybe: Probability',
    concepts: [['What is Probability', []], ['Sample Spaces', ['What is Probability']], ['Tree Diagrams', ['Sample Spaces']]],
  },
  {
    number: 8,
    name: 'Predicting What Comes Next: Sequences and Progressions',
    concepts: [['Explicit and Recursive Rules', []], ['Arithmetic Progressions', ['Explicit and Recursive Rules']], ['Sum of First n Natural Numbers', ['Arithmetic Progressions']], ['Geometric Progressions', ['Explicit and Recursive Rules']]],
  },
  {
    number: 9,
    name: 'Propositions and Number Patterns',
    concepts: [['Propositions and Converses', []], ['Number Patterns', []], ['Perfect Squares and Factors', ['Number Patterns']]],
  },
  {
    number: 10,
    name: 'How Quantities Combine: Understanding Data',
    concepts: [['Combining Quantities', []], ['Visualising and Interpreting Data', []]],
  },
  {
    number: 11,
    name: 'The World of Algorithms',
    concepts: [['Adding Numbers Fast', []], ['Greatest Common Divisor', []], ['Data Structures', []]],
  },
  {
    number: 12,
    name: 'Quadrilaterals',
    concepts: [['Quadrilateral Properties', []], ['Parallelograms', ['Quadrilateral Properties']], ['Tiling the Plane', ['Quadrilateral Properties']]],
  },
  {
    number: 13,
    name: 'Two Variables, One Line: Linear Equations',
    concepts: [['Linear Equations in Two Variables', []], ['Slope-Intercept Form', ['Linear Equations in Two Variables']], ['Solving Pairs of Linear Equations', ['Slope-Intercept Form']], ['Graphical Method', ['Solving Pairs of Linear Equations']]],
  },
  {
    number: 14,
    name: 'Math of Space: Surface Area and Volume',
    concepts: [['Cuboids and Cubes', []], ['Cylinders and Cones', ['Cuboids and Cubes']], ['Pyramids', ['Cylinders and Cones']], ['Spheres and Hemispheres', ['Cylinders and Cones']]],
  },
];

// Understanding Society: India and Beyond (Grade 9, Parts 1-2).
// Chapter numbers are 101-109 to keep them unique next to the maths book.
const SST_BOOK: ChapterDef[] = [
  {
    number: 101,
    name: 'Atmosphere and Climate',
    concepts: [['Composition of the Atmosphere', []], ['Layers of the Atmosphere', ['Composition of the Atmosphere']], ['Weather and Climate', ['Layers of the Atmosphere']], ['Elements of Weather and Climate', ['Weather and Climate']], ['Seasons in India', ['Weather and Climate']]],
  },
  {
    number: 102,
    name: 'Building Blocks in Economics: The Problem of Choice',
    concepts: [['Choices and Limited Resources', []], ['Opportunity Cost', ['Choices and Limited Resources']], ['Key Questions in Economics', ['Opportunity Cost']], ['Factors of Production', ['Key Questions in Economics']], ['Economic Systems', ['Factors of Production']]],
  },
  {
    number: 103,
    name: 'The Price Puzzle: What Drives the Market',
    concepts: [['Demand', []], ['Demand Schedule and Curve', ['Demand']], ['Determinants of Demand', ['Demand']], ['Supply', ['Demand']], ['Market Equilibrium', ['Supply']]],
  },
  {
    number: 104,
    name: 'Oceans and Life',
    concepts: [['Ocean Relief', []], ['Waves', ['Ocean Relief']], ['Tides', ['Waves']], ['Ocean Currents', ['Tides']], ['Cyclones and Tsunamis', ['Ocean Currents']], ['Marine Resources and Blue Economy', ['Ocean Relief']], ['Maritime Zones', ['Marine Resources and Blue Economy']]],
  },
  {
    number: 105,
    name: 'Life on Earth',
    concepts: [['Biomes', []], ['Terrestrial Biomes', ['Biomes']], ['Aquatic Biomes', ['Biomes']], ['Biodiversity', ['Biomes']], ['Forests and Livelihoods', ['Biodiversity']], ['Ecological Commons', ['Forests and Livelihoods']]],
  },
  {
    number: 106,
    name: 'Resistance and Resilience (1000-1700 CE)',
    concepts: [['Invasions and Resistance', []], ['Rajput Resistance', ['Invasions and Resistance']], ['Mughal-Rajput Dynamics', ['Rajput Resistance']], ['The Ahoms and Vijayanagara', ['Invasions and Resistance']], ['Marathas and Swarajya', ['Mughal-Rajput Dynamics']], ['The Sikhs and the Khalsa', ['Invasions and Resistance']], ['Bhakti Tradition', ['Invasions and Resistance']], ['Temples and the Economy', ['Bhakti Tradition']]],
  },
  {
    number: 107,
    name: 'Governance and Public Policy',
    concepts: [['Government vs Governance', []], ['Good Governance', ['Government vs Governance']], ['E-Governance', ['Good Governance']], ['Public Policy', ['Government vs Governance']], ['The Policy Cycle', ['Public Policy']], ['Policy Coordination', ['The Policy Cycle']]],
  },
  {
    number: 108,
    name: 'Managing Your Personal Finances',
    concepts: [['Pillars of Personal Finance', []], ['Budgeting and Saving', ['Pillars of Personal Finance']], ['Investing and Compounding', ['Budgeting and Saving']], ['Investment Options', ['Investing and Compounding']], ['Insurance and Risk', ['Investment Options']], ['Income Tax', ['Pillars of Personal Finance']]],
  },
  {
    number: 109,
    name: 'From Ideas to Startups',
    concepts: [['What is Entrepreneurship', []], ['Business Plan', ['What is Entrepreneurship']], ['Functional Areas of a Business', ['Business Plan']], ['Profit and Loss', ['Functional Areas of a Business']], ['Startups and the Nation', ['What is Entrepreneurship']]],
  },
];

async function main() {
  await db.evidenceRecord.deleteMany();
  await db.teacherNote.deleteMany();
  await db.masteryState.deleteMany();
  await db.message.deleteMany();
  await db.conversation.deleteMany();
  await db.concept.deleteMany();
  await db.chapter.deleteMany();
  await db.subject.deleteMany();
  await db.studentProfile.deleteMany();
  await db.appSettings.deleteMany();

  await db.studentProfile.create({
    data: {
      id: 'main',
      name: 'Aarav',
      className: 'Class 9',
      section: 'A',
      board: 'CBSE',
      schoolName: 'Demo Public School',
      tone: 'friendly',
      style: 'steps',
      length: 'balanced',
      language: 'english',
      socratic: true,
      animations: true,
      sounds: false,
    },
  });

  const subject = await db.subject.create({ data: { name: 'Ganita Manjari Mathematics', order: 1 } });
  const sstSubject = await db.subject.create({ data: { name: 'Social Science — Understanding Society', order: 2 } });

  for (const [i, ch] of BOOK.entries()) {
    const chapter = await db.chapter.create({
      data: { subjectId: subject.id, number: ch.number, name: ch.name, order: i + 1 },
    });
    for (const [j, [name]] of ch.concepts.entries()) {
      await db.concept.create({
        data: {
          chapterId: chapter.id,
          name,
          order: j + 1,
          prerequisites: '[]', // resolved below by name where needed
        },
      });
    }
  }

  for (const [i, ch] of SST_BOOK.entries()) {
    const chapter = await db.chapter.create({
      data: { subjectId: sstSubject.id, number: ch.number, name: ch.name, order: i + 1 },
    });
    for (const [j, [name]] of ch.concepts.entries()) {
      await db.concept.create({
        data: {
          chapterId: chapter.id,
          name,
          order: j + 1,
          prerequisites: '[]',
        },
      });
    }
  }

  // Resolve prerequisites by name (same chapter scope)
  const concepts = await db.concept.findMany({ include: { chapter: true } });
  for (const c of concepts) {
    const def = BOOK.find((b) => b.number === c.chapter.number) ?? SST_BOOK.find((b) => b.number === c.chapter.number);
    if (!def) continue;
    const prereq = def.concepts.find(([n]) => n === c.name)?.[1] ?? [];
    if (prereq.length > 0) {
      const ids = concepts.filter((x) => prereq.includes(x.name) && x.chapter.number === c.chapter.number).map((x) => x.id);
      if (ids.length > 0) await db.concept.update({ where: { id: c.id }, data: { prerequisites: JSON.stringify(ids) } });
    }
  }

  // Fresh start: every concept unassessed — the Level Check gate decides bands.
  await db.appSettings.create({
    data: { id: 'main', founderPin: '2405', provider: 'builtin', builtinModelId: 'glm-4-plus' },
  });

  const counts = await db.concept.count();
  console.log(`Seed complete: Ganita Manjari (${BOOK.length} chapters) + Understanding Society (${SST_BOOK.length} chapters) — ${counts} concepts, all bands fresh (level checks pending)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

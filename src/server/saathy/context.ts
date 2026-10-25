// Context retrieval (AI-02 boundary): assembles everything Saathy knows about
// the student right now. In the future VidhyaSaathy app this module is the only
// file that needs to swap — e.g. replace keyword matching with real RAG over
// the school's published material. Nothing else in the engine changes.
import { db } from '@/lib/db';
import { tierFor, TIERS, type ConceptCtx, type NoteCtx, type ProfileCtx, type SubjectCtx, type Tier } from '@/lib/saathy-types';

export async function loadProfile(): Promise<ProfileCtx> {
  const p = await db.studentProfile.findUnique({ where: { id: 'main' } });
  if (!p) throw new Error('Student profile missing');
  return {
    name: p.name,
    className: p.className,
    section: p.section,
    board: p.board,
    schoolName: p.schoolName,
    tone: p.tone,
    style: p.style,
    length: p.length,
    language: p.language,
    socratic: p.socratic,
    animations: p.animations,
    sounds: p.sounds,
    focusSubjectId: p.focusSubjectId,
    focusChapterId: p.focusChapterId,
    focusConceptId: p.focusConceptId,
  };
}

export async function loadSubjects(): Promise<SubjectCtx[]> {
  const subjects = await db.subject.findMany({
    orderBy: { order: 'asc' },
    include: {
      chapters: {
        orderBy: { order: 'asc' },
        include: {
          concepts: {
            orderBy: { order: 'asc' },
            include: { mastery: true },
          },
        },
      },
    },
  });

  return subjects.map((s) => ({
    id: s.id,
    name: s.name,
    chapters: s.chapters.map((ch) => ({
      id: ch.id,
      name: ch.name,
      number: ch.number,
      concepts: ch.concepts.map(
        (c): ConceptCtx => ({
          id: c.id,
          name: c.name,
          order: c.order,
          score: c.mastery?.score ?? null,
          tier: c.mastery ? tierFor(c.mastery.score) : null,
          label: c.mastery ? TIERS[tierFor(c.mastery.score)].label : 'Not started',
        })
      ),
    })),
  }));
}

export interface ConceptHit {
  conceptId: string;
  conceptName: string;
  tier: Tier | null;
  score: number | null;
  chapterName: string;
  subjectName: string;
}

// Keyword alias table — the AI-02 retrieval seam. Swap with embeddings/RAG later.
const ALIASES: Record<string, string[]> = {
  'The Cartesian Plane': ['cartesian', 'x-axis', 'y-axis', 'origin', 'abscissa', 'ordinate', 'coordinate plane', 'coordinates'],
  'Plotting Points': ['plot', 'plotting', 'ordered pair'],
  'Distance Between Two Points': ['distance between', 'distance formula', 'baudhayana', 'pythagoras'],
  'What is a Linear Polynomial': ['linear polynomial', 'polynomial'],
  'Linear Growth and Decay': ['linear growth', 'linear decay', 'growth'],
  'Graphs of Linear Relationships': ['linear graph', 'straight line graph', 'linear relationship'],
  'Integers and the Number Line': ['integer', 'number line', 'negative number'],
  'Fractions and Rational Numbers': ['fraction', 'rational', 'numerator', 'denominator'],
  'Irrational Numbers': ['irrational', 'surds', 'root 2', 'sqrt2', 'pi'],
  'Real Numbers and Decimals': ['real number', 'decimal', 'terminating', 'recurring'],
  'Visualising Identities': ['identity', 'identities', '(a+b)^2', 'a squared', 'algebraic identity'],
  'Factorisation Using Identities': ['factorise', 'factorize', 'factorisation', 'factorization', 'factors'],
  'Simplifying Rational Expressions': ['rational expression', 'simplify'],
  'Circle Basics and Symmetry': ['circle', 'radius', 'diameter', 'circumference', 'symmetry'],
  'Chords and Perpendicular Bisectors': ['chord', 'perpendicular bisector', 'midpoint of chord'],
  'Angles Subtended by an Arc': ['subtended', 'central angle', 'inscribed angle', 'arc angle'],
  'Concyclic Points': ['concyclic', 'cyclic quadrilateral', 'same circle'],
  'Perimeter and Circumference': ['perimeter', 'circumference', 'c over d', 'c/d'],
  'Arc Length': ['arc length', 'arc', 'sector perimeter'],
  'Area of a Triangle': ['area of triangle', 'heron', 'base and height'],
  'Area of a Circle': ['area of circle', 'pi r squared'],
  'What is Probability': ['probability', 'chance', 'likely', 'maybe'],
  'Sample Spaces': ['sample space', 'outcomes', 'dice', 'coin'],
  'Tree Diagrams': ['tree diagram', 'branch'],
  'Explicit and Recursive Rules': ['explicit rule', 'recursive rule', 'sequence rule', 'term to term'],
  'Arithmetic Progressions': ['arithmetic progression', 'ap ', 'common difference'],
  'Sum of First n Natural Numbers': ['sum of natural', 'gauss', 'n(n+1)'],
  'Geometric Progressions': ['geometric progression', 'gp ', 'common ratio', 'fibonacci', 'virahanka'],
  'Propositions and Converses': ['proposition', 'converse', 'if and only if', 'statement'],
  'Number Patterns': ['number pattern', 'pattern'],
  'Perfect Squares and Factors': ['perfect square', 'odd factors'],
  'Combining Quantities': ['combine', 'average', 'total'],
  'Visualising and Interpreting Data': ['data', 'bar graph', 'histogram', 'interpret'],
  'Adding Numbers Fast': ['add fast', 'adding numbers', 'sum trick'],
  'Greatest Common Divisor': ['gcd', 'hcf', 'greatest common', 'euclid algorithm'],
  'Data Structures': ['data structure', 'array', 'stack'],
  'Quadrilateral Properties': ['quadrilateral', 'four sided'],
  Parallelograms: ['parallelogram', 'rhombus', 'trapezium'],
  'Tiling the Plane': ['tiling', 'tessellation', 'tile'],
  'Linear Equations in Two Variables': ['linear equation', 'two variables', 'ax+by'],
  'Slope-Intercept Form': ['slope', 'intercept', 'y = mx', 'gradient'],
  'Solving Pairs of Linear Equations': ['pair of equations', 'simultaneous', 'elimination', 'substitution'],
  'Graphical Method': ['graphical method', 'intersecting lines', 'graph solution'],
  'Cuboids and Cubes': ['cuboid', 'cube', 'lateral surface'],
  'Cylinders and Cones': ['cylinder', 'cone', 'curved surface'],
  Pyramids: ['pyramid', 'apex'],
  'Spheres and Hemispheres': ['sphere', 'hemisphere', 'ball'],

  // ---- Understanding Society (SST) ----
  'Composition of the Atmosphere': ['atmosphere', 'composition of atmosphere', 'air around us', 'nitrogen oxygen'],
  'Layers of the Atmosphere': ['troposphere', 'stratosphere', 'mesosphere', 'thermosphere', 'exosphere', 'layers of atmosphere', 'ozone'],
  'Weather and Climate': ['weather', 'climate', 'climate change', 'global warming', 'monsoon'],
  'Elements of Weather and Climate': ['insolation', 'temperature', 'humidity', 'wind', 'pressure belt', 'elements of weather'],
  'Seasons in India': ['seasons', 'spring season', 'summer season', 'imber', 'cold weather season'],
  'Choices and Limited Resources': ['economics', 'scarcity', 'limited resources', 'choice', 'wants'],
  'Opportunity Cost': ['opportunity cost', 'trade off', 'next best alternative'],
  'Key Questions in Economics': ['what to produce', 'how to produce', 'for whom to produce', 'central problems'],
  'Factors of Production': ['factors of production', 'land labour capital', 'entrepreneur factor'],
  'Economic Systems': ['economic system', 'planned economy', 'market economy', 'mixed economy'],
  'Demand': ['demand', 'quantity demanded'],
  'Demand Schedule and Curve': ['demand schedule', 'demand curve'],
  'Determinants of Demand': ['determinants of demand', 'law of demand', 'demand shifts'],
  'Supply': ['supply', 'quantity supplied'],
  'Supply Schedule and Curve': ['supply schedule', 'supply curve'],
  'Market Equilibrium': ['equilibrium', 'market price', 'equilibrium price', 'shortage surplus'],
  'Ocean Relief': ['ocean relief', 'submarine relief', 'ocean floor', 'continental shelf', 'mariana trench', 'mid-ocean ridge'],
  'Waves': ['wave', 'waves', 'tsunami'],
  'Tides': ['tide', 'tides', 'spring tide', 'neap tide', 'high tide', 'low tide'],
  'Ocean Currents': ['ocean current', 'gulf stream', 'labrador current', 'warm current', 'cold current', 'coriolis'],
  'Cyclones and Tsunamis': ['cyclone', 'hurricane', 'typhoon', 'storm surge', 'early warning'],
  'Marine Resources and Blue Economy': ['marine resources', 'blue economy', 'ocean resources', 'fishing grounds', 'aquaculture'],
  'Maritime Zones': ['maritime zone', 'territorial waters', 'eez', 'exclusive economic zone', 'unclos', 'high seas', 'contiguous zone'],
  'Biomes': ['biome', 'biomes', 'patchwork quilt'],
  'Terrestrial Biomes': ['taiga', 'tundra', 'grassland', 'rainforest', 'desert biome', 'terrestrial'],
  'Aquatic Biomes': ['aquatic', 'freshwater', 'marine biome', 'coral reef'],
  'Biodiversity': ['biodiversity', 'hotspot', 'species', 'wildlife', 'conservation'],
  'Forests and Livelihoods': ['forest dwellers', 'forest produce', 'ntfp', 'tribal', 'sacred groves', 'chipko', 'forest rights'],
  'Ecological Commons': ['commons', 'common resource', 'shared resources', 'grazing land'],
  'Invasions and Resistance': ['invasion', 'ghazni', 'ghori', 'resistance', 'turkic', 'delhi sultanate'],
  'Rajput Resistance': ['rajput', 'chauhan', 'prithviraj', 'kashahrada', 'ranthambore', 'chittor'],
  'Mughal-Rajput Dynamics': ['mughal', 'akbar', 'babur', 'panipat', 'khanua', 'mansab', 'haldighati', 'maharana pratap'],
  'The Ahoms and Vijayanagara': ['ahom', 'saraighat', 'lachit', 'vijayanagara', 'hampi', 'krishnadevaraya', 'talikota'],
  'Marathas and Swarajya': ['maratha', 'shivaji', 'swarajya', 'raigad', 'guerrilla', 'deccan'],
  'The Sikhs and the Khalsa': ['sikh', 'khalsa', 'guru nanak', 'guru gobind', 'guru tegh bahadur', 'akal takht', 'misal'],
  'Bhakti Tradition': ['bhakti', 'kabir', 'mirabai', 'tulsidas', 'sankardev', 'sufi', 'sant', 'devotion'],
  'Temples and the Economy': ['temple', 'thanjavur', 'hundi', 'temple town', 'srirangam'],
  'Government vs Governance': ['governance', 'government difference', 'institutions'],
  'Good Governance': ['good governance', 'transparency', 'accountability', 'rule of law', 'participation'],
  'E-Governance': ['e-governance', 'digital governance', 'umang', 'digilocker', 'aapda', 'online services'],
  'Public Policy': ['public policy', 'policy', 'policy making', 'programme scheme'],
  'The Policy Cycle': ['policy cycle', 'policy formulation', 'policy implementation', 'policy evaluation', 'nep 2020'],
  'Policy Coordination': ['policy coordination', 'khelo bharat', 'multi-level', 'stakeholders'],
  'Pillars of Personal Finance': ['personal finance', 'pillar', 'income', 'financial planning'],
  'Budgeting and Saving': ['budget', 'budgeting', 'saving', 'savings', 'gullak', 'expenses'],
  'Investing and Compounding': ['investing', 'compound interest', 'compounding', 'inflation', 'wealth'],
  'Investment Options': ['fixed deposit', 'fd', 'bonds', 'shares', 'stocks', 'mutual fund', 'ppf', 'investment option'],
  'Insurance and Risk': ['insurance', 'premium', 'policy cover', 'life insurance', 'health insurance', 'risk and return', 'liquidity'],
  'Income Tax': ['income tax', 'tax slab', 'gst', 'taxation', 'direct tax', 'indirect tax'],
  'What is Entrepreneurship': ['entrepreneurship', 'entrepreneur', 'idea to business', 'venture'],
  'Business Plan': ['business plan', 'roadmap of business', 'blueprint business'],
  'Functional Areas of a Business': ['functional area', 'operations', 'marketing sales', 'human resource', 'finance accounting'],
  'Profit and Loss': ['profit and loss', 'revenue', 'expenses', 'profit calculation', 'income statement'],
  'Startups and the Nation': ['startup', 'unicorn', 'startup india', 'atmanirbhar', 'viksit bharat'],
};

export function matchConcepts(message: string, subjects: SubjectCtx[]): ConceptHit[] {
  const msg = message.toLowerCase();
  const hits: ConceptHit[] = [];
  for (const s of subjects) {
    for (const ch of s.chapters) {
      for (const c of ch.concepts) {
        const keys = ALIASES[c.name] ?? [c.name.toLowerCase()];
        if (keys.some((k) => msg.includes(k))) {
          hits.push({
            conceptId: c.id,
            conceptName: c.name,
            tier: c.tier,
            score: c.score,
            chapterName: ch.name,
            subjectName: s.name,
          });
        }
      }
    }
  }
  return hits;
}

export async function loadNotes(conceptIds: string[]): Promise<NoteCtx[]> {
  if (conceptIds.length === 0) return [];
  const notes = await db.teacherNote.findMany({
    where: { conceptId: { in: conceptIds }, published: true },
    include: { concept: { include: { chapter: true } } },
  });
  return notes.map((n) => ({
    conceptName: n.concept.name,
    title: n.title,
    sourceRef: n.sourceRef,
    content: n.content,
  }));
}

export async function loadConceptsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return db.concept.findMany({
    where: { id: { in: ids } },
    include: { mastery: true, chapter: { include: { subject: true } } },
  });
}

export async function loadRecentMessages(conversationId: string, limit = 16) {
  const rows = await db.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return rows.reverse().map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
}

// GET /api/context — profile + full learning tree with mastery labels.
// This is what the VidhyaSaathy app will call to hydrate Saathy's context panel.
// Self-healing: if the DB is fresh, subjects are lazily seeded from the KB JSON
// files so the tree is never empty; the profile auto-creates inside loadProfile.
import { loadProfile, loadSubjects } from '@/server/saathy/context';
import { ensureSubjects } from '@/server/saathy/bootstrap';

export const dynamic = 'force-dynamic';

export async function GET() {
  let profile: Awaited<ReturnType<typeof loadProfile>> | null = null;
  let subjects: Awaited<ReturnType<typeof loadSubjects>> = [];
  try {
    profile = await loadProfile();
  } catch {
    profile = null;
  }
  try {
    subjects = await loadSubjects();
    if (subjects.length === 0) {
      await ensureSubjects();
      subjects = await loadSubjects();
    }
  } catch {
    subjects = [];
  }
  return Response.json({ profile, subjects });
}

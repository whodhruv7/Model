// GET /api/context — profile + full learning tree with mastery labels.
// This is what the VidhyaSaathy app will call to hydrate Saathy's context panel.
import { loadProfile, loadSubjects } from '@/server/saathy/context';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [profile, subjects] = await Promise.all([loadProfile(), loadSubjects()]);
  return Response.json({ profile, subjects });
}

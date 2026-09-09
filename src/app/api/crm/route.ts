import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveWorkspaceContext } from '@/lib/workspace/context';
import { readCrm, saveOpportunity } from '@/lib/crm/service';
import { ZodError } from 'zod';

async function workspace() {
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  return user ? (await resolveWorkspaceContext(user.id)).workspaceUserId : null;
}
export async function GET() {
  const id = await workspace();
  if (!id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try { return Response.json(await readCrm(id)); }
  catch (e) { return Response.json({ error: e instanceof Error ? e.message : 'Could not load CRM' }, { status: 500 }); }
}
export async function POST(request: Request) {
  const id = await workspace();
  if (!id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try { return Response.json(await saveOpportunity(id, await request.json())); }
  catch (e) { return Response.json({ error: e instanceof ZodError ? e.issues.map(i => i.message).join(' ') : e instanceof Error ? e.message : 'Could not save' }, { status: 400 }); }
}

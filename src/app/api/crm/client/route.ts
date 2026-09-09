import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveWorkspaceContext } from '@/lib/workspace/context';
import { addOpportunityClient } from '@/lib/crm/service';

export async function POST(request: Request) {
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const workspace = await resolveWorkspaceContext(user.id);
    return Response.json(await addOpportunityClient(workspace.workspaceUserId, (await request.json()).id));
  } catch(e) { return Response.json({ error: e instanceof Error ? e.message : 'Could not add client' }, { status: 400 }); }
}

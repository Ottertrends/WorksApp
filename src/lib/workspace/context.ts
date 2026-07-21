import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Separates the person using WorksApp from the company workspace they can edit. */
export type WorkspaceContext = { actorUserId: string; workspaceUserId: string; isTeamMember: boolean };

export async function resolveWorkspaceContext(actorUserId: string): Promise<WorkspaceContext> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("team_members")
    .select("owner_user_id")
    .eq("member_user_id", actorUserId)
    .eq("status", "active")
    .maybeSingle();
  return {
    actorUserId,
    workspaceUserId: data?.owner_user_id ?? actorUserId,
    isTeamMember: !!data?.owner_user_id,
  };
}

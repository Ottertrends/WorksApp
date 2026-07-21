import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Called on first dashboard load by a member whose raw_user_meta_data.owner_user_id is set.
 * Links their user_id to the team_members row and sets status = 'active'.
 */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const email = (user.email ?? "").toLowerCase();
  if (!email) return NextResponse.json({ ok: false, reason: "missing_email" });

  // Find the pending row for this email under the owner
  const { data: row } = await admin
    .from("team_members")
    .select("id, status")
    .eq("invited_email", email)
    .eq("status", "pending")
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ ok: false, reason: "no_pending_invite" });
  }

  const { data: invitation } = await admin.from("team_members").select("invited_phone_e164, invited_zip_code").eq("id", row.id).single();

  const { error } = await admin
    .from("team_members")
    .update({
      member_user_id: user.id,
      status: "active",
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (invitation) await admin.from("profiles").update({ phone: invitation.invited_phone_e164, phone_e164: invitation.invited_phone_e164, zip_code: invitation.invited_zip_code }).eq("id", user.id);
  return NextResponse.json({ ok: true });
}

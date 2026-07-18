import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function digits(value: string | null | undefined): string {
  return value?.replace(/\D/g, "") ?? "";
}

function maskPhone(value: string | null | undefined): string | null {
  const d = digits(value);
  if (!d) return null;
  return `${"*".repeat(Math.max(d.length - 4, 0))}${d.slice(-4)}`;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("phone_e164")
    .eq("id", user.id)
    .maybeSingle();

  const phone = typeof profile?.phone_e164 === "string" ? profile.phone_e164 : "";
  let query = admin
    .from("whatsapp_webhook_events")
    .select("id, created_at, provider, event_type, result, user_id, sender_phone_e164, recipient_phone_e164, provider_message_id, summary, error")
    .order("created_at", { ascending: false })
    .limit(100);

  query = phone
    ? query.or(`user_id.eq.${user.id},sender_phone_e164.eq.${phone}`)
    : query.eq("user_id", user.id);

  const { data: events, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    events: (events ?? []).map((event) => ({
      ...event,
      sender_phone_e164: maskPhone(event.sender_phone_e164 as string | null),
      recipient_phone_e164: maskPhone(event.recipient_phone_e164 as string | null),
      matched_current_user: event.user_id === user.id,
    })),
  });
}

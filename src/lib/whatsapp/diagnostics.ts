import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { telnyxRequest } from "./telnyx";

export async function getMessagingDiagnostics(userId: string) {
  const admin = createSupabaseAdminClient();
  const [profile, recent, provider] = await Promise.all([
    admin.from("profiles").select("phone_e164").eq("id", userId).maybeSingle(),
    admin.from("whatsapp_webhook_events").select("created_at,result,provider_message_id")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    telnyxRequest("/balance").then(() => ({ ok: true, message: "Telnyx API authenticated" }))
      .catch(() => ({ ok: false, message: "Telnyx API authentication/connectivity failed" })),
  ]);
  const openai = { ok: !!process.env.OPENAI_API_KEY?.trim(), message: "OpenAI key configuration checked; no model request made" };
  const db = { ok: !profile.error && !recent.error, message: profile.error || recent.error ? "Database diagnostics failed" : "Database reachable" };
  const webhook = { ok: !!(process.env.TELNYX_WEBHOOK_PUBLIC_KEY ?? process.env.TELNYX_PUBLIC_KEY)?.trim(), message: "Telnyx webhook signature key configuration" };
  const whatsapp = { ok: provider.ok && !!profile.data?.phone_e164, message: !profile.data?.phone_e164 ? "User has no registered WhatsApp phone" : provider.message };
  return { ok: openai.ok && db.ok && webhook.ok && whatsapp.ok, checks: { openai, whatsapp, db, webhook }, recentDeliveryEvents: recent.data ?? [] };
}

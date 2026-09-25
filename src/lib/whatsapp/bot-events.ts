import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function logBotEvent(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  eventType: "received" | "skipped" | "bootstrap" | "agent" | "replied" | "error",
  result: string,
  jid?: string,
  summary?: string,
): Promise<void> {
  try {
    const { error } = await admin.from("bot_events").insert({
      user_id: userId,
      event_type: eventType,
      result,
      jid: jid ? jid.slice(0, 64) : null,
      summary: summary ? summary.slice(0, 200) : null,
    });
    if (error) throw error;
  } catch {
    console.warn("[bot-events] Diagnostic write failed");
  }
}

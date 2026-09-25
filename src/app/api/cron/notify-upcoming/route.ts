import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface ProfileRow {
  id: string;
  email: string | null;
  notifications_enabled: boolean | null;
}

interface RecurringRow {
  id: string;
  project_id: string;
  recurrence_type: string;
  next_occurrence: string;
  event_time: string | null;
  notes: string | null;
  projects: { name: string | null } | null;
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const now = new Date();
  const { error: pruneError } = await admin.from("bot_events").delete().lt("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
  if (pruneError) console.warn("[cron/notify-upcoming] diagnostic retention cleanup failed");

  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

  // Fetch profiles with notifications enabled
  const { data: profiles, error: profErr } = await admin
    .from("profiles")
    .select("id, email, notifications_enabled")
    .eq("notifications_enabled", true);

  if (profErr) {
    console.error("[cron/notify-upcoming] profiles fetch error:", profErr.message);
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }

  let notified = 0;

  for (const profile of (profiles ?? []) as ProfileRow[]) {
    try {
      // Find recurring rules with next_occurrence tomorrow
      const { data: rules } = await admin
        .from("recurring_projects")
        .select("id, project_id, recurrence_type, next_occurrence, event_time, notes, projects(name)")
        .eq("user_id", profile.id)
        .eq("active", true)
        .eq("next_occurrence", tomorrowStr) as { data: RecurringRow[] | null };

      if (!rules || rules.length === 0) continue;

      const projectLines = rules.map((r) => {
        const name = r.projects?.name ?? "Project";
        const type =
          r.recurrence_type === "weekly" ? "weekly"
          : r.recurrence_type === "monthly" ? "monthly"
          : "recurring";
        const timePart = r.event_time ? ` at ${r.event_time}` : "";
        const notesPart = r.notes ? `\n    📝 ${r.notes}` : "";
        return `• ${name} (${type})${timePart}${notesPart}`;
      });

      const message = `WorksApp reminder 📋\n\nTomorrow's scheduled jobs (${tomorrowStr}):\n${projectLines.join("\n")}\n\nSent by WorksApp`;

      // Scheduled WhatsApp outreach requires approved templates. Keep the existing
      // email fallback until a template-based reminder flow is explicitly configured.
      let sent = false;
      // Email fallback via Resend
      if (!sent && profile.email) {
        const resendKey = process.env.RESEND_API_KEY?.trim();
        if (resendKey) {
          try {
            const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() ?? "notifications@worksapp.co";
            const response = await fetch("https://api.resend.com/emails", {
              method: "POST",
              signal: AbortSignal.timeout(15000),
              headers: {
                Authorization: `Bearer ${resendKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: fromEmail,
                to: profile.email,
                subject: `Tomorrow's jobs — ${tomorrowStr}`,
                text: message,
              }),
            });
            if (!response.ok) throw new Error(`Email provider rejected reminder (${response.status})`);
            sent = true;
            console.log(`[cron/notify-upcoming] Email sent to user ${profile.id}`);
          } catch (e) {
            console.warn(`[cron/notify-upcoming] Email failed for user ${profile.id}:`, e instanceof Error ? e.message : e);
          }
        }
      }

      if (sent) notified++;
    } catch (e) {
      // Never let one user's failure break the whole cron
      console.error(`[cron/notify-upcoming] error for user ${profile.id}:`, e instanceof Error ? e.message : e);
    }
  }

  console.log(`[cron/notify-upcoming] notified ${notified} users for ${tomorrowStr}`);
  return NextResponse.json({ ok: true, notified, date: tomorrowStr });
}

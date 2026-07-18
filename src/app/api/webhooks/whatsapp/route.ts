import { NextResponse } from "next/server";

import { processContractorMessage } from "@/lib/agent/contractor-agent";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logBotEvent } from "@/lib/whatsapp/session-store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type TelnyxPhone = { phone_number?: string | null };
type TelnyxPayload = {
  id?: string | null;
  from?: TelnyxPhone | null;
  to?: TelnyxPhone[] | null;
  text?: string | null;
  media?: Array<{ url?: string | null; content_type?: string | null }> | null;
};
type TelnyxWebhook = {
  data?: {
    id?: string | null;
    event_type?: string | null;
    payload?: TelnyxPayload | null;
  } | null;
};

function getVerifyToken() {
  return process.env.WHATSAPP_VERIFY_TOKEN?.trim() ?? "";
}

function normalizeE164(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const normalized = digits.length === 10 ? `1${digits}` : digits;
  return `+${normalized}`;
}

function getTelnyxApiKey(): string {
  const key = process.env.TELNYX_API_KEY?.trim();
  if (!key) throw new Error("Missing TELNYX_API_KEY");
  return key;
}

async function sendTelnyxWhatsAppText(from: string, to: string, body: string) {
  const res = await fetch("https://api.telnyx.com/v2/messages/whatsapp", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getTelnyxApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      whatsapp_message: {
        type: "text",
        text: {
          body,
          preview_url: false,
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telnyx WhatsApp send failed: ${res.status} ${text.slice(0, 600)}`);
  }

  return res.json() as Promise<unknown>;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = getVerifyToken();

  if (!verifyToken) {
    console.error("[whatsapp-webhook] Missing WHATSAPP_VERIFY_TOKEN");
    return new Response("Webhook verify token is not configured", { status: 500 });
  }

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  }

  console.warn("[whatsapp-webhook] Verification failed");
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  let payload: TelnyxWebhook;

  try {
    payload = (await request.json()) as TelnyxWebhook;
  } catch {
    console.error("[whatsapp-webhook] Invalid JSON body");
    return NextResponse.json({ ok: true });
  }

  const eventType = payload.data?.event_type ?? "";
  const data = payload.data?.payload;

  console.log("[whatsapp-webhook] Event received", {
    eventType,
    messageId: data?.id ?? payload.data?.id ?? null,
  });

  if (eventType !== "message.received") {
    return NextResponse.json({ ok: true, ignored: eventType || "unknown-event" });
  }

  await handleTelnyxInbound(data ?? null);
  return NextResponse.json({ ok: true });
}

async function handleTelnyxInbound(data: TelnyxPayload | null) {
  const from = normalizeE164(data?.from?.phone_number);
  const to = normalizeE164(data?.to?.[0]?.phone_number);
  const text = data?.text?.trim() ?? "";
  const messageId = data?.id?.trim() || null;

  if (!from || !to) {
    console.warn("[whatsapp-webhook] Missing from/to phone", { from, to });
    return;
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id")
    .eq("phone_e164", from)
    .maybeSingle();

  if (profileErr) {
    console.error("[whatsapp-webhook] Profile lookup failed:", profileErr);
    return;
  }

  const userId = profile?.id as string | undefined;
  if (!userId) {
    console.warn("[whatsapp-webhook] No profile for sender:", from);
    return;
  }

  if (!text && !data?.media?.length) {
    await logBotEvent(admin, userId, "skipped", "empty-message", from);
    return;
  }

  const agentText = [
    text,
    ...(data?.media ?? []).map((m) => {
      const type = m.content_type ?? "media";
      const url = m.url ?? "";
      return `[${type} received${url ? `: ${url}` : ""}]`;
    }),
  ].filter(Boolean).join("\n\n");

  if (!agentText.trimStart().startsWith("/")) {
    await logBotEvent(admin, userId, "skipped", "no-trigger", from, agentText.slice(0, 200));
    return;
  }

  const commandText = agentText.trimStart().replace(/^\/\s*/, "");
  if (!commandText) {
    await logBotEvent(admin, userId, "skipped", "empty-command", from);
    return;
  }

  const { data: inserted, error: insertErr } = await admin
    .from("messages")
    .insert({
      user_id: userId,
      project_id: null,
      direction: "inbound",
      content: commandText,
      message_type: data?.media?.length ? "image" : "text",
      whatsapp_message_id: messageId,
      sender_phone_e164: from,
      recipient_phone_e164: to,
      provider: "telnyx",
      processed: false,
    })
    .select("id")
    .maybeSingle();

  if (insertErr) {
    if (insertErr.code === "23505") {
      await logBotEvent(admin, userId, "skipped", "duplicate", from, messageId ?? undefined);
      return;
    }
    console.error("[whatsapp-webhook] Message insert failed:", insertErr);
    await logBotEvent(admin, userId, "error", "insert-failed", from, insertErr.message);
    return;
  }

  const inboundId = inserted?.id as string | undefined;
  if (!inboundId) {
    await logBotEvent(admin, userId, "error", "missing-inbound-id", from);
    return;
  }

  const { data: prior } = await admin
    .from("messages")
    .select("direction, content")
    .eq("user_id", userId)
    .neq("id", inboundId)
    .order("created_at", { ascending: false })
    .limit(10);

  const history = [...(prior ?? [])]
    .reverse()
    .map((m) => ({
      role: m.direction === "inbound" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

  await logBotEvent(admin, userId, "received", "telnyx-inbound", from, commandText.slice(0, 200));

  let reply: string;
  try {
    const agentResult = await processContractorMessage(userId, commandText, history);
    reply = agentResult.reply;
    if (agentResult.error) {
      await logBotEvent(admin, userId, "error", "agent-warning", from, agentResult.error.slice(0, 200));
    }
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error("[whatsapp-webhook] Agent failed:", err);
    await logBotEvent(admin, userId, "error", "agent-error", from, err.slice(0, 200));
    reply = "Sorry, I'm having trouble processing that. Please try again in a moment.";
  }

  await admin.from("messages").insert({
    user_id: userId,
    project_id: null,
    direction: "outbound",
    content: reply,
    message_type: "text",
    whatsapp_message_id: null,
    sender_phone_e164: to,
    recipient_phone_e164: from,
    provider: "telnyx",
    processed: true,
  });

  await admin.from("messages").update({ processed: true }).eq("id", inboundId);
  void Promise.resolve(admin.rpc("trim_user_messages", { p_user_id: userId, p_keep: 50 })).catch(() => {});

  try {
    await sendTelnyxWhatsAppText(to, from, reply);
    await logBotEvent(admin, userId, "replied", "reply-sent", from, reply.slice(0, 200));
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error("[whatsapp-webhook] Telnyx reply failed:", err);
    await logBotEvent(admin, userId, "error", "reply-failed", from, err.slice(0, 200));
  }
}

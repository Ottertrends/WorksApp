import { NextResponse } from "next/server";

import { processContractorMessage } from "@/lib/agent/contractor-agent";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logBotEvent } from "@/lib/whatsapp/session-store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type TelnyxPhone = { phone_number?: string | null };
type TelnyxPhoneValue = TelnyxPhone | string;
type TelnyxWhatsAppBody = {
  id?: string | null;
  type?: string | null;
  text?: { body?: string | null } | null;
  image?: { caption?: string | null; link?: string | null } | null;
  document?: { caption?: string | null; link?: string | null } | null;
  video?: { caption?: string | null; link?: string | null } | null;
};
type TelnyxPayload = {
  id?: string | null;
  from?: TelnyxPhoneValue | null;
  to?: TelnyxPhoneValue[] | TelnyxPhoneValue | null;
  text?: string | null;
  media?: Array<{ url?: string | null; content_type?: string | null }> | null;
  body?: TelnyxWhatsAppBody | null;
};
type TelnyxWebhook = {
  data?: {
    id?: string | null;
    event_type?: string | null;
    payload?: TelnyxPayload | null;
  } | null;
};

type WebhookLogInput = {
  eventType?: string | null;
  result: string;
  userId?: string | null;
  from?: string | null;
  to?: string | null;
  messageId?: string | null;
  summary?: string | null;
  error?: string | null;
  raw?: unknown;
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

async function logWebhookEvent(input: WebhookLogInput) {
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("whatsapp_webhook_events").insert({
      provider: "telnyx",
      event_type: input.eventType ?? null,
      result: input.result,
      user_id: input.userId ?? null,
      sender_phone_e164: input.from ?? null,
      recipient_phone_e164: input.to ?? null,
      provider_message_id: input.messageId ?? null,
      summary: input.summary ? input.summary.slice(0, 500) : null,
      error: input.error ? input.error.slice(0, 1000) : null,
      raw: input.raw ?? null,
    });
    if (error) throw error;
  } catch (e) {
    console.error("[whatsapp-webhook] Failed to write webhook diagnostic:", e);
  }
}

function phoneValue(value: TelnyxPhoneValue | null | undefined): string | null {
  if (typeof value === "string") return value;
  return value?.phone_number ?? null;
}

function getInboundContent(data: TelnyxPayload | null): {
  text: string;
  media: Array<{ url?: string | null; content_type?: string | null }>;
} {
  const body = data?.body;
  const nestedMedia = [
    body?.image ? { url: body.image.link, content_type: "image" } : null,
    body?.document ? { url: body.document.link, content_type: "document" } : null,
    body?.video ? { url: body.video.link, content_type: "video" } : null,
  ].filter((item): item is { url: string | null | undefined; content_type: string } => item !== null);

  const caption = body?.image?.caption ?? body?.document?.caption ?? body?.video?.caption;
  return {
    text: (data?.text ?? body?.text?.body ?? caption ?? "").trim(),
    media: [...(data?.media ?? []), ...nestedMedia],
  };
}

function formatWhatsAppReply(value: string): string {
  return value.replace(
    /\[([^\]]+)]\((https?:\/\/[^)\s]+)\)/g,
    (_match, label: string, url: string) => label.trim() === url ? url : `${label}:\n${url}`,
  );
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
    await logWebhookEvent({
      eventType,
      result: "ignored-event",
      messageId: data?.id ?? payload.data?.id ?? null,
      raw: payload,
    });
    return NextResponse.json({ ok: true, ignored: eventType || "unknown-event" });
  }

  await handleTelnyxInbound(data ?? null, payload);
  return NextResponse.json({ ok: true });
}

async function handleTelnyxInbound(data: TelnyxPayload | null, raw: TelnyxWebhook) {
  const toValue = Array.isArray(data?.to) ? data.to[0] : data?.to;
  const from = normalizeE164(phoneValue(data?.from));
  const to = normalizeE164(phoneValue(toValue));
  const { text, media } = getInboundContent(data);
  const messageId = data?.id?.trim() || null;

  if (!from || !to) {
    console.warn("[whatsapp-webhook] Missing from/to phone", { from, to });
    await logWebhookEvent({
      eventType: "message.received",
      result: "missing-from-or-to",
      from,
      to,
      messageId,
      raw,
    });
    return;
  }

  await logWebhookEvent({
    eventType: "message.received",
    result: "received",
    from,
    to,
    messageId,
    summary: text || (media.length ? `[${media.length} media item(s)]` : null),
    raw,
  });

  const admin = createSupabaseAdminClient();
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id")
    .eq("phone_e164", from)
    .maybeSingle();

  if (profileErr) {
    console.error("[whatsapp-webhook] Profile lookup failed:", profileErr);
    await logWebhookEvent({
      eventType: "message.received",
      result: "profile-lookup-failed",
      from,
      to,
      messageId,
      error: profileErr.message,
    });
    return;
  }

  const userId = profile?.id as string | undefined;
  if (!userId) {
    console.warn("[whatsapp-webhook] No profile for sender:", from);
    await logWebhookEvent({
      eventType: "message.received",
      result: "no-profile-for-sender",
      from,
      to,
      messageId,
      summary: "Sender phone does not match profiles.phone_e164",
    });
    return;
  }

  await logWebhookEvent({
    eventType: "message.received",
    result: "profile-matched",
    userId,
    from,
    to,
    messageId,
  });

  if (!text && !media.length) {
    await logBotEvent(admin, userId, "skipped", "empty-message", from);
    await logWebhookEvent({
      eventType: "message.received",
      result: "empty-message",
      userId,
      from,
      to,
      messageId,
    });
    return;
  }

  const agentText = [
    text,
    ...media.map((m) => {
      const type = m.content_type ?? "media";
      const url = m.url ?? "";
      return `[${type} received${url ? `: ${url}` : ""}]`;
    }),
  ].filter(Boolean).join("\n\n");

  const commandText = agentText.trim();
  if (!commandText) {
    await logBotEvent(admin, userId, "skipped", "empty-command", from);
    await logWebhookEvent({
      eventType: "message.received",
      result: "empty-command",
      userId,
      from,
      to,
      messageId,
    });
    return;
  }

  const { data: inserted, error: insertErr } = await admin
    .from("messages")
    .insert({
      user_id: userId,
      project_id: null,
      direction: "inbound",
      content: commandText,
      message_type: media.length ? "image" : "text",
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
      await logWebhookEvent({
        eventType: "message.received",
        result: "duplicate-message",
        userId,
        from,
        to,
        messageId,
      });
      return;
    }
    console.error("[whatsapp-webhook] Message insert failed:", insertErr);
    await logBotEvent(admin, userId, "error", "insert-failed", from, insertErr.message);
    await logWebhookEvent({
      eventType: "message.received",
      result: "insert-failed",
      userId,
      from,
      to,
      messageId,
      error: insertErr.message,
    });
    return;
  }

  const inboundId = inserted?.id as string | undefined;
  if (!inboundId) {
    await logBotEvent(admin, userId, "error", "missing-inbound-id", from);
    await logWebhookEvent({
      eventType: "message.received",
      result: "missing-inbound-id",
      userId,
      from,
      to,
      messageId,
    });
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
  await logWebhookEvent({
    eventType: "message.received",
    result: "agent-called",
    userId,
    from,
    to,
    messageId,
    summary: commandText.slice(0, 200),
  });

  let reply: string;
  try {
    const agentResult = await processContractorMessage(userId, commandText, history);
    reply = formatWhatsAppReply(agentResult.reply);
    if (agentResult.error) {
      await logBotEvent(admin, userId, "error", "agent-warning", from, agentResult.error.slice(0, 200));
      await logWebhookEvent({
        eventType: "message.received",
        result: "agent-warning",
        userId,
        from,
        to,
        messageId,
        error: agentResult.error,
      });
    }
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error("[whatsapp-webhook] Agent failed:", err);
    await logBotEvent(admin, userId, "error", "agent-error", from, err.slice(0, 200));
    await logWebhookEvent({
      eventType: "message.received",
      result: "agent-error",
      userId,
      from,
      to,
      messageId,
      error: err,
    });
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
    await logWebhookEvent({
      eventType: "message.received",
      result: "reply-sent",
      userId,
      from,
      to,
      messageId,
      summary: reply.slice(0, 200),
    });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error("[whatsapp-webhook] Telnyx reply failed:", err);
    await logBotEvent(admin, userId, "error", "reply-failed", from, err.slice(0, 200));
    await logWebhookEvent({
      eventType: "message.received",
      result: "reply-failed",
      userId,
      from,
      to,
      messageId,
      error: err,
    });
  }
}

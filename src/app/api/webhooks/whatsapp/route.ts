import { after, NextResponse } from "next/server";
import { createPublicKey, verify } from "node:crypto";

import { processContractorMessage } from "@/lib/agent/contractor-agent";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logBotEvent } from "@/lib/whatsapp/session-store";

const UNREGISTERED_NUMBER_MESSAGE =
  "This number is not registered in our database. Please register at WorksApp.co to talk to the WorksApp agent.";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type TelnyxPhone = { phone_number?: string | null };
type TelnyxPhoneValue = TelnyxPhone | string;
type TelnyxWhatsAppBody = {
  id?: string | null;
  type?: string | null;
  text?: { body?: string | null } | null;
  image?: TelnyxNestedMedia | null;
  document?: TelnyxNestedMedia | null;
  video?: TelnyxNestedMedia | null;
};
type TelnyxNestedMedia = {
  caption?: string | null;
  // Telnyx currently uses `url`; `link` remains for older webhook payloads.
  url?: string | null;
  link?: string | null;
  mime_type?: string | null;
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

type InboundMedia = { url?: string | null; content_type?: string | null };

const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
const MEDIA_EXTENSIONS: Record<string, { type: "image" | "video"; extension: string }> = {
  "image/jpeg": { type: "image", extension: "jpg" },
  "image/png": { type: "image", extension: "png" },
  "image/webp": { type: "image", extension: "webp" },
  "image/gif": { type: "image", extension: "gif" },
  "video/mp4": { type: "video", extension: "mp4" },
  "video/quicktime": { type: "video", extension: "mov" },
  "video/webm": { type: "video", extension: "webm" },
  "video/3gpp": { type: "video", extension: "3gp" },
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

/** Telnyx signs `${timestamp}|${rawBody}` with its Ed25519 webhook public key. */
function verifyTelnyxSignature(rawBody: string, request: Request): boolean {
  const publicKey = (process.env.TELNYX_WEBHOOK_PUBLIC_KEY ?? process.env.TELNYX_PUBLIC_KEY ?? "").trim();
  const timestamp = request.headers.get("telnyx-timestamp")?.trim();
  const signatureValue = request.headers.get("telnyx-signature-ed25519")?.trim();
  if (!publicKey || !timestamp || !signatureValue) return false;

  try {
    const key = publicKey.includes("BEGIN PUBLIC KEY")
      ? createPublicKey(publicKey)
      : createPublicKey({
          key: Buffer.concat([
            Buffer.from("302a300506032b6570032100", "hex"),
            Buffer.from(publicKey, "base64"),
          ]),
          format: "der",
          type: "spki",
        });
    const signature = /^[0-9a-f]+$/i.test(signatureValue) && signatureValue.length === 128
      ? Buffer.from(signatureValue, "hex")
      : Buffer.from(signatureValue, "base64");
    return verify(null, Buffer.from(`${timestamp}|${rawBody}`), key, signature);
  } catch {
    return false;
  }
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
    body?.image ? { url: body.image.url ?? body.image.link, content_type: body.image.mime_type ?? "image" } : null,
    body?.document ? { url: body.document.url ?? body.document.link, content_type: body.document.mime_type ?? "document" } : null,
    body?.video ? { url: body.video.url ?? body.video.link, content_type: body.video.mime_type ?? "video" } : null,
  ].filter((item): item is { url: string; content_type: string } => !!item?.url);

  const caption = body?.image?.caption ?? body?.document?.caption ?? body?.video?.caption;
  return {
    text: (data?.text ?? body?.text?.body ?? caption ?? "").trim(),
    media: [...(data?.media ?? []), ...nestedMedia],
  };
}

function inferMediaMimeType(url: string, reportedType: string): string {
  const type = reportedType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  if (MEDIA_EXTENSIONS[type]) return type;
  const extension = url.toLowerCase().match(/\.([a-z0-9]{2,5})(?:[?#]|$)/)?.[1];
  const byExtension: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
    mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", "3gp": "video/3gpp",
  };
  return extension ? (byExtension[extension] ?? type) : type;
}

function isTransientMediaResponse(status: number): boolean {
  return status === 404 || status === 408 || status === 425 || status === 429 || status >= 500;
}

async function downloadTelnyxMedia(url: string): Promise<Response> {
  let lastResponse: Response | null = null;

  // The URL can be an authenticated endpoint or a short-lived signed URL.
  // Only temporary failures are retried, so ordinary messages are not delayed.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response = await fetch(url, { headers: { Authorization: `Bearer ${getTelnyxApiKey()}` } });
    if (!response.ok) response = await fetch(url);
    if (response.ok) return response;

    lastResponse = response;
    if (!isTransientMediaResponse(response.status) || attempt === 2) break;
    await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
  }

  throw new Error(`Telnyx media download failed (${lastResponse?.status ?? "unknown"})`);
}

async function persistTelnyxMedia(args: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  userId: string;
  messageId: string | null;
  media: InboundMedia;
  caption: string | null;
}): Promise<{ id: string; type: "image" | "video" }> {
  if (!args.media.url) throw new Error("Telnyx media URL is missing");

  if (args.messageId) {
    const { data: existing } = await args.admin
      .from("project_media")
      .select("id, media_type")
      .eq("user_id", args.userId)
      .eq("whatsapp_message_id", args.messageId)
      .maybeSingle();
    if (existing?.id && (existing.media_type === "image" || existing.media_type === "video")) {
      return { id: existing.id as string, type: existing.media_type };
    }
  }

  const response = await downloadTelnyxMedia(args.media.url);

  const mimeType = inferMediaMimeType(
    args.media.url,
    response.headers.get("content-type") ?? args.media.content_type ?? "",
  );
  const format = MEDIA_EXTENSIONS[mimeType];
  if (!format) throw new Error(`Unsupported Telnyx media type: ${mimeType || "unknown"}`);

  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_MEDIA_BYTES) throw new Error("Media exceeds the 50 MB upload limit");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_MEDIA_BYTES) throw new Error("Media is empty or exceeds the 50 MB upload limit");

  const storagePath = `${args.userId}/${crypto.randomUUID()}.${format.extension}`;
  const { error: uploadError } = await args.admin.storage
    .from("project-media")
    .upload(storagePath, bytes, { contentType: mimeType });
  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

  const { data: last } = await args.admin
    .from("project_media")
    .select("sort_order")
    .eq("user_id", args.userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error: insertError } = await args.admin
    .from("project_media")
    .insert({
      user_id: args.userId,
      project_id: null,
      storage_path: storagePath,
      media_type: format.type,
      mime_type: mimeType,
      description: args.caption,
      whatsapp_message_id: args.messageId,
      file_size_bytes: bytes.length,
      sort_order: (last?.sort_order ?? -1) + 1,
    })
    .select("id")
    .single();
  if (insertError) {
    await args.admin.storage.from("project-media").remove([storagePath]);
    throw new Error(`Media record creation failed: ${insertError.message}`);
  }
  return { id: data.id as string, type: format.type };
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
  const rawBody = await request.text();
  if (!verifyTelnyxSignature(rawBody, request)) {
    console.warn("[whatsapp-webhook] Rejected invalid or unsigned Telnyx webhook");
    after(() => logWebhookEvent({ eventType: "message.received", result: "signature-invalid", error: "Missing or invalid Telnyx signature" }));
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: TelnyxWebhook;

  try {
    payload = JSON.parse(rawBody) as TelnyxWebhook;
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
    after(() => logWebhookEvent({
      eventType,
      result: "ignored-event",
      messageId: data?.id ?? payload.data?.id ?? null,
      raw: payload,
    }));
    return NextResponse.json({ ok: true, ignored: eventType || "unknown-event" });
  }

  after(() => handleTelnyxInbound(data ?? null, payload).catch((error) => {
    console.error("[whatsapp-webhook] Background inbound processing failed:", error);
    return logWebhookEvent({
      eventType: "message.received",
      result: "background-processing-failed",
      messageId: data?.id ?? payload.data?.id ?? null,
      error: error instanceof Error ? error.message : String(error),
      raw: payload,
    });
  }));
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
    try {
      await sendTelnyxWhatsAppText(to, from, UNREGISTERED_NUMBER_MESSAGE);
      await logWebhookEvent({
        eventType: "message.received",
        result: "unregistered-number-reply-sent",
        from,
        to,
        messageId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[whatsapp-webhook] Unregistered-number reply failed:", message);
      await logWebhookEvent({
        eventType: "message.received",
        result: "unregistered-number-reply-failed",
        from,
        to,
        messageId,
        error: message,
      });
    }
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

  const caption = data?.body?.image?.caption ?? data?.body?.video?.caption ?? data?.body?.document?.caption ?? null;
  const mediaContexts: string[] = [];
  const persistedMediaTypes: Array<"image" | "video"> = [];
  const uniqueMedia = media.filter((item, index, all) => item.url && all.findIndex((candidate) => candidate.url === item.url) === index);
  for (const item of uniqueMedia) {
    try {
      const saved = await persistTelnyxMedia({ admin, userId, messageId, media: item, caption });
      const label = saved.type === "video" ? "Video" : "Image";
      persistedMediaTypes.push(saved.type);
      const emoji = saved.type === "video" ? "🎥" : "📸";
      mediaContexts.push(`${emoji} ${label} received successfully. Media ID: ${saved.id}`);
      await logWebhookEvent({ eventType: "message.received", result: "media-persisted", userId, from, to, messageId, summary: `${saved.type}:${saved.id}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const type = item.content_type?.includes("video") ? "Video" : "Image";
      mediaContexts.push(`${type} could not be saved. Do not attempt to attach it; explain that the upload failed.`);
      await logWebhookEvent({ eventType: "message.received", result: "media-persist-failed", userId, from, to, messageId, error: message });
    }
  }

  const agentText = [text, ...mediaContexts].filter(Boolean).join("\n\n");

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
      message_type: persistedMediaTypes.includes("video") ? "video" : persistedMediaTypes.length ? "image" : "text",
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

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getVerifyToken() {
  return process.env.WHATSAPP_VERIFY_TOKEN?.trim() ?? "";
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
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    console.error("[whatsapp-webhook] Invalid JSON body");
    return NextResponse.json({ ok: true });
  }

  const object =
    typeof payload === "object" && payload !== null && "object" in payload
      ? String((payload as { object?: unknown }).object ?? "")
      : "";

  console.log("[whatsapp-webhook] Event received", {
    object,
  });

  return NextResponse.json({ ok: true });
}

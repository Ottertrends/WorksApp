/** Server-only transport. Credentials never leave the Authorization header. */
export async function telnyxRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  const key = process.env.TELNYX_API_KEY?.trim();
  if (!key) throw new Error("Missing TELNYX_API_KEY");
  const response = await fetch(`https://api.telnyx.com/v2${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Telnyx request failed (${response.status})`);
  return response.json();
}

export async function sendTelnyxWhatsAppText(from: string, to: string, body: string): Promise<string> {
  const key = process.env.TELNYX_API_KEY?.trim();
  if (!key) throw new Error("Missing TELNYX_API_KEY");
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch("https://api.telnyx.com/v2/messages/whatsapp", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ from, to, whatsapp_message: { type: "text", text: { body, preview_url: false } } }),
    });
    // Only retry explicit rate-limit rejection. A timeout/5xx may have accepted
    // the message already; blindly resending could duplicate the contractor reply.
    if (response.status === 429 && attempt < 2) {
      const retryAfter = response.headers.get("retry-after");
      const seconds = retryAfter === null ? NaN : Number(retryAfter);
      const delay = Number.isFinite(seconds) ? seconds * 1000
        : retryAfter ? Date.parse(retryAfter) - Date.now() : 500 * 2 ** attempt;
      if (!Number.isFinite(delay) || delay > 5000) throw new Error("Telnyx rate limit: retry later");
      await response.body?.cancel();
      await new Promise((resolve) => setTimeout(resolve, Math.max(250, delay)));
      continue;
    }
    if (!response.ok) throw new Error(`Telnyx WhatsApp send failed (${response.status})`);
    const result = await response.json() as { data?: { id?: string } };
    if (!result.data?.id) throw new Error("Telnyx accepted request without a message ID; delivery requires reconciliation");
    return result.data.id;
  }
  throw new Error("Telnyx rate limit exhausted");
}

export function deliveryResult(payload: { to?: unknown; errors?: unknown }): string {
  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
  const statuses = recipients.map((value) => typeof value === "object" && value !== null ? value.status : undefined);
  if (statuses.some((s) => ["delivery_failed", "sending_failed", "failed", "undelivered"].includes(s))
    || (Array.isArray(payload.errors) && payload.errors.length > 0)) return "delivery-failed";
  if (statuses.length > 0 && statuses.every((s) => s === "delivered" || s === "read")) return "delivered";
  if (statuses.some((s) => s === "sent")) return "sent";
  return "delivery-status-unknown";
}

export function getAppBaseUrl(): string {
  // Public invoice/proposal links must always use the canonical customer domain.
  // This avoids stale preview or legacy domain environment values being shared.
  if (process.env.NODE_ENV === "production") {
    return "https://www.worksapp.co";
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, "")}`;

  return "http://127.0.0.1:3000";
}

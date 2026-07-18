export const PHONE_ALREADY_REGISTERED_MESSAGE =
  "This phone number is already registered. Use another number or contact support.";

export function normalizePhoneE164(input: string | null | undefined, defaultCountryCode = "1"): string | null {
  const raw = input?.trim();
  if (!raw) return null;

  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  const countryCode = defaultCountryCode.replace(/\D/g, "");
  if (!digits) return null;

  if (hasPlus) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+${countryCode}${digits}`;
  }

  if (digits.startsWith(countryCode)) {
    return `+${digits}`;
  }

  return `+${countryCode}${digits}`;
}

export function isPhoneUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown; details?: unknown };
  const text = [candidate.message, candidate.details]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return candidate.code === "23505" || text.includes("idx_profiles_phone_e164_unique");
}

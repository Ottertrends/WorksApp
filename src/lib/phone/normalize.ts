export function normalizePhoneE164(input: string | null | undefined, defaultCountryCode = "1"): string | null {
  const raw = input?.trim();
  if (!raw) return null;

  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (hasPlus) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+${defaultCountryCode}${digits}`;
  }

  if (digits.length === 11 && digits.startsWith(defaultCountryCode)) {
    return `+${digits}`;
  }

  return `+${digits}`;
}


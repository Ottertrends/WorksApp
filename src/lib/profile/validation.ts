import { normalizePhoneE164 } from "@/lib/phone/normalize";

export const PROFILE_QUOTES = ["1-5", "6-15", "16-30", "30+"] as const;

export type ProfileUpdateInput = {
  full_name?: unknown;
  company_name?: unknown;
  phone?: unknown;
  zip_code?: unknown;
  quotes_per_month?: unknown;
  business_areas?: unknown;
  services?: unknown;
};

export type ValidProfileUpdate = {
  full_name: string;
  company_name: string;
  phone: string;
  phone_e164: string;
  zip_code: string;
  quotes_per_month: (typeof PROFILE_QUOTES)[number];
  business_areas: string[];
  services: string[];
};

function cleanList(value: unknown, field: string, errors: Record<string, string>): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    errors[field] = "Choose valid values.";
    return [];
  }
  return [...new Set(value.map((item) => item.trim()))];
}

export function validateProfileUpdate(input: ProfileUpdateInput): { data?: ValidProfileUpdate; errors?: Record<string, string> } {
  const errors: Record<string, string> = {};
  const fullName = typeof input.full_name === "string" ? input.full_name.trim() : "";
  const companyName = typeof input.company_name === "string" ? input.company_name.trim() : "";
  const zip = typeof input.zip_code === "string" ? input.zip_code.trim() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  const phoneE164 = normalizePhoneE164(phone);
  const quotes = input.quotes_per_month;

  if (!fullName || fullName.length > 120) errors.full_name = "Enter a name up to 120 characters.";
  if (!companyName || companyName.length > 160) errors.company_name = "Enter a company name up to 160 characters.";
  if (!phoneE164 || phoneE164.length > 18) errors.phone = "Enter a valid phone number.";
  if (!zip || zip.length > 12 || !/^[A-Za-z0-9 -]+$/.test(zip)) errors.zip_code = "Enter a valid ZIP or postal code.";
  if (!PROFILE_QUOTES.includes(quotes as (typeof PROFILE_QUOTES)[number])) errors.quotes_per_month = "Choose a valid quote volume.";
  const businessAreas = cleanList(input.business_areas, "business_areas", errors);
  const services = cleanList(input.services, "services", errors);
  if (Object.keys(errors).length) return { errors };

  return { data: { full_name: fullName, company_name: companyName, phone: phoneE164!, phone_e164: phoneE164!, zip_code: zip, quotes_per_month: quotes as ValidProfileUpdate["quotes_per_month"], business_areas: businessAreas, services } };
}

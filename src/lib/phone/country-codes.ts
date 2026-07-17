export const PHONE_COUNTRY_CODES = [
  { value: "1", label: "US/Canada", dialCode: "+1" },
  { value: "52", label: "Mexico", dialCode: "+52" },
  { value: "44", label: "United Kingdom", dialCode: "+44" },
  { value: "57", label: "Colombia", dialCode: "+57" },
  { value: "54", label: "Argentina", dialCode: "+54" },
  { value: "55", label: "Brazil", dialCode: "+55" },
  { value: "56", label: "Chile", dialCode: "+56" },
  { value: "51", label: "Peru", dialCode: "+51" },
  { value: "34", label: "Spain", dialCode: "+34" },
] as const;

export const DEFAULT_PHONE_COUNTRY_CODE = PHONE_COUNTRY_CODES[0].value;

export function inferPhoneCountryCode(phoneE164: string | null | undefined): string {
  const digits = phoneE164?.replace(/\D/g, "") ?? "";
  const match = [...PHONE_COUNTRY_CODES]
    .sort((a, b) => b.value.length - a.value.length)
    .find((option) => digits.startsWith(option.value));

  return match?.value ?? DEFAULT_PHONE_COUNTRY_CODE;
}

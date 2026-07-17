export const PHONE_COUNTRY_CODES = [
  { value: "1", label: "United States", dialCode: "+1" },
  { value: "52", label: "Mexico", dialCode: "+52" },
  { value: "54", label: "Argentina", dialCode: "+54" },
  { value: "61", label: "Australia", dialCode: "+61" },
  { value: "55", label: "Brazil", dialCode: "+55" },
  { value: "1-ca", label: "Canada", dialCode: "+1" },
  { value: "56", label: "Chile", dialCode: "+56" },
  { value: "86", label: "China", dialCode: "+86" },
  { value: "57", label: "Colombia", dialCode: "+57" },
  { value: "506", label: "Costa Rica", dialCode: "+506" },
  { value: "593", label: "Ecuador", dialCode: "+593" },
  { value: "503", label: "El Salvador", dialCode: "+503" },
  { value: "33", label: "France", dialCode: "+33" },
  { value: "49", label: "Germany", dialCode: "+49" },
  { value: "502", label: "Guatemala", dialCode: "+502" },
  { value: "504", label: "Honduras", dialCode: "+504" },
  { value: "91", label: "India", dialCode: "+91" },
  { value: "353", label: "Ireland", dialCode: "+353" },
  { value: "39", label: "Italy", dialCode: "+39" },
  { value: "81", label: "Japan", dialCode: "+81" },
  { value: "505", label: "Nicaragua", dialCode: "+505" },
  { value: "507", label: "Panama", dialCode: "+507" },
  { value: "51", label: "Peru", dialCode: "+51" },
  { value: "63", label: "Philippines", dialCode: "+63" },
  { value: "34", label: "Spain", dialCode: "+34" },
  { value: "44", label: "United Kingdom", dialCode: "+44" },
] as const;

export const DEFAULT_PHONE_COUNTRY_CODE = PHONE_COUNTRY_CODES[0].value;

export function inferPhoneCountryCode(phoneE164: string | null | undefined): string {
  const digits = phoneE164?.replace(/\D/g, "") ?? "";
  const match = [...PHONE_COUNTRY_CODES]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((option) => digits.startsWith(option.dialCode.replace(/\D/g, "")));

  return match?.value ?? DEFAULT_PHONE_COUNTRY_CODE;
}

export function phoneCountryValueToDialCode(value: string): string {
  const option = PHONE_COUNTRY_CODES.find((country) => country.value === value);
  return option?.dialCode.replace(/\D/g, "") ?? value.replace(/\D/g, "");
}

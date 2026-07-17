"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PHONE_COUNTRY_CODES } from "@/lib/phone/country-codes";

export function CountryCodeSelect({
  value,
  onValueChange,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger aria-label="Phone country code" className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PHONE_COUNTRY_CODES.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.dialCode} {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

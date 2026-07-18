import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  PHONE_ALREADY_REGISTERED_MESSAGE,
  isPhoneUniqueViolation,
  normalizePhoneE164,
} from "@/lib/phone/normalize";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    phone?: string;
    phone_e164?: string;
    company_name?: string;
    zip_code?: string;
    quotes_per_month?: string;
    business_areas?: string[];
    services?: string[];
  };

  const { phone, phone_e164, company_name, zip_code, quotes_per_month, business_areas, services } = body;

  if (!phone?.trim()) {
    return NextResponse.json({ error: "Phone is required" }, { status: 400 });
  }
  if (!company_name?.trim()) {
    return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  }

  if (!zip_code?.trim()) {
    return NextResponse.json({ error: "ZIP code is required" }, { status: 400 });
  }

  const normalizedPhone = normalizePhoneE164(phone_e164?.trim() || phone.trim());
  if (!normalizedPhone) {
    return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      phone: normalizedPhone,
      phone_e164: normalizedPhone,
      company_name: company_name.trim(),
      zip_code: zip_code?.trim() ?? null,
      quotes_per_month: quotes_per_month ?? "1-5",
      business_areas: business_areas ?? [],
      services: services ?? [],
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("[complete-profile]", error);
    if (isPhoneUniqueViolation(error)) {
      return NextResponse.json({ error: PHONE_ALREADY_REGISTERED_MESSAGE }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

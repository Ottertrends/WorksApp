import { NextResponse } from "next/server";

import { PHONE_ALREADY_REGISTERED_MESSAGE, isPhoneUniqueViolation } from "@/lib/phone/normalize";
import { validateProfileUpdate } from "@/lib/profile/validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const validated = validateProfileUpdate(body ?? {});
  if (!validated.data) return NextResponse.json({ error: "Please correct the highlighted fields.", fields: validated.errors }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Please correct the highlighted fields.", fields: { email: "Enter a valid email address." } }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: occupied, error: availabilityError } = await admin.from("profiles").select("id").eq("phone_e164", validated.data.phone_e164).neq("id", user.id).maybeSingle();
  if (availabilityError) return NextResponse.json({ error: "Unable to verify phone number." }, { status: 500 });
  if (occupied) return NextResponse.json({ error: PHONE_ALREADY_REGISTERED_MESSAGE, fields: { phone: PHONE_ALREADY_REGISTERED_MESSAGE } }, { status: 409 });

  let emailConfirmationRequired = false;
  if (email !== user.email?.toLowerCase()) {
    const { data: authData, error: authError } = await supabase.auth.updateUser({ email });
    if (authError) return NextResponse.json({ error: authError.message, fields: { email: authError.message } }, { status: 400 });
    emailConfirmationRequired = !!authData.user?.new_email;
  }

  const { data: profile, error } = await admin.from("profiles").update({ ...validated.data, email }).eq("id", user.id).select("*").single();
  if (error) {
    const message = isPhoneUniqueViolation(error) ? PHONE_ALREADY_REGISTERED_MESSAGE : error.message;
    return NextResponse.json({ error: message, fields: isPhoneUniqueViolation(error) ? { phone: message } : undefined }, { status: isPhoneUniqueViolation(error) ? 409 : 500 });
  }
  return NextResponse.json({ profile, email_confirmation_required: emailConfirmationRequired });
}

import { NextResponse } from "next/server";

import { normalizePhoneE164 } from "@/lib/phone/normalize";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { phone?: unknown } | null;
  const phone = normalizePhoneE164(typeof body?.phone === "string" ? body.phone : null);

  if (!phone) {
    return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let query = createSupabaseAdminClient()
    .from("profiles")
    .select("id")
    .eq("phone_e164", phone);

  if (user) query = query.neq("id", user.id);

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) {
    console.error("[phone-availability]", error);
    return NextResponse.json({ error: "Unable to verify phone number." }, { status: 500 });
  }

  return NextResponse.json(
    { available: !data },
    { headers: { "Cache-Control": "no-store" } },
  );
}

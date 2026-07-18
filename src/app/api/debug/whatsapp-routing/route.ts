import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { evolutionInstanceName } from "@/lib/whatsapp/instance-name";
import { getSessionSlice } from "@/lib/whatsapp/session-store";

export const dynamic = "force-dynamic";

function digits(value: string | null | undefined): string {
  return value?.replace(/\D/g, "") ?? "";
}

function maskDigits(value: string): string | null {
  if (!value) return null;
  if (value.length <= 4) return "*".repeat(value.length);
  return `${"*".repeat(Math.max(value.length - 4, 0))}${value.slice(-4)}`;
}

function ownerJidFromPhone(phone: string | null | undefined): string | null {
  const d = digits(phone);
  if (!d) return null;
  const normalized = d.length === 10 ? `1${d}` : d;
  return `${normalized}@s.whatsapp.net`;
}

function maskJid(jid: string | null | undefined): string | null {
  if (!jid) return null;
  const [local, domain] = jid.split("@");
  return `${maskDigits(digits(local)) ?? local}@${domain ?? ""}`;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select(
      "phone, phone_e164, whatsapp_instance_id, whatsapp_connected, whatsapp_sessions, whatsapp_owner_jid, whatsapp_owner_lid, whatsapp_lid_pending",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const instanceName =
    (profile?.whatsapp_instance_id as string | null) ?? evolutionInstanceName(user.id);
  const session = getSessionSlice(profile, instanceName, evolutionInstanceName(user.id));
  const profilePhone =
    typeof profile?.phone_e164 === "string" && profile.phone_e164.trim()
      ? profile.phone_e164
      : (profile?.phone as string | null | undefined);
  const derivedOwnerJid = ownerJidFromPhone(profilePhone);

  return NextResponse.json({
    whatsapp_connected: !!profile?.whatsapp_connected,
    instance_name: instanceName,
    phone_digits_length: digits(profile?.phone as string | null | undefined).length,
    phone_e164_digits_length: digits(profile?.phone_e164 as string | null | undefined).length,
    profile_phone_masked: maskDigits(digits(profilePhone)),
    derived_owner_jid_masked: maskJid(derivedOwnerJid),
    stored_owner_jid_masked: maskJid(session.ownerJid),
    stored_owner_lid_present: !!session.ownerLid,
    lid_pending: session.lidPending,
    expected_format: {
      profiles_phone_e164: "+17372969713",
      evolution_owner_jid: "17372969713@s.whatsapp.net",
    },
  });
}

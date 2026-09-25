import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
export async function POST() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: false, error: "WhatsApp uses one shared Telnyx messaging profile. Per-user webhook resync is retired; manage its callback in Telnyx." }, { status: 410 });
}

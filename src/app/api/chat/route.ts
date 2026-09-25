import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { processContractorMessage } from "@/lib/agent/contractor-agent";
import { resolveWorkspaceContext } from "@/lib/workspace/context";

export const maxDuration = 300; // same serverless budget as the WhatsApp agent

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { messages?: Array<{ role: "user" | "assistant"; content: string }> };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body || !Array.isArray(body.messages) || !body.messages.length || body.messages.length > 100
    || body.messages.some((m) => !m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || m.content.length > 20000)
    || body.messages.at(-1)?.role !== "user" || !body.messages.at(-1)?.content.trim()) {
    return NextResponse.json({ error: "Valid messages ending with a user request are required" }, { status: 400 });
  }

  // Extract the last user message and prior history
  const lastUserMessage = [...body.messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage) {
    return NextResponse.json({ error: "No user message found" }, { status: 400 });
  }
  const history = body.messages.slice(0, -1).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Run the full contractor agent (same as WhatsApp)
  const workspace = await resolveWorkspaceContext(user.id);
  const result = await processContractorMessage(workspace.actorUserId, lastUserMessage.content, history, workspace.workspaceUserId);

  if (result.limitReached) return NextResponse.json({ error: result.reply }, { status: 402 });

  return NextResponse.json({ reply: result.reply });
}

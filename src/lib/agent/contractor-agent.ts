import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { executeTool } from "@/lib/agent/tool-handlers";
import { MINI_MODEL } from "@/lib/agent/model";
import { routeToModel } from "@/lib/agent/model-router";
import { buildSystemPrompt } from "@/lib/agent/types";
import { CONTRACTOR_TOOLS } from "@/lib/agent/tools";

function formatAgentError(e: unknown): string {
  if (e instanceof Error) {
    const any = e as Error & {
      status?: number;
      body?: unknown;
      error?: { message?: string; type?: string };
    };
    const parts: string[] = [any.message || "Error"];
    if (typeof any.status === "number") parts.push(`http=${any.status}`);
    if (any.error?.message) parts.push(`api=${any.error.message}`);
    if (any.body !== undefined) {
      try {
        parts.push(`body=${JSON.stringify(any.body).slice(0, 400)}`);
      } catch {
        parts.push("body=(unserializable)");
      }
    }
    return parts.join(" | ");
  }
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export type AgentRunResult = {
  reply: string;
  /** Set when OpenAI/API/tools failed; `reply` may still be a safe fallback string */
  error?: string;
};

const INVOICE_MUTATION_TOOLS = new Set([
  "create_invoice_draft",
  "finalize_invoice",
  "send_invoice_stripe",
  "get_invoice_payment_link",
  "share_invoice",
]);

function extractHttpUrls(value: string): string[] {
  return value.match(/https?:\/\/[^\s"'<>]+/g)?.map((url) => url.replace(/[),.;]+$/, "")) ?? [];
}

function claimsCompletedInvoiceAction(text: string): boolean {
  const normalized = text.toLowerCase();
  const completion = /\b(created|finalized|generated|shared|sent|ready|completed)\b|\bhere(?:'s| is)\b/;
  const invoiceSubject = /\b(invoice|stripe|payment link|invoice link)\b/;
  return completion.test(normalized) && invoiceSubject.test(normalized);
}

function claimsSharedLink(text: string): boolean {
  const normalized = text.toLowerCase();
  return /\b(here(?:'s| is)|generated|created|share(?:d|able)|payment link|open to pay)\b/.test(normalized)
    && /\b(link|url|pay online|stripe invoice)\b/.test(normalized);
}

function getClient() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("Missing OPENAI_API_KEY");
  return new OpenAI({ apiKey: key });
}

function buildMessageParams(
  history: { role: "user" | "assistant"; content: string }[],
  latestUserText: string,
): ChatCompletionMessageParam[] {
  const recent = history.slice(-8);
  const msgs: ChatCompletionMessageParam[] = recent.map((h) => ({
    role: h.role,
    content: h.content,
  }));
  msgs.push({ role: "user", content: latestUserText });
  return msgs;
}

function toOpenAITools(): ChatCompletionTool[] {
  return CONTRACTOR_TOOLS.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}

export async function processContractorMessage(
  userId: string,
  messageText: string,
  history: { role: "user" | "assistant"; content: string }[],
): Promise<AgentRunResult> {
  const fallback =
    "Sorry, I'm having trouble processing that. Please try again in a moment.";

  try {
    const client = getClient();
    const { model, method: routeMethod } = await routeToModel(messageText, client);
    console.log("[contractor-agent] start", {
      model: model === MINI_MODEL ? "mini" : "chatgpt",
      routeMethod,
      userId: userId.slice(0, 8),
      historyLen: history.length,
    });

    const admin = createSupabaseAdminClient();
    const [{ data: memRow }, { data: profRow }] = await Promise.all([
      admin.from("agent_memory").select("memory_text, updated_at").eq("user_id", userId).maybeSingle(),
      admin.from("profiles").select("zip_code, city, state, stripe_connect_account_id, stripe_connect_charges_enabled").eq("id", userId).maybeSingle(),
    ]);

    const memoryBlock = memRow?.memory_text?.trim()
      ? `\n\nYOUR MEMORY ABOUT THIS CONTRACTOR\n${memRow.memory_text}\n(Last updated: ${memRow.updated_at ? new Date(memRow.updated_at).toLocaleDateString() : "unknown"})\nWhen you learn new important details, call update_memory with the full updated memory block.`
      : `\n\nCONTRACTOR MEMORY\n(No notes yet. As you learn about this contractor's services, pricing, clients, and work style, call update_memory to start building their profile.)`;

    const systemWithMemory = buildSystemPrompt({
      zip: profRow?.zip_code,
      city: profRow?.city,
      state: profRow?.state,
      stripeConnected: !!(profRow?.stripe_connect_account_id && profRow?.stripe_connect_charges_enabled),
    }) + memoryBlock;

    const MONTHLY_TOKEN_CAP = 6_500_000;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const { data: monthRows } = await admin
      .from("api_usage")
      .select("openai_input_tokens, openai_output_tokens")
      .eq("user_id", userId)
      .gte("date", monthStart.toISOString().slice(0, 10));
    const monthlyTokens = (monthRows ?? []).reduce(
      (sum, r) => sum + (r.openai_input_tokens ?? 0) + (r.openai_output_tokens ?? 0),
      0,
    );
    if (monthlyTokens >= MONTHLY_TOKEN_CAP) {
      return {
        reply: "You've reached your monthly usage limit (6.5M tokens). Your limit resets on the 1st of next month.",
        error: `Monthly token cap exceeded: ${monthlyTokens.toLocaleString()} / ${MONTHLY_TOKEN_CAP.toLocaleString()}`,
      };
    }

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemWithMemory },
      ...buildMessageParams(history, messageText),
    ];
    const tools = toOpenAITools();
    const maxLoops = 15;
    const successfulTools = new Set<string>();
    const verifiedUrls = new Set<string>();
    let forceToolCall = false;
    let correctionCount = 0;

    for (let i = 0; i < maxLoops; i++) {
      const response = await client.chat.completions.create({
        model,
        max_completion_tokens: 2048,
        tools,
        tool_choice: forceToolCall ? "required" : "auto",
        messages,
      });
      forceToolCall = false;
      const message = response.choices[0]?.message;

      if (response.usage) {
        const today = new Date().toISOString().slice(0, 10);
        const isMini = model === MINI_MODEL;
        void Promise.resolve(
          admin.rpc("increment_usage", {
            p_user_id: userId,
            p_date: today,
            p_input: isMini ? 0 : (response.usage.prompt_tokens ?? 0),
            p_output: isMini ? 0 : (response.usage.completion_tokens ?? 0),
            p_tavily: 0,
            p_web_messages: 0,
            p_mini_input: isMini ? (response.usage.prompt_tokens ?? 0) : 0,
            p_mini_output: isMini ? (response.usage.completion_tokens ?? 0) : 0,
          }),
        ).catch((err: unknown) => console.warn("[contractor-agent] usage tracking failed:", err));
      }

      if (!message) {
        return { reply: fallback, error: "OpenAI returned no message" };
      }

      if (!message.tool_calls?.length) {
        const text = message.content?.trim() ?? "";
        const completedClaim = claimsCompletedInvoiceAction(text);
        const linkClaim = claimsSharedLink(text);
        const hasInvoiceMutation = [...successfulTools].some((name) => INVOICE_MUTATION_TOOLS.has(name));
        const hasVerifiedLink = verifiedUrls.size > 0;
        const replyUrls = extractHttpUrls(text);
        const hasUnverifiedUrl = replyUrls.some((url) => !verifiedUrls.has(url));

        if (
          correctionCount < 2
          && ((completedClaim && !hasInvoiceMutation) || (linkClaim && (!hasVerifiedLink || hasUnverifiedUrl)))
        ) {
          messages.push(message);
          messages.push({
            role: "system",
            content:
              "Execution guard: you claimed an invoice/Stripe action or link without verified tool output. "
              + "Call the required tools now. Use lookup tools first if you need an invoice or project ID. "
              + "Never invent a URL or use a placeholder link. Only report success from an ok:true tool result.",
          });
          correctionCount += 1;
          forceToolCall = true;
          continue;
        }

        if (linkClaim && !hasVerifiedLink) {
          return {
            reply: "I couldn't verify a real invoice link, so I haven't shared one. Please try again or open the invoice in WorksApp.",
            error: "Blocked unverified invoice link claim",
          };
        }

        if (linkClaim && hasVerifiedLink) {
          const verifiedUrl = [...verifiedUrls][0];
          if (hasUnverifiedUrl) {
            return {
              reply: `Here is the verified WorksApp link:\n${verifiedUrl}`,
              error: "Replaced unverified URL in agent response",
            };
          }
          if (!replyUrls.length) return { reply: `${text}\n\n${verifiedUrl}` };
        }

        return { reply: text || "Done." };
      }

      messages.push(message);
      const toolResults = await Promise.all(
        message.tool_calls.map(async (toolCall) => {
          if (toolCall.type !== "function") {
            return {
              role: "tool" as const,
              tool_call_id: toolCall.id,
              content: "Unsupported tool call type.",
            };
          }

          let input: Record<string, unknown> = {};
          try {
            input = JSON.parse(toolCall.function.arguments || "{}") as Record<string, unknown>;
          } catch {
            input = {};
          }

          try {
            const result = await executeTool(userId, toolCall.function.name, input);
            try {
              const parsed = JSON.parse(result) as { ok?: boolean; error?: unknown };
              if (parsed.ok === true && !parsed.error) {
                successfulTools.add(toolCall.function.name);
                extractHttpUrls(result).forEach((url) => verifiedUrls.add(url));
              }
            } catch {
              // Non-JSON tool output is not considered a verified mutation.
            }
            return {
              role: "tool" as const,
              tool_call_id: toolCall.id,
              content: result,
            };
          } catch (toolErr) {
            const msg = formatAgentError(toolErr);
            console.error("[contractor-agent] tool error", toolCall.function.name, msg);
            return {
              role: "tool" as const,
              tool_call_id: toolCall.id,
              content: `Tool error: ${msg}`,
            };
          }
        }),
      );
      messages.push(...toolResults);
    }

    try {
      const summaryResp = await client.chat.completions.create({
        model,
        max_completion_tokens: 512,
        messages: [
          ...messages,
          {
            role: "user",
            content: "You ran out of steps before finishing. Briefly tell the contractor what you completed so far and what still needs to be done, so they know exactly where things stand.",
          },
        ],
      });
      const summaryText = summaryResp.choices[0]?.message.content?.trim() ?? "";
      if (summaryText) return { reply: summaryText, error: "Exceeded max tool loops" };
    } catch {
      // ignore summary error, fall through
    }

    return {
      reply: "I ran out of steps before finishing your request. Here's what I was working on. Please reply to continue and I'll pick up where I left off.",
      error: "Exceeded max tool loops",
    };
  } catch (e) {
    const detail = formatAgentError(e);
    console.error("[contractor-agent] error:", detail, e);
    return { reply: fallback, error: detail };
  }
}

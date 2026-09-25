import { isPremium, maxMonthlyMessages } from "@/lib/billing/access";
import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { executeTool } from "@/lib/agent/tool-handlers";
import { MINI_MODEL } from "@/lib/agent/model";
import { routeToModel } from "@/lib/agent/model-router";
import { buildSystemPrompt } from "@/lib/agent/types";
import { CONTRACTOR_TOOLS } from "@/lib/agent/tools";
import { resolveWorkspaceContext } from "@/lib/workspace/context";

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
  limitReached?: boolean;
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
  return new OpenAI({ apiKey: key, timeout: 40000, maxRetries: 1 });
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
  actorUserId: string,
  messageText: string,
  history: { role: "user" | "assistant"; content: string }[],
  workspaceUserId?: string,
): Promise<AgentRunResult> {
  const userId = actorUserId;
  const fallback =
    "Sorry, I'm having trouble processing that. Please try again in a moment.";

  const startedAt = Date.now();
  let inputTokens = 0;
  let outputTokens = 0;
  let usageModel = MINI_MODEL;
  let usageAdmitted = false;
  try {
    // WhatsApp callers omit this argument; resolve the same workspace as web chat.
    workspaceUserId ??= (await resolveWorkspaceContext(actorUserId)).workspaceUserId;
    const client = getClient();
    const { model, method: routeMethod } = routeToModel(messageText);
    usageModel = model;
    console.log("[contractor-agent] start", {
      model: model === MINI_MODEL ? "mini" : "chatgpt",
      routeMethod,
      userId: userId.slice(0, 8),
      historyLen: history.length,
    });

    const admin = createSupabaseAdminClient();
    const [{ data: memRow }, { data: profRow, error: profileError }, { data: monthRows, error: usageError }] = await Promise.all([
      admin.from("agent_memory").select("memory_text, updated_at").eq("user_id", userId).maybeSingle(),
      admin.from("profiles").select("zip_code, city, state, stripe_connect_account_id, stripe_connect_charges_enabled, subscription_plan, subscription_status, subscription_seats").eq("id", workspaceUserId).maybeSingle(),
      admin.from("api_usage").select("openai_input_tokens, openai_output_tokens, mini_input_tokens, mini_output_tokens, web_messages").eq("user_id", userId).gte("date", `${new Date().toISOString().slice(0, 7)}-01`),
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
    if (usageError || profileError || !profRow) throw new Error("Unable to verify agent usage allowance");
    const messageLimit = maxMonthlyMessages(profRow);
    const monthlyMessages = (monthRows ?? []).reduce((total, row) => total + (row.web_messages ?? 0), 0);
    if (!isPremium(profRow) && monthlyMessages >= messageLimit) return {
      reply: `You've reached your ${messageLimit} free messages for this month. Upgrade in WorksApp billing to continue.`, limitReached: true,
    };
    const monthlyTokens = (monthRows ?? []).reduce(
      (sum, r) => sum + (r.openai_input_tokens ?? 0) + (r.openai_output_tokens ?? 0) + (r.mini_input_tokens ?? 0) + (r.mini_output_tokens ?? 0),
      0,
    );
    if (monthlyTokens >= MONTHLY_TOKEN_CAP) {
      return {
        reply: "You've reached your monthly usage limit (6.5M tokens). Your limit resets on the 1st of next month.",
        limitReached: true,
        error: `Monthly token cap exceeded: ${monthlyTokens.toLocaleString()} / ${MONTHLY_TOKEN_CAP.toLocaleString()}`,
      };
    }

    usageAdmitted = true;
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemWithMemory },
      ...buildMessageParams(history, messageText),
    ];
    const tools = toOpenAITools();
    const maxLoops = 12;
    const successfulTools = new Set<string>();
    const verifiedUrls = new Set<string>();
    const explicitPriceBookConfirmation = /^(?:yes|yep|yeah|sure|confirm(?:ed)?|approved|use (?:it|that)|go ahead|proceed|do it|s[ií]|claro)\b/i
      .test(messageText.trim());
    let priceBookReviewed = false;
    let priceBookMatchFound = false;
    let forceToolCall = false;
    let correctionCount = 0;

    for (let i = 0; i < maxLoops; i++) {
      if (Date.now() - startedAt > 210000 || monthlyTokens + inputTokens + outputTokens >= MONTHLY_TOKEN_CAP) break;
      const response = await client.chat.completions.create({
        model,
        // GPT-5.6 supports Chat Completions function tools with reasoning disabled.
        reasoning_effort: "none",
        max_completion_tokens: 2048,
        tools,
        tool_choice: forceToolCall ? "required" : "auto",
        messages,
      });
      forceToolCall = false;
      const message = response.choices[0]?.message;

      inputTokens += response.usage?.prompt_tokens ?? 0;
      outputTokens += response.usage?.completion_tokens ?? 0;

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

        if (completedClaim && !hasInvoiceMutation) {
          return { reply: "I couldn't verify that the invoice action completed. Please check the invoice in WorksApp before trying again.", error: "Blocked unverified invoice completion claim" };
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
      const toolResults: ChatCompletionMessageParam[] = [];
      // Run calls in order: a price-book lookup must be evaluated before a
      // document-creation call in the same agent turn.
      for (const toolCall of message.tool_calls) {
          if (toolCall.type !== "function") {
            toolResults.push({
              role: "tool" as const,
              tool_call_id: toolCall.id,
              content: "Unsupported tool call type.",
            });
            continue;
          }

          let input: Record<string, unknown> = {};
          try {
            input = JSON.parse(toolCall.function.arguments || "{}") as Record<string, unknown>;
          } catch {
            input = {};
          }

          const isDocumentCreation = toolCall.function.name === "create_invoice_draft"
            || toolCall.function.name === "generate_proposal";
          if (isDocumentCreation && !explicitPriceBookConfirmation) {
            const reason = !priceBookReviewed
              ? "Price-book review required. Call list_price_book for the requested work before creating an invoice or proposal."
              : priceBookMatchFound
                ? "Price-book confirmation required. A saved matching item was found; show its unit, price, and calculation, then wait for the contractor to explicitly confirm before creating the document."
                : null;
            if (reason) {
              toolResults.push({
                role: "tool" as const,
                tool_call_id: toolCall.id,
                content: JSON.stringify({ ok: false, error: reason }),
              });
              continue;
            }
          }

          try {
            const result = await executeTool(actorUserId, toolCall.function.name, input, workspaceUserId);
            try {
              const parsed = JSON.parse(result) as { ok?: boolean; error?: unknown; count?: unknown };
              if (toolCall.function.name === "list_price_book" && parsed.ok === true) {
                priceBookReviewed = true;
                priceBookMatchFound = Number(parsed.count ?? 0) > 0;
              }
              if (parsed.ok === true && !parsed.error) {
                successfulTools.add(toolCall.function.name);
                extractHttpUrls(result).forEach((url) => verifiedUrls.add(url));
              }
            } catch {
              // Non-JSON tool output is not considered a verified mutation.
            }
            toolResults.push({
              role: "tool" as const,
              tool_call_id: toolCall.id,
              content: result,
            });
          } catch (toolErr) {
            const msg = formatAgentError(toolErr);
            console.error("[contractor-agent] tool error", toolCall.function.name, msg);
            toolResults.push({
              role: "tool" as const,
              tool_call_id: toolCall.id,
              content: `Tool error: ${msg}`,
            });
          }
      }
      messages.push(...toolResults);
    }

    try {
      if (Date.now() - startedAt > 210000 || monthlyTokens + inputTokens + outputTokens >= MONTHLY_TOKEN_CAP) throw new Error("Run budget exhausted");
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
      inputTokens += summaryResp.usage?.prompt_tokens ?? 0;
      outputTokens += summaryResp.usage?.completion_tokens ?? 0;
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
  } finally {
    if (usageAdmitted) {
      try {
        const mini = usageModel === MINI_MODEL;
        const { error } = await createSupabaseAdminClient().rpc("increment_usage", {
          p_user_id: actorUserId, p_date: new Date().toISOString().slice(0, 10),
          p_input: mini ? 0 : inputTokens, p_output: mini ? 0 : outputTokens,
          p_tavily: 0, p_web_messages: 1,
          p_mini_input: mini ? inputTokens : 0, p_mini_output: mini ? outputTokens : 0,
        });
        if (error) console.error("[contractor-agent] usage-write-failed", { code: error.code });
      } catch { console.error("[contractor-agent] usage-write-failed"); }
    }
    console.log("[contractor-agent] completed", { durationMs: Date.now() - startedAt, inputTokens, outputTokens });
  }
}

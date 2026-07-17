import OpenAI from "openai";

import { DEFAULT_OPENAI_MODEL, MINI_MODEL } from "./model";

const SIMPLE_PATTERNS: RegExp[] = [
  /^(lista|listar|mu\u00e9strame|ver|show|list|dame\s+mis?|muestra)\s+(mis?\s+)?(proyectos?|clientes?|facturas?|invoices?|precios?|propuestas?|horarios?|schedules?|eventos?|calendar)/i,
  /^(busca|encuentra|find|search)\s+(el\s+|la\s+|un\s+|una\s+)?(cliente|client|proyecto|project)\b/i,
  /\b(marcar|marca|mark|set|cambiar\s+estado|update\s+status)\b.{0,40}(pagad|paid|sent|enviado|void|open)/i,
  /^(guardar|save|agregar|a\u00f1adir|add)\s+(cliente|client|al\s+directorio)/i,
  /\b(agregar|a\u00f1adir|add).{0,20}(price\s*book|libro\s+de\s+precios)/i,
  /^(qu\u00e9\s+tengo|what.*schedule|mis?\s+event|ver\s+calendario|show.*calendar|my\s+schedule)/i,
  /^(hola|hi|hello|hey|buenos?\s+(d\u00edas?|tardes?|noches?))[.!?]?\s*$/i,
];

const COMPLEX_PATTERNS: RegExp[] = [
  /\b(propuesta|proposal|genera\s+propuesta|generate\s+proposal|crea\s+(una\s+)?propuesta)\b/i,
  /\b(busca[r]?\s+(precio|en\s+internet|en\s+l\u00ednea)|search.*(price|cost|rate)|cu\u00e1nto\s+cuesta|how\s+much\s+(does|is|cost))\b/i,
  /\b(crear?\s+(un\s+)?proyecto|create\s+(a\s+)?project|nuevo\s+proyecto|new\s+project)\b/i,
  /\b(crear?\s+(una\s+)?factura|create\s+(an?\s+)?invoice|genera\s+(una\s+)?factura|hacer\s+(una\s+)?factura)\b/i,
  /\b(eliminar\s+proyecto|delete\s+project|borrar\s+proyecto|remove\s+project)\b/i,
  /\b(crear?\s+(un\s+)?(horario|calendario|evento\s+recurrente)|create\s+(a\s+)?(calendar|schedule|recurring))\b/i,
  /\b(y\s+tambi\u00e9n|and\s+also|y\s+adem\u00e1s|and\s+then)\b/i,
];

export async function routeToModel(
  userMessage: string,
  client: OpenAI,
): Promise<{ model: string; method: "heuristic-complex" | "heuristic-simple" | "classifier" | "length" | "fallback" }> {
  const msg = userMessage.trim();

  if (msg.length > 300) {
    return { model: DEFAULT_OPENAI_MODEL, method: "length" };
  }

  if (COMPLEX_PATTERNS.some((p) => p.test(msg))) {
    return { model: DEFAULT_OPENAI_MODEL, method: "heuristic-complex" };
  }

  if (SIMPLE_PATTERNS.some((p) => p.test(msg))) {
    return { model: MINI_MODEL, method: "heuristic-simple" };
  }

  try {
    const classification = await client.chat.completions.create({
      model: MINI_MODEL,
      max_completion_tokens: 5,
      messages: [
        {
          role: "user",
          content: `You are classifying a message sent to a contractor business assistant.
Reply with exactly one word: "simple" or "complex".

simple = listing data, viewing projects/clients/invoices, saving a client, changing invoice status
complex = creating projects, creating/generating invoices, generating proposals, searching the web, deleting projects, scheduling recurring events, multi-step tasks

Message: "${msg.slice(0, 200)}"`,
        },
      ],
    });
    const text = classification.choices[0]?.message.content?.trim().toLowerCase() ?? "";
    return { model: text === "simple" ? MINI_MODEL : DEFAULT_OPENAI_MODEL, method: "classifier" };
  } catch (err) {
    console.warn("[model-router] classifier failed, defaulting to ChatGPT:", err instanceof Error ? err.message : err);
    return { model: DEFAULT_OPENAI_MODEL, method: "fallback" };
  }
}

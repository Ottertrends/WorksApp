/**
 * Default balanced model for agent work and generated documents.
 * Override in Vercel with OPENAI_MODEL if needed.
 */
export const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-5.6-terra";

/**
 * Cost-efficient model used for simple CRUD turns.
 */
export const MINI_MODEL = process.env.OPENAI_MINI_MODEL?.trim() || "gpt-5.6-luna";

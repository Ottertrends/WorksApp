/**
 * Default ChatGPT model when `OPENAI_MODEL` is not set.
 * Override in Vercel if needed.
 */
export const DEFAULT_OPENAI_MODEL = "gpt-5-chat-latest";

/**
 * Smaller OpenAI model used for simple CRUD turns and classification.
 */
export const MINI_MODEL = "gpt-5-mini";

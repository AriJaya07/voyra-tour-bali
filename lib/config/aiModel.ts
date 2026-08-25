/**
 * Single source of truth for the Groq chat-completion model.
 *
 * Change the model everywhere by editing GROQ_MODEL in .env — no code edit needed.
 * Falls back to openai/gpt-oss-120b if unset.
 */
export const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

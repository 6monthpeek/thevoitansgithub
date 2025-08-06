/**
 * OpenRouter minimal client for Discord bot
 * - Reads system prompt from ./prompt.md (optional)
 * - Uses OPENROUTER_API_KEY from process.env (set this in Replit Secrets)
 * - Model can be overridden via process.env.OPENROUTER_MODEL
 * - Base URL defaults to https://openrouter.ai/api/v1
 *
 * Safe defaults: short timeouts, content length caps, error handling.
 */

const DEFAULT_BASE = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "openrouter/auto"; // you can set e.g. "meta-llama/llama-3.1-70b-instruct:free"

async function readPrompt() {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const p = path.join(__dirname, "prompt.md");
    const content = await fs.readFile(p, "utf8").catch(() => "");
    return content || "";
  } catch {
    return "";
  }
}

/**
 * callOpenRouter
 * @param {Array<{role:"system"|"user"|"assistant", content:string}>} messages
 * @param {object} opts
 * @returns {Promise<string>} assistant text
 */
async function callOpenRouter(messages, opts = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY in environment");
  }
  const baseURL = DEFAULT_BASE;
  const model = String(opts.model || DEFAULT_MODEL);

  const abort = new AbortController();
  const t = setTimeout(() => abort.abort(), Math.min(20000, Number(process.env.OPENROUTER_TIMEOUT_MS) || 20000)); // 20s hard timeout

  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // These are recommended headers per OpenRouter spec (optional):
        "HTTP-Referer": process.env.SITE_URL || "https://thevoitansgithub.vercel.app",
        "X-Title": "VOITANS Discord Bot",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0.7,
        top_p: opts.top_p ?? 0.9,
        max_tokens: opts.max_tokens ?? 400,
      }),
      signal: abort.signal,
    });

    clearTimeout(t);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`OpenRouter HTTP ${res.status} ${errText}`);
    }

    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content?.trim?.();
    if (!text) throw new Error("OpenRouter returned empty response");
    return text;
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

/**
 * buildMessagesForUser
 * - Reads system prompt and builds messages array with user content
 * - Applies a length cap to user content to avoid excessive tokens
 */
async function buildMessagesForUser(userText) {
  const SYSTEM = await readPrompt();
  const capped = String(userText || "").slice(0, 3000); // cap user content
  const messages = [];

  if (SYSTEM && SYSTEM.trim().length > 0) {
    messages.push({ role: "system", content: SYSTEM });
  } else {
    messages.push({
      role: "system",
      content:
        "You are VOITANS guild assistant. Be concise, helpful, and respectful. Answer in Turkish unless the user clearly writes in another language.",
    });
  }

  messages.push({ role: "user", content: capped });
  return messages;
}

module.exports = {
  callOpenRouter,
  buildMessagesForUser,
};

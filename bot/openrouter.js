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
/**
 * Rotating API keys on 429:
 * - Primary: OPENROUTER_API_KEY
 * - Secondary: OPENROUTER_API_KEY1, OPENROUTER_API_KEY2, ...
 * When 429 received, we retry once per additional key with small backoff.
 * NOTE: Prefer official pooling (Integrations) for production. This is a best-effort fallback.
 */
function listApiKeys() {
  const keys = [];
  const primary = process.env.OPENROUTER_API_KEY ? String(process.env.OPENROUTER_API_KEY).trim() : "";
  if (primary) keys.push(primary);
  let i = 1;
  while (true) {
    const k = process.env[`OPENROUTER_API_KEY${i}`];
    if (!k) break;
    const v = String(k).trim();
    if (v) keys.push(v);
    i += 1;
    if (i > 20) break; // hard cap
  }
  return keys;
}

async function callOpenRouter(messages, opts = {}) {
  const baseURL = DEFAULT_BASE;
  const model = String(opts.model || DEFAULT_MODEL);

  const keys = listApiKeys();
  if (!keys.length) throw new Error("Missing OPENROUTER_API_KEY (and OPENROUTER_API_KEY1..N) in environment");

  const payload = {
    model,
    messages,
    temperature: opts.temperature ?? 0.7,
    top_p: opts.top_p ?? 0.9,
    max_tokens: opts.max_tokens ?? 400,
  };

  let lastErr;
  // Progressive backoff sequence specifically for 429s between key attempts
  const backoffsMs = [500, 1000, 2000, 4000, 8000];

  for (let idx = 0; idx < keys.length; idx++) {
    const apiKey = keys[idx];

    // 1) Try with preferred model; on 429, we can also try a fallback model once per key
    const modelsToTry = [String(opts.model || DEFAULT_MODEL), "openrouter/auto"];

    for (let mi = 0; mi < modelsToTry.length; mi++) {
      const modelTry = modelsToTry[mi];

      const abort = new AbortController();
      const t = setTimeout(() => abort.abort(), Math.min(20000, Number(process.env.OPENROUTER_TIMEOUT_MS) || 20000));
      try {
        const res = await fetch(`${baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.SITE_URL || "https://thevoitansgithub.vercel.app",
            "X-Title": "VOITANS Discord Bot",
          },
          body: JSON.stringify({ ...payload, model: modelTry }),
          signal: abort.signal,
        });

        clearTimeout(t);

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          if (res.status === 429) {
            console.error("[openrouter][http-error][rate-limit]", { keyIndex: idx, model: modelTry, status: 429, body: errText?.slice?.(0, 500) || errText });
            // On 429 with first model, try fallback model (if not already)
            if (mi === 0) {
              // immediate next loop to try fallback model
              continue;
            }
            // After trying both models for this key, backoff then go to next key
            const wait = backoffsMs[Math.min(idx, backoffsMs.length - 1)];
            await new Promise(r => setTimeout(r, wait));
            break; // break models loop -> next key
          }
          console.error("[openrouter][http-error]", { keyIndex: idx, model: modelTry, status: res.status, body: errText?.slice?.(0, 500) || errText });
          throw new Error(`OpenRouter HTTP ${res.status} ${errText}`);
        }

        const json = await res.json();
        const text = json?.choices?.[0]?.message?.content?.trim?.();

        if (!text) {
          console.error("[openrouter][empty-response]", {
            model: modelTry,
            usage: json?.usage,
            choices0_keys: json?.choices ? Object.keys(json.choices[0] || {}) : [],
          });
          throw new Error("OpenRouter returned empty response");
        }

        return text;
      } catch (e) {
        clearTimeout(t);
        lastErr = e;
        console.error("[openrouter][fetch-error]", { keyIndex: idx, model: modelTry, err: e?.message || e });
        // If network/timeout, try fallback model (if any left), else rotate key after small wait
        if (mi === modelsToTry.length - 1) {
          await new Promise(r => setTimeout(r, 300));
        } else {
          // try next model immediately
          continue;
        }
      }
    }
    // proceed to next key
    continue;
  }

  // All keys failed
  throw lastErr || new Error("All OpenRouter keys failed");
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
